"""
Socket.IO 서버 - WebRTC 시그널링 서버
실시간 통신과 WebRTC 연결을 관리합니다
"""

import socketio
from typing import Dict, Set
import json

# Socket.IO 서버 생성
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # 프로덕션에서는 특정 도메인으로 제한
    cors_credentials=True,
    logger=True,
    engineio_logger=True
)

# ASGI 앱 생성
socket_app = socketio.ASGIApp(sio)

# 연결된 사용자 관리
connected_users: Dict[str, Dict] = {}  # session_id -> user_info
room_participants: Dict[str, Set[str]] = {}  # room_id -> set of session_ids

# 방 참가자 수 조회 함수 (외부에서 import 가능)
def get_room_participant_count(room_id: str) -> int:
    """특정 방의 현재 참가자 수 반환"""
    return len(room_participants.get(room_id, set()))

def get_all_room_participants() -> Dict[str, int]:
    """모든 방의 참가자 수 반환"""
    return {room_id: len(participants) for room_id, participants in room_participants.items()}

@sio.event
async def connect(sid, environ, auth=None):
    """클라이언트 연결"""
    print(f'[OK] 클라이언트 연결: {sid}')
    connected_users[sid] = {
        'sid': sid,
        'rooms': set()
    }
    return True

@sio.event
async def disconnect(sid):
    """클라이언트 연결 해제 - 모든 방에서 완전히 제거"""
    print(f'[DISCONNECT] 클라이언트 연결 해제: {sid}')

    # 모든 방에서 사용자 제거
    if sid in connected_users:
        rooms_to_leave = list(connected_users[sid].get('rooms', set()))
        print(f'   사용자가 속한 방: {rooms_to_leave}')

        for room_id in rooms_to_leave:
            await leave_room_internal(sid, room_id)

        del connected_users[sid]
        print(f'   connected_users에서 제거 완료')

    # room_participants에서도 완전히 제거 (안전장치)
    removed_from_rooms = []
    for room_id, participants in list(room_participants.items()):
        if sid in participants:
            participants.discard(sid)
            removed_from_rooms.append(room_id)
            print(f'[WARNING] disconnect에서 강제 제거: {sid} from room {room_id}')

            # 방이 비면 삭제
            if not participants:
                del room_participants[room_id]
                print(f'[DELETE] 빈 방 삭제: {room_id}')

    if removed_from_rooms:
        print(f'   총 {len(removed_from_rooms)}개 방에서 강제 제거됨')

    print(f'[STATS] 현재 활성 방: {list(room_participants.keys())}')

@sio.event
async def join_room(sid, data):
    """방 참가"""
    room_id = data.get('roomId')
    user_info = data.get('userInfo', {})

    print(f'[JOIN] 방 참가 요청: {sid} -> Room {room_id} (사용자: {user_info.get("username", "Unknown")})')

    # Socket.IO 룸에 참가
    await sio.enter_room(sid, room_id)

    # 사용자 정보 업데이트
    if sid in connected_users:
        connected_users[sid]['rooms'].add(room_id)
        connected_users[sid]['userInfo'] = user_info

    # 방 참가자 목록 업데이트
    if room_id not in room_participants:
        room_participants[room_id] = set()
    room_participants[room_id].add(sid)

    participant_count = len(room_participants[room_id])
    print(f'[STATS] 현재 방 {room_id} 참가자: {participant_count}명')
    print(f'   참가자 목록: {list(room_participants[room_id])}')

    # 다른 참가자들에게 알림
    await sio.emit('user_joined', {
        'userId': sid,
        'userInfo': user_info
    }, room=room_id, skip_sid=sid)

    # 현재 참가자 목록 전송
    current_participants = []
    for participant_sid in room_participants.get(room_id, set()):
        if participant_sid != sid and participant_sid in connected_users:
            current_participants.append({
                'userId': participant_sid,
                'userInfo': connected_users[participant_sid].get('userInfo', {})
            })

    print(f'   기존 참가자 {len(current_participants)}명 정보 전송')
    await sio.emit('current_participants', current_participants, to=sid)

@sio.event
async def leave_room(sid, data):
    """방 나가기"""
    room_id = data.get('roomId')
    await leave_room_internal(sid, room_id)

async def leave_room_internal(sid, room_id):
    """방 나가기 내부 처리"""
    print(f'[LEAVE] 방 나가기 요청: {sid} <- Room {room_id}')

    # Socket.IO 룸에서 나가기
    await sio.leave_room(sid, room_id)

    # 사용자 정보 업데이트
    if sid in connected_users:
        connected_users[sid]['rooms'].discard(room_id)
        print(f'   connected_users 업데이트 완료')

    # 방 참가자 목록 업데이트
    if room_id in room_participants:
        room_participants[room_id].discard(sid)
        remaining_count = len(room_participants[room_id])
        print(f'[STATS] 방 {room_id} 남은 참가자: {remaining_count}명')

        # 방에 아무도 없으면 방 정보 삭제 및 DB 업데이트
        if not room_participants[room_id]:
            del room_participants[room_id]
            print(f'[DELETE] 빈 방 {room_id} 메모리에서 삭제')

            # DB에서 방 상태를 inactive로 변경
            try:
                import sqlite3
                conn = sqlite3.connect('videonet.db')
                conn.execute(
                    "UPDATE meetings SET status = 'inactive' WHERE id = ?",
                    (int(room_id),)
                )
                conn.commit()
                conn.close()
                print(f'[OK] 방 {room_id} DB에서 비활성화 완료')

                # 방 목록 업데이트 알림 발송
                await notify_room_list_update()
            except Exception as e:
                print(f'[ERROR] 방 {room_id} 비활성화 실패: {e}')

    # 다른 참가자들에게 알림
    await sio.emit('user_left', {
        'userId': sid
    }, room=room_id)

# ===== WebRTC 시그널링 =====

@sio.event
async def webrtc_offer(sid, data):
    """WebRTC Offer 전달"""
    target_sid = data.get('to')
    offer = data.get('offer')
    
    print(f'[WEBRTC] Offer: {sid} -> {target_sid}')
    
    if target_sid in connected_users:
        await sio.emit('webrtc_offer', {
            'from': sid,
            'offer': offer
        }, to=target_sid)

@sio.event
async def webrtc_answer(sid, data):
    """WebRTC Answer 전달"""
    target_sid = data.get('to')
    answer = data.get('answer')
    
    print(f'[WEBRTC] Answer: {sid} -> {target_sid}')
    
    if target_sid in connected_users:
        await sio.emit('webrtc_answer', {
            'from': sid,
            'answer': answer
        }, to=target_sid)

@sio.event
async def webrtc_ice_candidate(sid, data):
    """WebRTC ICE Candidate 전달"""
    target_sid = data.get('to')
    candidate = data.get('candidate')
    
    print(f'[ICE] Candidate: {sid} -> {target_sid}')
    
    if target_sid in connected_users:
        await sio.emit('webrtc_ice_candidate', {
            'from': sid,
            'candidate': candidate
        }, to=target_sid)

# ===== 미디어 컨트롤 =====

@sio.event
async def media_toggle(sid, data):
    """미디어 토글 (음소거/비디오 끄기)"""
    room_id = data.get('roomId')
    media_type = data.get('type')  # 'audio' or 'video'
    enabled = data.get('enabled')
    
    print(f'[MEDIA] 미디어 토글: {sid} - {media_type} = {enabled}')
    
    # 같은 방의 다른 참가자들에게 알림
    await sio.emit('media_toggled', {
        'userId': sid,
        'type': media_type,
        'enabled': enabled
    }, room=room_id, skip_sid=sid)

# ===== 채팅 =====

@sio.event
async def chat_message(sid, data):
    """채팅 메시지 전송"""
    room_id = data.get('roomId')
    message = data.get('message')
    
    print(f'[CHAT] 채팅: {sid} in Room {room_id}')
    
    # 사용자 정보 가져오기
    user_info = connected_users.get(sid, {}).get('userInfo', {})
    
    # 같은 방의 모든 참가자에게 메시지 전송
    await sio.emit('chat_message', {
        'userId': sid,
        'userInfo': user_info,
        'message': message,
        'timestamp': data.get('timestamp')
    }, room=room_id)

# ===== 화면 공유 =====

@sio.event
async def screen_share_started(sid, data):
    """화면 공유 시작"""
    room_id = data.get('roomId')
    
    print(f'[SCREEN] 화면 공유 시작: {sid} in Room {room_id}')
    
    await sio.emit('screen_share_started', {
        'userId': sid
    }, room=room_id, skip_sid=sid)

@sio.event
async def screen_share_stopped(sid, data):
    """화면 공유 중지"""
    room_id = data.get('roomId')
    
    print(f'[SCREEN] 화면 공유 중지: {sid} in Room {room_id}')
    
    await sio.emit('screen_share_stopped', {
        'userId': sid
    }, room=room_id, skip_sid=sid)

# ===== 파일 전송 (P2P) =====

@sio.event
async def file_transfer_start(sid, data):
    """파일 전송 시작"""
    room_id = data.get('roomId')
    print(f'[FILE] 파일 전송 시작: {data.get("fileName")} ({data.get("fileSize")} bytes) in Room {room_id}')

    # 같은 방의 다른 사용자들에게 전달
    await sio.emit('file_transfer_start', data, room=room_id, skip_sid=sid)

@sio.event
async def file_chunk(sid, data):
    """파일 청크 전송"""
    room_id = data.get('roomId')

    # 같은 방의 다른 사용자들에게 전달
    await sio.emit('file_chunk', data, room=room_id, skip_sid=sid)

@sio.event
async def file_transfer_end(sid, data):
    """파일 전송 완료"""
    room_id = data.get('roomId')
    print(f'[FILE] 파일 전송 완료 in Room {room_id}')

    # 같은 방의 다른 사용자들에게 전달
    await sio.emit('file_transfer_end', data, room=room_id, skip_sid=sid)

# ===== 방 목록 실시간 업데이트 =====

async def notify_room_list_update():
    """모든 클라이언트에게 방 목록이 업데이트되었음을 알림"""
    print('[NOTIFY] 방 목록 업데이트 알림 전송')
    await sio.emit('room_list_updated', {
        'timestamp': str(id({}))  # 간단한 타임스탬프
    })

# 디버깅용 이벤트
@sio.event
async def ping(sid):
    """연결 테스트용 ping"""
    await sio.emit('pong', to=sid)
    return 'pong'