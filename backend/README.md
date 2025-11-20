# VideoNet Pro Backend

FastAPI 기반 실시간 화상회의 백엔드 서버

## 기술 스택
- FastAPI
- Socket.IO
- SQLite
- JWT Authentication
- Python 3.11

## 환경 변수
```bash
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MASTER_INVITE_CODE=MASTER2024
DATABASE_NAME=videonet.db
PORT=8000
```

## Render 배포

1. [Render](https://render.com) 가입
2. New → Web Service
3. GitHub 저장소 연결
4. 다음 설정 사용:
   - Name: videonet-backend
   - Root Directory: backend
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## 로컬 실행
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints
- POST `/api/auth/register` - 회원가입
- POST `/api/auth/login` - 로그인
- GET `/api/auth/me` - 현재 사용자 정보
- POST `/api/rooms/create` - 방 생성
- GET `/api/rooms` - 방 목록
- POST `/api/rooms/{roomId}/join` - 방 참가

## WebSocket Events
- `join_room` - 방 입장
- `leave_room` - 방 퇴장
- `webrtc_offer` - WebRTC Offer
- `webrtc_answer` - WebRTC Answer
- `webrtc_ice_candidate` - ICE Candidate
- `chat_message` - 채팅 메시지