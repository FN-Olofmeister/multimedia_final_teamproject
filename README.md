# VideoNet Pro

AI 기능이 포함된 WebRTC 기반 화상회의 플랫폼

**작성자**: 20205146 한림대학교 콘텐츠IT 김재형
**프로젝트**: AI+X 최종 프로젝트
**기반**: videonet C 프로젝트

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 백엔드 서버 (포트 7701) - 가장 간단!
cd backend
python run.py

# 프론트엔드 서버 (포트 7700)
cd frontend
npm run dev
```

### 2. 브라우저 접속

- **프론트엔드**: http://localhost:7700
- **백엔드 API**: http://localhost:7701
- **API 문서**: http://localhost:7701/docs

### 3. 테스트 계정

- **마스터 초대코드**: `MASTER2024`
- 회원가입 후 개인 코드 자동 생성 (P-XXXXXX 형식)

---

## ✨ 주요 기능

### 1. WebRTC 화상회의
- 다중 사용자 실시간 화상회의
- 화면 공유
- 오디오/비디오 토글

### 2. P2P 파일 전송
- SHA256 해시 검증을 통한 무손실 전송
- 16KB 청크 전송
- 최소 대역폭 사용

### 3. AI 동영상 분석
- GPT-4o-mini Vision API 통합
- 슬라이싱 기반 요약
- 인물 인식

### 4. 실시간 채팅
- Socket.IO 기반 실시간 메시징
- 방별 채팅

---

## 🏗️ 기술 스택

### 백엔드
- **프레임워크**: FastAPI + python-socketio
- **데이터베이스**: SQLite (Raw SQL)
- **인증**: JWT + bcrypt
- **AI**: OpenAI GPT-4o-mini Vision
- **포트**: 7701

### 프론트엔드
- **프레임워크**: React 18 + Vite + TypeScript
- **스타일**: Tailwind CSS
- **상태 관리**: Zustand
- **WebRTC**: 순수 WebRTC API
- **포트**: 7700

---

## 📁 프로젝트 구조

```
multimedia_final_teamproject/
├── backend/                 # FastAPI 백엔드
│   ├── main.py             # REST API 엔드포인트
│   ├── socketio_server.py  # Socket.IO 시그널링
│   ├── video_analysis.py   # AI 동영상 분석
│   ├── file_transfer.py    # P2P 파일 전송
│   └── videonet.db         # SQLite 데이터베이스
│
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── contexts/      # React Context
│   │   └── utils/         # 유틸리티 (WebRTC 등)
│   └── package.json
│
├── .docs/                  # 📚 프로젝트 문서
│   ├── CLAUDE.md          # AI 작업 규칙 및 아키텍처
│   ├── PROJECT_STATUS.md  # 현재 상태
│   ├── FEATURE_PLAN.md    # 기능 로드맵
│   └── CHANGELOG.md       # 변경 이력
│
├── TODO.md                 # 작업 목록
└── README.md              # 이 파일
```

---

## 📚 문서

### 🎯 시작하기 전에 읽어야 할 문서 (우선순위 순)

1. **[TODO.md](TODO.md)** ⭐ 가장 먼저 읽을 것!
   - 최근 작업 이력 및 변경사항
   - 긴급 수정 필요한 버그 목록
   - 우선순위별 작업 계획
   - 완료된 작업 체크리스트

2. **[.docs/CLAUDE.md](.docs/CLAUDE.md)** ⭐ 개발 가이드
   - 프로젝트 아키텍처 및 개발 규칙
   - 절대 규칙 (NO MOCKS!)
   - 구현 패턴 및 코딩 규칙
   - 알려진 이슈 및 제약사항
   - 트러블슈팅 가이드

3. **[.docs/PROJECT_STATUS.md](.docs/PROJECT_STATUS.md)**
   - 프로젝트 현재 상태
   - 테스트 결과
   - 성능 지표

4. **[.docs/FEATURE_PLAN.md](.docs/FEATURE_PLAN.md)**
   - 기능 로드맵
   - 개발 일정
   - 우선순위 계획

---

## 🛠️ 개발 환경 설정

### 필수 요구사항
- Python 3.11+
- Node.js 18+
- npm 9+
- SQLite 3

### 백엔드 설정

```bash
cd backend

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
# backend/.env 파일 생성
cat > .env << EOF
SECRET_KEY=videonet-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MASTER_INVITE_CODE=MASTER2024
DATABASE_NAME=videonet.db
OPENAI_API_KEY=sk-proj-your-key-here
EOF

# 서버 실행 (가장 간단한 방법)
python run.py

# 또는 uvicorn 직접 실행 (개발 시)
# uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload
```

### 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

---

## 🧪 테스트

### API 테스트

```bash
# 서버 상태 확인
curl http://localhost:7701/

# 회원가입
curl -X POST http://localhost:7701/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@videonet.com",
    "username": "testuser",
    "password": "test1234",
    "inviteCode": "MASTER2024"
  }'

# FastAPI 자동 문서
http://localhost:7701/docs
```

### WebRTC 테스트

1. 두 개의 브라우저 탭 열기
2. 각각 회원가입 및 로그인
3. 한 사용자가 방 생성
4. 다른 사용자가 방 입장
5. 화상 연결 확인

---

## 📊 현재 상태 (2025-11-25)

### ✅ 완료됨
- 데이터베이스 생성 및 초기화
- 환경 설정 파일 구성
- Socket.IO 이벤트 통일
- WebRTC signaling state 검증
- 실시간 참가자 수 추적

### ⚠️ 알려진 이슈 (긴급 수정 필요)
1. ❌ 방 리스트 실시간 업데이트 안 됨
2. ❌ 참가자 수 불일치
3. ❌ 빈 방이 자동 삭제 안 됨

### 📋 다음 작업
**P0 - 긴급**: 위 3개 이슈 해결 (예상 6-9시간)

자세한 내용은 **[TODO.md](TODO.md)** 참조

---

## ⚠️ 알려진 제약사항

1. **WebRTC NAT 통과**: STUN만 사용, TURN 서버 미설정
2. **파일 크기**: 청크 16KB 제한, 대용량 파일(>100MB) 테스트 필요
3. **동시 접속**: 현재 100명 제한
4. **npm 보안 취약점**: 15개 (개발 의존성만, 런타임 영향 없음)

---

## 🤝 기여 가이드

### 절대 규칙
- ❌ **목업/테스트/임시 데이터 절대 금지**
- ❌ **SQLAlchemy ORM 사용 금지** (Raw SQL만 사용)
- ✅ **프로덕션 품질 코드만 작성**
- ✅ **모든 엣지 케이스 고려**
- ✅ **변경사항 `.docs/CHANGELOG.md`에 기록**

자세한 내용은 [.docs/CLAUDE.md](.docs/CLAUDE.md) 참조

---

## 📞 문의

- **GitHub**: [FN-Olofmeister/multimedia_final_teamproject](https://github.com/FN-Olofmeister/multimedia_final_teamproject)
- **문서**: `.docs/` 디렉토리 참조

---

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

**한림대학교 콘텐츠IT 학부 AI+X 프로젝트 과제**

---

**마지막 업데이트**: 2025-11-25
