# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**VideoNet Pro** - AI 기능이 포함된 WebRTC 기반 화상회의 플랫폼
**작성자**: 20205146 한림대학교 콘텐츠IT 김재형
**기반**: videonet C 프로젝트

### 📌 현재 상태 (2025-11-25 업데이트)
- **데이터베이스**: ✅ videonet.db 생성 완료
- **환경 설정**: ✅ backend/.env 구성 완료
- **의존성**: ✅ 프론트엔드/백엔드 모두 설치 완료
- **최근 변경**:
  - Socket.IO 이벤트 이름 통일 (media_toggle, chat_message)
  - WebRTC signaling state 체크 추가
  - 실시간 참가자 수 추적 기능 추가
  - FileTransfer 컴포넌트 API 인스턴스 수정
- **서버 상태**: ⚠️ 현재 실행 중이지 않음 (아래 "빠른 시작" 참조)

### ⚠️ 알려진 이슈 (긴급 수정 필요)
1. **방 리스트 실시간 업데이트 안 됨**
   - 새 방이 생성되어도 새로고침 전까지 대시보드에 표시 안 됨
   - Socket.IO 이벤트로 실시간 업데이트 구현 필요

2. **참가자 수 불일치 문제**
   - 외부(대시보드)에서 보이는 인원수와 방 내부 인원수가 다름
   - 새로고침할 때마다 다른 숫자 표시됨
   - `room_participants` 동기화 로직 재검토 필요

3. **빈 방이 자동 삭제 안 됨**
   - 0명인 방이 계속 목록에 남아있음
   - 방 삭제 또는 status='inactive' 전환 로직 필요

4. **백엔드 실행 방법 주의**
   - ❌ `python main.py` 사용 금지 (Socket.IO 작동 안 됨)
   - ✅ 반드시 `uvicorn main:app --host 0.0.0.0 --port 7701 --reload` 사용

### 🚀 빠른 시작 (다음 작업자용)

#### 1단계: 서버 실행 (중요!)

**⚠️ 주의: 반드시 uvicorn으로 실행하세요!**

```bash
# 터미널 1 - 백엔드 시작
cd backend
uvicorn main:app --host 0.0.0.0 --port 7701 --reload

# ❌ 잘못된 방법 (Socket.IO 작동 안 됨)
# python main.py  # 절대 사용하지 말 것!

# 터미널 2 - 프론트엔드 시작
cd frontend
npm run dev
```

**실행 확인:**
- 백엔드 터미널에서 `INFO: Uvicorn running on http://0.0.0.0:7701` 확인
- 프론트엔드 터미널에서 `VITE v5.x.x ready in xxx ms` 확인
- 브라우저 콘솔에서 `Socket.IO 연결 성공` 로그 확인

#### 2단계: 브라우저 접속
- 프론트엔드: http://localhost:7700
- 백엔드 API: http://localhost:7701
- API 문서: http://localhost:7701/docs

#### 3단계: 테스트 계정
- 마스터 초대코드: `MASTER2024`
- 회원가입 후 개인 코드 자동 생성 (P-XXXXXX 형식)

### 📋 다음 작업 우선순위

> 자세한 작업 현황과 이력은 **`TODO.md`** (프로젝트 루트) 참조

#### 🔴 P0 - 긴급 (즉시 수정 필요)
1. **방 리스트 실시간 업데이트 구현**
   - 파일: `frontend/src/pages/DashboardPage.tsx`, `backend/socketio_server.py`
   - 작업: Socket.IO로 `room_created`, `room_deleted` 이벤트 추가
   - 예상 시간: 2-3시간

2. **참가자 수 동기화 로직 수정**
   - 파일: `backend/socketio_server.py`, `backend/main.py`
   - 작업:
     - `join_room`, `leave_room` 이벤트에서 `room_participants` 정확히 업데이트
     - disconnect 시 모든 방에서 자동 제거
     - REST API 호출 시 실시간 참가자 수 정확히 반환
   - 예상 시간: 3-4시간

3. **빈 방 자동 정리**
   - 파일: `backend/socketio_server.py`, `backend/main.py`
   - 작업: 마지막 참가자 나갈 때 meetings 테이블에서 status='inactive' 처리
   - 예상 시간: 1-2시간

#### 🟡 P1 - 중요 (1주일 내)
4. WebRTC 안정화 (NAT/TURN 서버 검토)
5. 파일 전송 UI 개선 (진행률 바, 속도 표시)
6. 에러 핸들링 강화 (전역 핸들러, 로그 시스템)

## 절대 규칙

### 🚨 NO MOCKS - NO FAKES - NO TEMPORARY SOLUTIONS
1. **목업/테스트/임시 데이터 절대 금지**
   - 가짜 데이터, 임시 구현, "테스트용" 코드 생성 금지
   - 모든 코드는 프로덕션 품질이어야 함

2. **근본 원인 해결**
   - 문제를 피상적으로 해결하지 말 것
   - 모든 엣지 케이스 고려
   - 영구적인 솔루션 제공

3. **프로덕션 품질 강제**
   - 철저한 에러 처리
   - 로깅 및 모니터링
   - 보안 검증

4. **한국어 사용**
   - AI는 항상 한국어로 응답
   - 코드 주석과 문서도 한국어

## 핵심 아키텍처

### 백엔드 (`/backend`) - FastAPI + Socket.IO
- **포트**: 7701
- **프레임워크**: FastAPI (비동기)
- **실시간 통신**: python-socketio (비동기)
- **데이터베이스**: SQLite (`videonet.db`)
  - **중요**: SQLAlchemy ORM 사용하지 않음
  - **패턴**: Raw SQL + `get_db()` 컨텍스트 매니저 사용
- **인증**: JWT (HS256) + bcrypt 비밀번호 해싱

#### 주요 파일
- `main.py` - REST API 엔드포인트, DB Raw SQL 쿼리
- `socketio_server.py` - Socket.IO 이벤트, WebRTC 시그널링
- `video_analysis.py` - GPT-4o-mini Vision API 통합
- `file_transfer.py` - P2P 파일 전송 로직

### 프론트엔드 (`/frontend`) - React + Vite + TypeScript
- **포트**: 7700
- **프레임워크**: React 18 + Vite
- **타입**: TypeScript 5.3
- **스타일**: Tailwind CSS (Discord 스타일 다크테마 `#1e1f2e`)
- **상태 관리**: Zustand
- **네트워킹**:
  - REST API: axios → `http://localhost:7701/api`
  - Socket.IO: socket.io-client → `http://localhost:7701`
  - WebRTC: 순수 WebRTC API (`webrtc-native.ts`, SimplePeer 사용 안 함)

#### 주요 페이지
- `LandingPage.tsx` - 메인 랜딩
- `RegisterPage.tsx` / `LoginPage.tsx` - 인증
- `DashboardPage.tsx` - 대시보드
- `RoomPage.tsx` - 화상회의 룸 (핵심 컴포넌트)

## 개발 워크플로우

### 서버 실행
```bash
# 백엔드 서버 시작 (포트 7701) - 가장 간단한 방법
cd backend
python run.py

# 또는 uvicorn으로 직접 실행 (combined_app 필수!)
cd backend
uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload

# ⚠️ 주의: main:app 사용 시 Socket.IO가 작동하지 않음!
# ❌ uvicorn main:app (Socket.IO 403 에러)

# 프론트엔드 개발 서버 시작 (포트 7700)
cd frontend
npm run dev
```

### 빌드 및 배포
```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 프론트엔드 프리뷰
npm run preview

# 린트 체크
npm run lint

# 백엔드 의존성 설치
cd backend
pip install -r requirements.txt
```

### 환경 변수 설정
**backend/.env**:
```env
SECRET_KEY=videonet-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MASTER_INVITE_CODE=MASTER2024
DATABASE_NAME=videonet.db
OPENAI_API_KEY=sk-proj-your-key-here
```

## 중요 구현 패턴

### 1. 데이터베이스 접근 패턴
```python
# ✅ 올바른 방법: Raw SQL with context manager
with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    result = cursor.fetchone()

# ❌ 잘못된 방법: SQLAlchemy ORM 사용하지 말 것
```

### 2. API 응답 매핑 (snake_case → camelCase)
백엔드는 snake_case, 프론트엔드는 camelCase 사용:
```python
# main.py 응답 예시
return {
    "id": user["id"],
    "username": user["username"],
    "personalCode": user["personal_code"],  # 수동 매핑 필요
    "fullName": user["full_name"]
}
```

### 3. WebRTC 연결 구조
- **시그널링**: Socket.IO 이벤트 (`webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`)
- **미디어**: 순수 WebRTC API (`RTCPeerConnection`)
- **STUN 서버**: Google 공개 STUN (`stun.l.google.com:19302`)
- **구현 파일**: `frontend/src/utils/webrtc-native.ts`

### 4. P2P 파일 전송
- **청크 크기**: 16KB
- **검증**: SHA256 해시 체크
- **프로토콜**: Socket.IO 이벤트 기반
- **이벤트**: `file_transfer_start`, `file_chunk`, `file_transfer_end`

### 5. AI 동영상 분석
- **모델**: GPT-4o-mini Vision API
- **프레임 추출**: OpenCV
- **토큰 최적화**: low detail 모드, 최소 프레임 수
- **검증**: SHA256 파일 무결성 체크

## 주요 Socket.IO 이벤트

### 연결 관리
- `connect` - 클라이언트 연결
- `disconnect` - 연결 해제
- `join_room` - 방 입장
- `leave_room` - 방 퇴장

### WebRTC 시그널링
- `webrtc_offer` - SDP Offer 전달
- `webrtc_answer` - SDP Answer 전달
- `webrtc_ice_candidate` - ICE 후보 전달

### 미디어 및 채팅
- `media_toggle` - 오디오/비디오 토글
- `chat_message` - 채팅 메시지 전송
- `screen_share_started` / `screen_share_stopped` - 화면 공유

### 파일 전송
- `file_transfer_start` - 전송 시작
- `file_chunk` - 청크 전송
- `file_transfer_end` - 전송 완료

## 데이터베이스 스키마

### 주요 테이블
```sql
users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  personal_code TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP
)

invite_codes (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  created_by INTEGER,
  max_uses INTEGER,
  current_uses INTEGER,
  expires_at TIMESTAMP
)

meetings (
  id INTEGER PRIMARY KEY,
  host_id INTEGER,
  name TEXT,
  is_private BOOLEAN,
  max_participants INTEGER,
  created_at TIMESTAMP
)
```

## 프로젝트 개조 가이드

### 작업 전 체크리스트
1. **`.docs/PROJECT_STATUS.md`** - 현재 상태 확인
2. **`.docs/FEATURE_PLAN.md`** - 기능 로드맵 확인
3. **기존 코드 분석** - 변경 전 동작 이해
4. **점진적 수정** - 기존 기능 보호

### 새 기능 추가 시
1. **API 엔드포인트**: `main.py`에 Raw SQL로 구현
2. **Socket 이벤트**: `socketio_server.py`에 정의
3. **프론트엔드 연동**: camelCase 응답 매핑 확인
4. **에러 핸들링**: 모든 엣지 케이스 처리
5. **로깅 추가**: 디버깅을 위한 상세 로그

### 변경 사항 기록
- `.docs/CHANGELOG.md`에 모든 변경 사항 문서화

## 시스템 요구사항

### 개발 환경
- Python 3.11+
- Node.js 18+
- npm 9+
- SQLite 3

### 프로덕션 환경
- systemd로 자동 시작 설정
- 포트 7700, 7701 방화벽 오픈
- HTTPS 리버스 프록시 권장
- TURN 서버 고려 (NAT 환경)

## 알려진 제약사항

1. **WebRTC NAT 통과**: STUN만 사용, TURN 서버 미설정
2. **파일 크기**: 청크 16KB 제한, 대용량 파일(>100MB) 테스트 필요
3. **동시 접속**: 현재 100명 제한
4. **npm 취약점**: 15개 (개발 의존성만, 런타임 영향 없음)

## 트러블슈팅

### 서버 실행 문제

#### 백엔드 포트 충돌
```bash
# 포트 7701 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :7701

# 프로세스 종료
taskkill /PID <프로세스ID> /F
```

#### 의존성 오류
```bash
# Python 의존성 재설치
cd backend
pip install -r requirements.txt --force-reinstall

# Node.js 의존성 재설치
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 데이터베이스 초기화
```bash
cd backend
# videonet.db 백업 (필요시)
cp videonet.db videonet.db.backup

# Python 인터프리터로 DB 초기화
python -c "from main import init_database; init_database()"
```

### WebRTC 연결 문제

#### 미디어 장치 권한 오류
- 브라우저 설정에서 카메라/마이크 권한 확인
- HTTPS 또는 localhost에서만 getUserMedia 작동
- 크롬 개발자도구 콘솔에서 에러 메시지 확인

#### ICE 연결 실패
```javascript
// webrtc-native.ts에서 연결 상태 확인
console.log('Connection State:', pc.connectionState);
console.log('ICE Connection State:', pc.iceConnectionState);
console.log('Signaling State:', pc.signalingState);
```

### 개발 팁

#### 실시간 로그 확인
```bash
# 백엔드 로그 (uvicorn --reload 사용 시 자동 출력)
cd backend
uvicorn main:app --host 0.0.0.0 --port 7701 --reload --log-level debug

# 프론트엔드 로그 (브라우저 콘솔 확인)
```

#### 데이터베이스 직접 확인
```bash
# SQLite CLI로 DB 확인
sqlite3 backend/videonet.db

# 유용한 명령어
.tables          # 테이블 목록
.schema users    # 테이블 스키마
SELECT * FROM users;  # 사용자 목록
```

#### API 테스트
```bash
# FastAPI 자동 문서 사용
# http://localhost:7701/docs

# curl로 테스트
curl -X POST http://localhost:7701/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"test1234","inviteCode":"MASTER2024"}'
```

## 참고 문서

- **프로젝트 상태**: `.docs/PROJECT_STATUS.md`
- **기능 계획**: `.docs/FEATURE_PLAN.md`
- **변경 이력**: `.docs/CHANGELOG.md`
- **백엔드 README**: `backend/README.md`
- **GitHub 지침**: `.github/copilot-instructions.md`
