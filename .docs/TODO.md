# VideoNet Pro - 작업 현황

**마지막 업데이트**: 2025-11-25 (오후 10시 30분)
**현재 상태**: ✅ 모든 P0 긴급 버그 수정 완료!
**다음 작업자**: P1 중요 작업 진행 가능

> 이 문서는 프로젝트의 모든 작업 현황을 관리합니다.
> - 완료된 작업 이력 (✅)
> - 긴급 수정 필요한 버그 (🔴)
> - 계획된 작업 (📋)

---

## 🚀 시작하기 전 필독

### 서버 실행 방법 (중요!)

```bash
# 터미널 1 - 백엔드
cd backend

# 방법 1: 간단 실행 (프로덕션/테스트용)
python run.py

# 방법 2: 개발용 (자동 재시작)
uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload

# 터미널 2 - 프론트엔드
cd frontend
npm run dev
```

**⚠️ 주의사항:**
- **프로덕션/간단 실행**: `python run.py`
- **개발 시 자동 재시작**: `uvicorn main:combined_app --reload`
- ❌ `uvicorn main:app` 사용 시 Socket.IO 403 에러 발생

### 필수 확인 문서
1. **`.docs/CLAUDE.md`** - 프로젝트 아키텍처, 알려진 이슈
2. **`README.md`** - 프로젝트 개요, 기본 설정

---

## 📜 최근 작업 이력 (2025-11-25)

### ✅ 완료된 작업

#### 1. Socket.IO 이벤트 이름 통일
- **문제**: 프론트엔드와 백엔드 이벤트 이름 불일치로 채팅/미디어 토글 작동 안 함
- **수정**:
  - `media-toggle` → `media_toggle`
  - `chat-message` → `chat_message`
- **파일**:
  - `frontend/src/pages/RoomPage.tsx:408, 424, 573`
  - `backend/socketio_server.py:160-174, 177-195`

#### 2. WebRTC Signaling State 검증 추가
- **문제**: `InvalidStateError: Failed to set remote answer sdp: Called in wrong state: stable`
- **원인**: 이미 연결된 상태에서 answer를 받으려고 시도
- **해결**: signaling state 검증 로직 추가
```typescript
if (signalingState === 'have-local-offer') {
  await connection.setRemoteDescription(answer);
} else {
  console.warn(`잘못된 상태에서 answer 수신`);
}
```
- **파일**: `frontend/src/pages/RoomPage.tsx:375-389`

#### 3. FileTransfer 컴포넌트 API 수정
- **문제**: `axios` 직접 사용으로 baseURL 누락
- **해결**: `api` 인스턴스로 변경
- **변경**:
  - `axios.post('/api/video/verify')` → `api.post('/video/verify')`
  - `axios.post('/api/video/analyze')` → `api.post('/video/analyze')`
  - `axios.post('/api/video/chat')` → `api.post('/video/chat')`
- **파일**: `frontend/src/components/FileTransfer.tsx:22, 213, 252, 290`

#### 4. 방 나가기 이벤트 추가
- **문제**: 방을 나갈 때 Socket.IO 이벤트를 전송하지 않음
- **해결**: `leave_room` 이벤트 명시적 전송
- **파일**: `frontend/src/pages/RoomPage.tsx:540-542`

#### 5. 실시간 참가자 수 추적
- **추가**:
  - `get_room_participant_count()` 함수
  - `get_all_room_participants()` 함수
  - REST API `/api/rooms`에 `participantCount` 필드 추가
- **파일**:
  - `backend/socketio_server.py:25-32`
  - `backend/main.py:27, 410-423`
  - `frontend/src/pages/DashboardPage.tsx:234`

#### 6. 문서 업데이트
- ✅ `.docs/CLAUDE.md` - 알려진 이슈 섹션 추가, 서버 실행 방법 강조
- ✅ `TODO.md` - 작업 이력과 계획 통합 (이 문서)
- ✅ `README.md` - 업데이트 예정

#### 7. P0 긴급 버그 수정 (2025-11-25 오후 완료) 🎉

**7-1. 방 리스트 실시간 업데이트 구현**
- **문제**: 새로고침 전까지 새 방이 대시보드에 표시 안 됨
- **해결**:
  - `backend/socketio_server.py:260-265` - `notify_room_list_update()` 함수 추가
  - `backend/main.py:27` - notify_room_list_update import
  - `backend/main.py:451` - 방 생성 시 이벤트 발송
  - `frontend/src/pages/DashboardPage.tsx:5,22,33` - Socket.IO 연결 및 리스너
  - `frontend/src/pages/DashboardPage.tsx:57-60` - room_list_updated 이벤트 처리
- **테스트**: 두 탭에서 한쪽이 방 생성하면 다른쪽에 **새로고침 없이** 즉시 표시

**7-2. 참가자 수 동기화 로직 강화**
- **문제**: 대시보드와 실제 방 내부 인원수가 다름, 새로고침마다 숫자 변경
- **해결**:
  - `backend/socketio_server.py:45-76` - disconnect 이벤트 강화
    - 모든 방에서 완전히 제거
    - room_participants 안전장치 추가
    - 상세 로깅 (연결된 방 목록, 제거 개수 등)
  - `backend/socketio_server.py:79-119` - join_room 상세 로깅
    - 현재 참가자 수 로그
    - 참가자 목록 출력
  - `backend/socketio_server.py:128-170` - leave_room_internal 로깅 강화
    - 남은 참가자 수 확인
- **테스트**: 입장/퇴장 반복해도 항상 정확한 인원 수 표시

**7-3. 빈 방 자동 정리**
- **문제**: 0명인 방이 계속 목록에 남음
- **해결**:
  - `backend/socketio_server.py:145-165` - leave_room_internal 수정
    - 마지막 참가자 퇴장 시 DB status='inactive' 처리
    - notify_room_list_update() 호출로 실시간 목록 갱신
  - `backend/socketio_server.py:68-71` - disconnect에서도 빈 방 삭제
- **테스트**: 모든 사용자가 나가면 대시보드에서 방이 **새로고침 없이** 사라짐

**7-4. 서버 실행 방법 수정**
- **문제**: `uvicorn main:app` 실행 시 Socket.IO 403 에러
- **해결**: `uvicorn main:combined_app` 사용으로 변경
- **파일**: `backend/main.py:562` - combined_app 사용

**7-5. Windows 인코딩 문제 수정**
- **문제**: 백엔드 시작 시 이모지로 인한 UnicodeEncodeError (cp949)
- **해결**: `backend/main.py:185` - 이모지 제거

---

#### 8. Playwright 자동 테스트 수행 (2025-11-25 오후 10시)
- **테스트 항목**:
  1. ✅ 방 리스트 실시간 업데이트 - 성공!
  2. ⚠️ 참가자 수 동기화 - 문제 발견
  3. ⚠️ 빈 방 자동 삭제 - 문제 발견
- **발견된 문제**:
  - RoomPage에서 4개의 Socket.IO 연결 생성 (같은 사용자)
  - 방 입장 시 4번 join_room 이벤트 발생
  - 방 나갈 때 1번만 leave_room 발생
  - 결과: 참가자 수 불일치 (3/100명 표시)
- **원인**: 프론트엔드 RoomPage의 Socket.IO 연결 관리 문제

#### 9. Windows cp949 인코딩 문제 수정 (2025-11-25 오후 10시)
- **문제**: socketio_server.py의 이모지로 인한 UnicodeEncodeError
- **해결**: 모든 이모지를 [TAG] 형식으로 변경
  - `✅` → `[OK]`
  - `❌` → `[DISCONNECT]`
  - `📊` → `[STATS]`
  - 등등...
- **파일**: `backend/socketio_server.py` 전체

#### 10. RoomPage Socket.IO 중복 연결 문제 수정 (2025-11-25 오후 10시 30분) 🎉
- **문제**: RoomPage에서 같은 사용자가 4개의 Socket.IO 연결 생성
- **원인**:
  - useEffect 의존성 배열에 `user` 객체가 있어 참조 변경 시마다 재실행
  - React Strict Mode에서 컴포넌트 2번 마운트
  - 중복 연결 방지 로직 부재
- **해결**:
  - **frontend/src/pages/RoomPage.tsx:82** - 의존성 배열 수정 (`user` → `user?.id`)
  - **frontend/src/pages/RoomPage.tsx:72-75** - 이미 연결된 경우 스킵 로직 추가
  - **frontend/src/pages/RoomPage.tsx:178-181** - connectSocket 중복 연결 방지
  - **frontend/src/pages/RoomPage.tsx:184-188** - 기존 소켓 정리 로직 추가
  - **frontend/src/pages/RoomPage.tsx:596-604** - cleanup 함수 강화 (removeAllListeners 추가)
- **테스트 결과** (Playwright):
  - ✅ **이전**: 4개 Socket.IO 연결 생성 (feS_n3V5, pkAxEk, Ak2rFA, -irUEM)
  - ✅ **이후**: 1개 Socket.IO 연결만 생성 (SbjjoOA)
  - ✅ 참가자 수 정확: 입장 시 1/100명, 나갈 때 0/100명
  - ✅ 빈 방 자동 삭제: [DELETE] 방 15 메모리에서 삭제
  - ✅ DB 비활성화: [OK] 방 15 DB에서 비활성화 완료
- **영향**:
  - 모든 P0 긴급 버그 해결 완료
  - 참가자 수 동기화 정상 작동
  - 빈 방 자동 정리 정상 작동

---

## 🔴 P0 - 긴급 (즉시 수정 필요)

### ✅ 모든 P0 이슈 해결 완료! (2025-11-25 오후 10시 30분)

~~1. **RoomPage Socket.IO 중복 연결 문제**~~ ✅ **완료**
   - 섹션 10 참조: 1개 연결만 생성되도록 수정 완료
   - 참가자 수 동기화 정상 작동
   - 빈 방 자동 정리 정상 작동

**P0 작업 없음** - P1 작업으로 이동 가능

---

## 🧪 테스트 방법 (브라우저에서 직접 테스트)

### 전제 조건
- 백엔드: `uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload` 실행 중
- 프론트엔드: `npm run dev` 실행 중
- 브라우저 2개 탭 준비

### 테스트 1: 방 리스트 실시간 업데이트
1. **탭 A, B** 모두 http://localhost:7700 접속 및 로그인
2. **탭 A**에서 대시보드 대기
3. **탭 B**에서 새 방 생성 "테스트방1"
4. **탭 A** 확인: **새로고침 없이** 방이 즉시 나타나는지 ✅

### 테스트 2: 참가자 수 동기화
1. **탭 A, B** 모두 대시보드에서 대기
2. **탭 A**에서 "테스트방1" 입장
3. **탭 B** 확인: 대시보드에 "1/100명" 표시 ✅
4. **탭 B**에서도 "테스트방1" 입장
5. **탭 A, B** 모두 확인:
   - 대시보드: "2/100명"
   - 방 내부: "총 2명"
6. **탭 A** 방 나가기
7. **탭 B** 확인:
   - 대시보드: "1/100명"
   - 방 내부: "총 1명"

### 테스트 3: 빈 방 자동 삭제
1. **탭 A, B** 모두 "테스트방1"에 입장
2. **탭 A, B** 모두 방 나가기
3. 대시보드 확인: **새로고침 없이** 방이 사라지는지 ✅

### 확인할 로그
**브라우저 콘솔 (F12)**:
- `🔌 Socket.IO 연결 성공 (대시보드)`
- `📢 방 목록 업데이트 알림 수신 - 새로고침`

**백엔드 터미널**:
- `👥 방 참가 요청: ... -> Room ...`
- `📊 현재 방 ... 참가자: N명`
- `🗑️ 빈 방 ... 메모리에서 삭제`
- `✅ 방 ... DB에서 비활성화 완료`
- `📢 방 목록 업데이트 알림 전송`

---

## 🟡 P1 - 중요 (1주일 내)

### 4. WebRTC 연결 안정화
**상태**: 계획됨
**예상 소요**: 3-5일

- [ ] NAT/방화벽 환경에서 연결 테스트
- [ ] ICE 연결 실패 시 재시도 로직
- [ ] TURN 서버 추가 (coturn 또는 Twilio)

### 5. 파일 전송 UI 개선
**상태**: 계획됨
**예상 소요**: 2-3일

- [ ] 진행률 바 컴포넌트
- [ ] 전송 속도 계산 및 표시
- [ ] 남은 시간 예측
- [ ] 취소 버튼 추가

### 6. 에러 핸들링 강화
**상태**: 계획됨
**예상 소요**: 2-3일

- [ ] 전역 에러 핸들러 (프론트엔드)
- [ ] API 에러 응답 표준화 (백엔드)
- [ ] 사용자 친화적 에러 메시지
- [ ] 로그 시스템 구축

---

## 🟢 P2 - 개선 (1개월 이상)

### 7. 채팅 고급 기능
- [ ] 이모지 피커
- [ ] 파일 드래그 앤 드롭
- [ ] 읽음 확인
- [ ] 메시지 고정

### 8. 사용자 프로필 시스템
- [ ] 프로필 이미지 업로드
- [ ] 닉네임 변경
- [ ] 상태 메시지
- [ ] 온라인/오프라인 표시

### 9. 회의 녹화 기능
- [ ] MediaRecorder API 통합
- [ ] 서버 측 녹화 저장
- [ ] 다운로드 기능
- [ ] 녹화 파일 관리

---

## 📊 테스트 현황

### ✅ 통과
- [x] 회원가입 / 로그인
- [x] 방 생성
- [x] 방 입장
- [x] WebRTC 연결 (기본)
- [x] 채팅 메시지 전송
- [x] 마이크/비디오 토글

### ✅ P0 Playwright 테스트 완료 (2025-11-25 오후 10시)
- [x] 방 리스트 실시간 업데이트 - **테스트 성공! ✅**
  - room_list_updated 이벤트 정상 작동
  - 새로고침 없이 즉시 방 목록 갱신 확인
- [x] 참가자 수 정확한 표시 - **문제 발견 ⚠️**
  - 테스트 결과: 실제 1명인데 3/100명 표시
  - 원인: RoomPage에서 4개 Socket.IO 연결 생성, 1개만 정리
  - 해결 필요: Socket.IO 중복 연결 방지
- [x] 빈 방 자동 삭제 - **문제 발견 ⚠️**
  - DB 비활성화 로직은 존재하나 작동 안 함
  - 원인: 중복 Socket 연결로 방이 완전히 비워지지 않음
  - 해결 필요: Socket.IO 중복 연결 문제 해결 시 자동 해결 예상

### ⚠️ 미테스트
- [ ] 파일 전송 (3명 이상)
- [ ] 화면 공유
- [ ] 동영상 분석 (OpenAI API 키 필요)

---

## 🐛 알려진 제약사항

1. **WebRTC NAT 통과**: STUN만 사용, TURN 서버 미설정
2. **파일 크기**: 청크 16KB 제한, 대용량 파일(>100MB) 테스트 필요
3. **동시 접속**: 현재 100명 제한
4. **npm 보안 취약점**: 15개 (개발 의존성만, 런타임 영향 없음)

---

## 📝 작업 시 주의사항

### 반드시 지켜야 할 규칙
1. **목업 데이터 절대 금지** - 실제 동작하는 코드만 작성
2. **Raw SQL 사용** - SQLAlchemy ORM 사용하지 말 것
3. **camelCase 매핑** - API 응답 시 프론트엔드 규칙 준수
4. **변경 기록** - 이 파일(`TODO.md`) 업데이트

### 코드 작성 전 체크리스트
- [ ] 기존 코드 읽고 패턴 이해
- [ ] 유사한 기능이 이미 있는지 확인
- [ ] 변경이 다른 기능에 영향을 주는지 검토

### 작업 완료 후 체크리스트
- [ ] 로컬에서 테스트 완료
- [ ] 브라우저 콘솔 에러 없음
- [ ] 백엔드 로그 에러 없음
- [ ] `TODO.md` 업데이트 (이 파일)

---

## 🔗 참고 문서

- **프로젝트 아키텍처**: `.docs/CLAUDE.md`
- **프로젝트 개요**: `README.md`
- **백엔드 README**: `backend/README.md`

---

**마지막 업데이트**: 2025-11-25 오후 10시
**다음 작업**: RoomPage Socket.IO 중복 연결 문제 해결

## 📝 최근 변경사항 요약 (2025-11-25 오후 10시)

### 백엔드
- `socketio_server.py`: notify_room_list_update() 추가, disconnect/join_room/leave_room_internal 강화
- `socketio_server.py`: 모든 이모지를 [TAG] 형식으로 변경 (Windows cp949 인코딩 문제 해결)
- `main.py`: combined_app 사용, notify_room_list_update import 및 호출

### 프론트엔드
- `DashboardPage.tsx`: Socket.IO 연결 및 room_list_updated 리스너 추가

### 테스트
- Playwright로 자동 테스트 수행
- ✅ 방 리스트 실시간 업데이트: 성공
- ⚠️ 참가자 수 동기화: 문제 발견 (RoomPage Socket.IO 중복 연결)
- ⚠️ 빈 방 자동 삭제: 문제 발견 (중복 연결로 인해 작동 안 함)

### 발견된 버그
- **RoomPage Socket.IO 중복 연결**: 같은 사용자가 4개 연결 생성, 1개만 정리
- **해결 방향**: useEffect 의존성 배열 수정, cleanup 함수 강화

### 서버 실행 명령 변경
- 변경 전: `uvicorn main:app --host 0.0.0.0 --port 7701 --reload`
- 변경 후: `uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload`
