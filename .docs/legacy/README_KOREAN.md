# 📚 VideoNet Pro - 화상회의 웹 애플리케이션 완벽 가이드

## 🎯 프로젝트 소개
**VideoNet Pro**는 Discord와 Zoom을 합친 것 같은 화상회의 프로그램입니다!
- 친구들과 영상통화를 할 수 있어요
- 화면을 공유할 수 있어요
- 채팅도 할 수 있어요
- 초대 코드가 있어야만 가입할 수 있어요 (비밀 클럽처럼!)

## 📁 전체 프로젝트 구조

```
videonet-pro/
├── 📂 backend/          (서버 - 뒤에서 일하는 부분)
│   ├── main.py         (메인 서버 파일)
│   ├── socketio_server.py (실시간 통신 서버)
│   ├── run_server.py   (서버 시작 파일)
│   └── videonet.db     (데이터베이스 - 정보 저장소)
│
├── 📂 frontend/         (화면 - 우리가 보는 부분)
│   ├── 📂 src/
│   │   ├── 📂 pages/   (각 페이지들)
│   │   ├── 📂 contexts/ (전체 앱에서 쓰는 정보)
│   │   ├── 📂 utils/    (도구 모음)
│   │   └── 📂 styles/   (예쁘게 꾸미기)
│   └── package.json    (필요한 도구 목록)
│
└── README.md           (설명서)
```

## 🚀 빠른 시작

### 1. 프로젝트 다운로드
```bash
git clone https://github.com/kjhk3082/Videonet.git
cd Videonet
```

### 2. 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

### 4. 브라우저에서 접속
http://localhost:3000

### 5. 회원가입
- 초대 코드: **MASTER2024**

## 🔑 기본 계정
- 이메일: demo@example.com
- 비밀번호: demo123

## 🌟 주요 기능

### 🎥 화상회의
- P2P WebRTC 연결
- 실시간 영상/음성 통화
- 최대 100명 동시 참가

### 🖥️ 화면 공유
- 전체 화면 또는 특정 창 공유
- 프레젠테이션 모드

### 💬 실시간 채팅
- Socket.IO 기반 실시간 메시징
- 이모지 지원

### 🔐 보안
- JWT 토큰 인증
- 초대 코드 시스템
- 개인 참가 코드

## 📝 상세 코드 설명은 README_KOREAN.md 파일 참조

## 👨‍💻 개발자
- GitHub: @kjhk3082

## 📄 라이선스
MIT License