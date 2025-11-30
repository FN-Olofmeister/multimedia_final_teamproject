"""
VideoNet Pro - 백엔드 서버
간단하고 강력한 화상회의 서버
"""

import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
import sqlite3
import json
import secrets
import string
from contextlib import contextmanager
import uvicorn
import socketio
from socketio_server import sio, socket_app, get_all_room_participants, notify_room_list_update
from file_transfer import router as file_router
from video_analysis import router as video_router
from image_compression import router as compression_router

# ===== 설정 =====
SECRET_KEY = os.getenv("SECRET_KEY", "videonet-secret-key-2024")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24시간
MASTER_INVITE_CODE = os.getenv("MASTER_INVITE_CODE", "MASTER2024")
DATABASE_NAME = os.getenv("DATABASE_NAME", "videonet.db")

# ===== FastAPI 앱 생성 =====
app = FastAPI(
    title="VideoNet Pro API",
    description="화상회의 플랫폼 API",
    version="2.0.0"
)

# ✅ CORS 미들웨어 (기존)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 파일 전송 라우터 추가
app.include_router(file_router)

# 동영상 분석 라우터 추가
app.include_router(video_router)

# 이미지 압축 및 품질 평가 라우터 추가
app.include_router(compression_router)

# ===== 보안 설정 =====
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ===== 데이터 모델 =====
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    inviteCode: str  # camelCase로 변경 (프론트엔드와 일치)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class RoomCreate(BaseModel):
    name: str
    isPrivate: Optional[bool] = False
    maxParticipants: Optional[int] = 100

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    password: Optional[str] = None

class InviteCodeCreate(BaseModel):
    max_uses: int = 1
    expires_days: int = 7

# ===== 데이터베이스 =====
@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_database():
    """데이터베이스 초기화"""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                personal_code TEXT UNIQUE NOT NULL,
                invite_code_used TEXT,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS invite_codes (
                code TEXT PRIMARY KEY,
                creator_id INTEGER,
                max_uses INTEGER DEFAULT 1,
                current_uses INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users (id)
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                host_id INTEGER NOT NULL,
                password TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES users (id)
            )
        """)

# ===== 유틸리티 함수 =====
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_code(length: int = 8) -> str:
    """랜덤 코드 생성"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def generate_personal_code() -> str:
    """개인 코드 생성"""
    return f"P-{generate_code(6)}"

def generate_room_code() -> str:
    """회의실 코드 생성"""
    return f"{generate_code(3)}-{generate_code(3)}-{generate_code(3)}"

# ===== API 엔드포인트 =====

@app.on_event("startup")
async def startup():
    """서버 시작시 실행"""
    init_database()
    print("[OK] VideoNet Pro 서버 시작!")

@app.get("/")
async def root():
    """홈페이지"""
    return {
        "name": "VideoNet Pro",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "화상회의",
            "화면공유", 
            "채팅",
            "초대코드"
        ]
    }

@app.post("/api/auth/register")
async def register(user: UserRegister):
    """회원가입"""
    with get_db() as conn:
        # 초대 코드 확인 (camelCase 필드 사용)
        if user.inviteCode != MASTER_INVITE_CODE:
            cursor = conn.execute(
                "SELECT * FROM invite_codes WHERE code = ? AND current_uses < max_uses",
                (user.inviteCode,)
            )
            invite = cursor.fetchone()
            if not invite:
                raise HTTPException(status_code=400, detail="유효하지 않은 초대 코드")
            
            # 초대 코드 사용 횟수 증가
            conn.execute(
                "UPDATE invite_codes SET current_uses = current_uses + 1 WHERE code = ?",
                (user.inviteCode,)
            )
        
        # 중복 확인
        cursor = conn.execute(
            "SELECT * FROM users WHERE email = ? OR username = ?",
            (user.email, user.username)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="이미 존재하는 이메일 또는 사용자명")
        
        # 사용자 생성
        personal_code = generate_personal_code()
        is_admin = 1 if user.inviteCode == MASTER_INVITE_CODE else 0
        
        cursor = conn.execute("""
            INSERT INTO users (email, username, password, full_name, personal_code, invite_code_used, is_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user.email,
            user.username,
            hash_password(user.password),
            user.full_name,
            personal_code,
            user.inviteCode,
            is_admin
        ))
        
        user_id = cursor.lastrowid
        
        # 토큰 생성
        access_token = create_access_token({
            "user_id": user_id,
            "username": user.username,
            "is_admin": bool(is_admin)
        })
        
        # 프론트엔드가 기대하는 형식으로 응답
        return {
            "access_token": access_token,
            "user": {
                "id": str(user_id),
                "username": user.username,
                "email": user.email,
                "personalCode": personal_code,  # camelCase
                "isOnline": True,
                "createdAt": datetime.utcnow().isoformat()
            }
        }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    """로그인"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (user.username, user.username)
        )
        db_user = cursor.fetchone()
        
        if not db_user or not verify_password(user.password, db_user['password']):
            raise HTTPException(status_code=401, detail="잘못된 인증 정보")
        
        # 토큰 생성
        access_token = create_access_token({
            "user_id": db_user['id'],
            "username": db_user['username'],
            "is_admin": bool(db_user['is_admin'])
        })
        
        # 프론트엔드가 기대하는 형식으로 응답
        return {
            "access_token": access_token,
            "user": {
                "id": str(db_user['id']),
                "username": db_user['username'],
                "email": db_user['email'],
                "personalCode": db_user['personal_code'],  # camelCase로 변경
                "isOnline": True,
                "createdAt": db_user['created_at'] if db_user['created_at'] else datetime.utcnow().isoformat()
            }
        }

@app.get("/api/auth/me")
async def get_me(current_user = Depends(verify_token)):
    """현재 사용자 정보"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없음")
        
        return {
            "id": str(user['id']),
            "username": user['username'],
            "email": user['email'],
            "personalCode": user['personal_code'],  # camelCase
            "isOnline": True,
            "createdAt": user['created_at'] if user['created_at'] else datetime.utcnow().isoformat()
        }

@app.post("/api/invites/generate")
async def generate_invite(
    invite: InviteCodeCreate,
    current_user = Depends(verify_token)
):
    """초대 코드 생성"""
    with get_db() as conn:
        code = generate_code()
        expires_at = datetime.utcnow() + timedelta(days=invite.expires_days)
        
        conn.execute("""
            INSERT INTO invite_codes (code, creator_id, max_uses, expires_at)
            VALUES (?, ?, ?, ?)
        """, (code, current_user['user_id'], invite.max_uses, expires_at))
        
        return {
            "code": code,
            "max_uses": invite.max_uses,
            "expires_at": expires_at.isoformat()
        }

@app.get("/api/invites/my-codes")
async def get_my_invites(current_user = Depends(verify_token)):
    """내 초대 코드 목록"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM invite_codes WHERE creator_id = ? ORDER BY created_at DESC",
            (current_user['user_id'],)
        )
        codes = cursor.fetchall()
        
        return {
            "codes": [
                {
                    "code": code['code'],
                    "max_uses": code['max_uses'],
                    "current_uses": code['current_uses'],
                    "created_at": code['created_at'],
                    "expires_at": code['expires_at']
                }
                for code in codes
            ]
        }

@app.post("/api/meetings/create")
async def create_meeting(
    meeting: MeetingCreate,
    current_user = Depends(verify_token)
):
    """회의 생성"""
    with get_db() as conn:
        room_code = generate_room_code()
        
        cursor = conn.execute("""
            INSERT INTO meetings (room_code, title, description, host_id, password)
            VALUES (?, ?, ?, ?, ?)
        """, (
            room_code,
            meeting.title,
            meeting.description,
            current_user['user_id'],
            meeting.password
        ))
        
        meeting_id = cursor.lastrowid
        
        return {
            "id": meeting_id,
            "room_code": room_code,
            "title": meeting.title,
            "join_url": f"/meeting/{room_code}"
        }

# ===== Rooms API (프론트엔드 호환) =====
@app.get("/api/rooms")
async def get_rooms(current_user = Depends(verify_token)):
    """모든 활성 방 목록"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT m.*, u.username as host_name
            FROM meetings m
            JOIN users u ON m.host_id = u.id
            WHERE m.status = 'active'
        """)
        meetings = cursor.fetchall()

        # Socket.IO로부터 실시간 참가자 수 가져오기
        room_participant_counts = get_all_room_participants()

        rooms = []
        for meeting in meetings:
            room_id = str(meeting['id'])
            participant_count = room_participant_counts.get(room_id, 0)

            rooms.append({
                "id": room_id,
                "name": meeting['title'],
                "hostId": str(meeting['host_id']),
                "participants": [],
                "participantCount": participant_count,  # 실시간 참가자 수 추가
                "isPrivate": bool(meeting['password']),
                "maxParticipants": 100,
                "createdAt": meeting['created_at']
            })

        return rooms

@app.post("/api/rooms")
async def create_room(room: RoomCreate, current_user = Depends(verify_token)):
    """새 방 만들기"""
    with get_db() as conn:
        room_code = generate_code(8)
        
        cursor = conn.execute("""
            INSERT INTO meetings (room_code, title, description, host_id, password, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        """, (
            room_code,
            room.name,
            "",
            current_user['user_id'],
            None
        ))
        
        room_id = cursor.lastrowid

        # Socket.IO로 방 리스트 업데이트 알림
        await notify_room_list_update()

        return {
            "id": str(room_id),
            "name": room.name,
            "hostId": str(current_user['user_id']),
            "participants": [],
            "isPrivate": room.isPrivate,
            "maxParticipants": room.maxParticipants,
            "createdAt": datetime.utcnow().isoformat()
        }

@app.post("/api/rooms/{room_id}/join")
async def join_room(room_id: str, current_user = Depends(verify_token)):
    """방 참가"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM meetings WHERE id = ?",
            (int(room_id),)
        )
        meeting = cursor.fetchone()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
        
        return {
            "id": str(meeting['id']),
            "name": meeting['title'],
            "hostId": str(meeting['host_id']),
            "participants": [],
            "isPrivate": bool(meeting['password']),
            "maxParticipants": 100,
            "createdAt": meeting['created_at']
        }

@app.get("/api/meetings/{room_code}")
async def get_meeting(room_code: str):
    """회의 정보 조회"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT m.*, u.username as host_name FROM meetings m JOIN users u ON m.host_id = u.id WHERE m.room_code = ?",
            (room_code,)
        )
        meeting = cursor.fetchone()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="회의를 찾을 수 없음")
        
        return {
            "id": meeting['id'],
            "room_code": meeting['room_code'],
            "title": meeting['title'],
            "description": meeting['description'],
            "host_name": meeting['host_name'],
            "status": meeting['status'],
            "has_password": bool(meeting['password'])
        }

@app.post("/api/meetings/{room_code}/join")
async def join_meeting(
    room_code: str,
    password: Optional[str] = None,
    current_user = Depends(verify_token)
):
    """회의 참가"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM meetings WHERE room_code = ?",
            (room_code,)
        )
        meeting = cursor.fetchone()
        
        if not meeting:
            raise HTTPException(status_code=404, detail="회의를 찾을 수 없음")
        
        if meeting['password'] and meeting['password'] != password:
            raise HTTPException(status_code=401, detail="잘못된 비밀번호")
        
        return {
            "message": "회의 참가 성공",
            "meeting_id": meeting['id'],
            "room_code": room_code,
            "is_host": meeting['host_id'] == current_user['user_id']
        }

@app.get("/api/meetings/user/list")
async def get_user_meetings(current_user = Depends(verify_token)):
    """내 회의 목록"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM meetings WHERE host_id = ? ORDER BY created_at DESC LIMIT 10",
            (current_user['user_id'],)
        )
        meetings = cursor.fetchall()
        
        return {
            "meetings": [
                {
                    "id": m['id'],
                    "room_code": m['room_code'],
                    "title": m['title'],
                    "status": m['status'],
                    "created_at": m['created_at']
                }
                for m in meetings
            ]
        }

# ===== ASGI 레벨 CORS 미들웨어 =====
# ✅ Socket.IO를 완전히 우회할 수 없는 가장 저수준의 CORS 처리
class ASGICORSMiddleware:
    """ASGI 레벨에서 CORS 헤더를 처리하는 미들웨어"""
    
    CORS_HEADERS = [
        (b'access-control-allow-origin', b'*'),
        (b'access-control-allow-methods', b'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'),
        (b'access-control-allow-headers', b'Content-Type,Authorization,Accept,Origin'),
        (b'access-control-allow-credentials', b'true'),
        (b'access-control-max-age', b'3600'),
        (b'vary', b'Origin'),
    ]
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # HTTP가 아니면 그냥 통과
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        
        # 모든 HTTP 요청에 CORS 헤더 추가
        path = scope.get('path', '')
        method = scope.get('method', '')
        
        # OPTIONS 요청 즉시 처리 (preflight request)
        if method == 'OPTIONS':
            print(f'[CORS] OPTIONS 요청: {path}')
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': self.CORS_HEADERS,
            })
            await send({
                'type': 'http.response.body',
                'body': b'',
            })
            return
        
        # 일반 요청 처리
        async def send_with_cors(message):
            if message['type'] == 'http.response.start':
                headers = list(message.get('headers', []))
                # 기존 CORS 헤더 제거 (중복 방지)
                headers = [h for h in headers if not h[0].lower().startswith(b'access-control')]
                # CORS 헤더 추가
                for header in self.CORS_HEADERS:
                    if header not in headers:
                        headers.append(header)
                message['headers'] = headers
            await send(message)
        
        await self.app(scope, receive, send_with_cors)

# ===== Socket.IO와 FastAPI 통합 =====
combined_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="/socket.io")

# ✅ ASGI 미들웨어로 감싸기 (가장 저수준 - Socket.IO 완전 우회 불가)
combined_app = ASGICORSMiddleware(combined_app)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "7701"))
    print("=" * 60)
    print(f"🚀 VideoNet Pro Backend starting on port {port}")
    print(f"📝 20205146 한림대학교 콘텐츠IT 김재형 - AI+X 프로젝트")
    print("=" * 60)
    print(f"📍 REST API: http://localhost:{port}")
    print(f"📍 API Docs: http://localhost:{port}/docs")
    print(f"🔌 Socket.IO: ws://localhost:{port}/socket.io")
    print("=" * 60)
    uvicorn.run(combined_app, host="0.0.0.0", port=port)