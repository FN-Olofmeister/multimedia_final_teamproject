<<<<<<< HEAD
# VideoNet Pro - AI 기반 화상회의 플랫폼

[![GitHub](https://img.shields.io/github/license/kjhk3082/Videonet)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-orange)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow)](https://python.org)

> **20205146 한림대학교 콘텐츠IT학과 김재형**
> **AI+X 프로젝트 과제물 · 2025년 제작**
> videonet C 프로젝트를 기반으로 만들었습니다

Discord와 Zoom의 장점을 결합하고 **AI 기반 동영상 분석** 기능을 추가한 차세대 화상회의 플랫폼입니다. WebRTC 기반의 P2P 연결로 고품질 실시간 영상 통화를 제공하며, **무손실 파일 전송** 및 **GPT Vision API를 활용한 인물 인식** 기능을 제공합니다.

## 🌟 주요 기능

### 핵심 기능
- **초대 코드 시스템** - 마스터 코드(MASTER2024)로 가입 후 개인 초대 코드 생성
- **P2P 화상회의** - WebRTC 기반 실시간 영상/음성 통화 (최대 100명)
- **화면 공유** - 프레젠테이션 및 협업을 위한 스크린 공유
- **실시간 채팅** - Socket.IO 기반 즉각적인 메시지 전송

### 🆕 파일 전송 시스템
- **P2P 파일 전송** - Socket.IO를 통한 청크 기반 전송 (16KB 단위)
- **SHA256 해시 검증** - 전송 전후 파일 무결성 검증
- **대역폭 측정** - 실시간 전송 속도 및 시간 측정
- **무손실 전송 보장** - 파일 크기 및 해시 값 비교
- **진행률 표시** - 실시간 전송 진행률 UI

### 🤖 AI 동영상 분석 (GPT Vision API)
- **슬라이싱 기반 요약** - OpenCV로 10개 주요 프레임 추출
- **인물 인식** - GPT-4o-mini로 프레임별 인물 감지
- **"인물 없음" 감지** - 인물이 없는 프레임 자동 필터링
- **JPEG 압축** - 60% 압축률로 토큰 사용량 최소화
- **저해상도 분석** - "low" detail 옵션으로 비용 80% 절감
- **토큰 제한** - max_tokens=150으로 응답 토큰 제한

### 기술적 특징
- **Native WebRTC** - SimplePeer 대신 직접 구현한 WebRTC로 안정성 향상
- **JWT 인증** - 보안 토큰 기반 사용자 인증
- **SQLite 데이터베이스** - 경량 임베디드 데이터베이스
- **Tailwind CSS** - Discord 스타일 다크 테마 UI
- **TypeScript** - 타입 안정성 보장
- **systemd 서비스** - 자동 시작 및 관리

## 🚀 빠른 시작

### 시스템 요구사항
```bash
Node.js 20.0.0 이상
Python 3.10 이상
npm 또는 pnpm
OpenAI API Key (동영상 분석 기능 사용 시)
```

### 설치 및 실행

#### 1. 저장소 클론
```bash
git clone https://github.com/kjhk3082/Videonet.git
cd Videonet
```

#### 2. 의존성 설치
```bash
# 백엔드 설정
cd backend
pip3 install -r requirements.txt

# 프론트엔드 설정
cd ../frontend
npm install
```

#### 3. 환경 변수 설정
```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET_KEY=your_secret_key_here
CORS_ORIGINS=http://localhost:7700,https://your-domain.com
```

#### 4. systemd 서비스 설치 (자동 시작)
```bash
# 루트 디렉토리에서
./install_services.sh
```

#### 5. 수동 실행 (개발용)
```bash
# 백엔드 (터미널 1)
cd backend
uvicorn main:app --host 0.0.0.0 --port 7701

# 프론트엔드 (터미널 2)
cd frontend
npm run dev  # http://localhost:7700
```

## 📁 프로젝트 구조

```
videonet/
├── backend/                        # FastAPI 백엔드
│   ├── main.py                     # API 엔드포인트 및 비즈니스 로직
│   ├── socketio_server.py          # Socket.IO 실시간 통신 처리
│   ├── video_analysis.py           # 🆕 동영상 분석 및 인물 인식 (GPT Vision API)
│   ├── file_transfer.py            # 🆕 파일 전송 API (검증 및 분석)
│   ├── videonet.db                 # SQLite 데이터베이스
│   ├── .env                        # 환경 변수 (OpenAI API Key 등)
│   └── requirements.txt            # Python 패키지 목록
│
├── frontend/                       # React 프론트엔드
│   ├── src/
│   │   ├── pages/                  # 페이지 컴포넌트
│   │   │   ├── LandingPage.tsx    # 메인 랜딩 페이지
│   │   │   ├── RegisterPage.tsx   # 회원가입 (초대 코드 검증)
│   │   │   ├── LoginPage.tsx      # 로그인
│   │   │   ├── DashboardPage.tsx  # 대시보드 (방 관리)
│   │   │   └── RoomPage.tsx       # 화상회의 룸 (채팅/파일 전송 탭)
│   │   ├── components/
│   │   │   └── FileTransfer.tsx   # 🆕 파일 전송 UI (드래그앤드롭, 검증, 분석)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # 인증 상태 관리
│   │   ├── utils/
│   │   │   ├── api.ts             # API 통신 유틸리티
│   │   │   └── webrtc-native.ts   # WebRTC 연결 관리
│   │   └── App.tsx                # 라우팅 및 앱 진입점
│   └── public/
│       └── logo.svg                # VideoNet Pro 로고
│
├── install_services.sh             # systemd 서비스 설치 스크립트
├── README.md                       # 프로젝트 문서
└── CODEANALYSIS.md                 # 코드 상세 분석 문서
```

## 🔧 API 엔드포인트

### 인증 관련
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 (초대 코드 필요) |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 방 관리
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/rooms/create` | 새 방 생성 |
| GET | `/api/rooms` | 방 목록 조회 |
| GET | `/api/rooms/{roomId}` | 특정 방 정보 |
| POST | `/api/rooms/{roomId}/join` | 방 참가 |
| POST | `/api/rooms/{roomId}/leave` | 방 나가기 |

### 🆕 파일 전송 및 분석
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/video/verify` | 파일 검증 (SHA256 해시 비교) |
| POST | `/api/video/analyze` | 동영상 분석 (GPT Vision API) |

### Socket.IO 이벤트
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `join_room` | Client → Server | 방 입장 |
| `leave_room` | Client → Server | 방 퇴장 |
| `webrtc_offer` | Client ↔ Server | WebRTC Offer 전송 |
| `webrtc_answer` | Client ↔ Server | WebRTC Answer 전송 |
| `webrtc_ice_candidate` | Client ↔ Server | ICE Candidate 교환 |
| `chat_message` | Client ↔ Server | 채팅 메시지 |
| `file_transfer_start` | Client ↔ Server | 🆕 파일 전송 시작 |
| `file_chunk` | Client ↔ Server | 🆕 파일 청크 전송 (16KB) |
| `file_transfer_end` | Client ↔ Server | 🆕 파일 전송 완료 |

## 🎨 UI/UX 특징

### Discord 스타일 다크 테마
- 배경: `#1e1f2e` (디스코드 다크)
- 카드: `#2b2d3d` (카드 배경)
- 액센트: `#5865F2` (디스코드 브랜드 컬러)
- Zoom Blue: `#2D8CFF` (줌 블루)

### 반응형 레이아웃
- 모바일, 태블릿, 데스크톱 지원
- Flexbox 및 Grid 기반 레이아웃
- Framer Motion 애니메이션

## 📊 파일 전송 성능

### 측정 지표
1. **파일 크기** - 전송 전후 크기 비교
2. **전송 시간** - 밀리초 단위 측정
3. **대역폭** - MB/s 단위로 실시간 계산
4. **SHA256 해시** - 브라우저 및 서버에서 이중 검증

### 최적화 기법
- **16KB 청크** - 버퍼 오버플로우 방지
- **10ms 대기** - 백프레셔(backpressure) 방지
- **진행률 UI** - 실시간 전송 상태 표시

## 🤖 AI 동영상 분석 성능

### 비용 최적화
- **GPT-4o-mini** - 약 $0.03 / 1M 토큰
- **JPEG 60% 압축** - 이미지 크기 80% 감소
- **"low" detail** - 토큰 사용량 80% 감소
- **max_tokens=150** - 응답 토큰 제한

### 예상 비용
| 동영상 수 | 프레임 수 (10개/동영상) | 예상 비용 (월) |
|----------|----------------------|-------------|
| 50개 (1시간) | 500개 | $0.15~$0.25 |
| 100개 (2시간) | 1,000개 | $0.30~$0.50 |
| 1,000개 (20시간) | 10,000개 | $3.00~$5.00 |

## 🔐 보안

### 인증 시스템
- **JWT 토큰** - HttpOnly 쿠키로 안전한 토큰 저장
- **초대 코드** - 무분별한 가입 방지
- **비밀번호 해싱** - bcrypt로 암호화 저장

### 파일 전송 보안
- **SHA256 해시** - 파일 무결성 검증
- **청크 검증** - 각 청크마다 순서 확인
- **서버 검증** - 최종 파일 해시 서버 측 재확인

### WebRTC 보안
- **STUN/TURN 서버** - Google 공개 STUN 서버 사용
- **P2P 암호화** - DTLS-SRTP 자동 암호화

## 🚢 systemd 서비스 관리

### 서비스 명령어
```bash
# 서비스 시작
sudo systemctl start videonet-backend
sudo systemctl start videonet-frontend

# 서비스 중지
sudo systemctl stop videonet-backend
sudo systemctl stop videonet-frontend

# 서비스 재시작
sudo systemctl restart videonet-backend
sudo systemctl restart videonet-frontend

# 서비스 상태 확인
sudo systemctl status videonet-backend
sudo systemctl status videonet-frontend

# 로그 확인 (실시간)
sudo journalctl -u videonet-backend -f
sudo journalctl -u videonet-frontend -f

# 부팅 시 자동 시작 활성화
sudo systemctl enable videonet-backend
sudo systemctl enable videonet-frontend
```

## 🛠️ 트러블슈팅

### 일반적인 문제 해결

#### 1. 파일 전송이 실패함
- Socket.IO 연결 상태 확인
- 파일 크기 제한 확인 (브라우저 메모리)
- 방화벽 설정 확인

#### 2. 동영상 분석이 작동하지 않음
- .env 파일에 OPENAI_API_KEY 설정 확인
- OpenAI API 크레딧 잔액 확인
- 동영상 포맷 확인 (mp4, avi 지원)

#### 3. WebRTC 연결 실패
- 방화벽/NAT 설정 확인
- STUN/TURN 서버 상태 확인
- 카메라/마이크 권한 확인

#### 4. systemd 서비스가 시작되지 않음
```bash
# 로그 확인
sudo journalctl -u videonet-backend -n 50
sudo journalctl -u videonet-frontend -n 50

# 서비스 파일 검증
sudo systemctl daemon-reload
```

## 📈 프로젝트 상태

- ✅ MVP 완성
- ✅ 화면 공유 기능
- ✅ 초대 코드 시스템
- ✅ 실시간 채팅
- ✅ P2P 파일 전송 (SHA256 검증)
- ✅ AI 동영상 분석 (GPT Vision API)
- ✅ systemd 서비스 관리
- 🔄 모바일 최적화 (진행 중)
- 📋 녹화 기능 (계획 중)

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 🔗 관련 링크

- [GitHub Repository](https://github.com/kjhk3082/Videonet)
- [Code Analysis](./CODEANALYSIS.md)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [OpenAI GPT Vision API](https://platform.openai.com/docs/guides/vision)

---

**VideoNet Pro** - AI-Powered Video Conference Platform 🚀
Made with ❤️ by 김재형 (20205146, 한림대학교 콘텐츠IT학과)
=======
# multimedia_final_teamproject
멀티미디어개론_기말_팀플
>>>>>>> 265e52dccd07054872becaf9993da6da97a78507
