# VideoNet Pro

AI 기능이 포함된 WebRTC 기반 화상회의 플랫폼

**작성자**: 한림대학교 콘텐츠IT  
**프로젝트**: 멀티미디어개론 기말 팀프로젝트

---

## 🚀 빠른 시작

```bash
# 백엔드 (포트 7701)
cd backend
pip install -r requirements.txt
python run.py

# 프론트엔드 (포트 7700)
cd frontend
npm install
npm run dev
```

- **프론트엔드**: http://localhost:7700
- **백엔드 API**: http://localhost:7701/docs
- **마스터 초대코드**: `MASTER2024`

---

## ✨ 주요 기능

### 1. WebRTC 화상회의
- 다중 사용자 실시간 화상회의
- 화면 공유, 오디오/비디오 토글
- 실시간 참가자 수 추적

### 2. 실시간 채팅
- Socket.IO 기반 방별 채팅

### 3. P2P 파일 전송
- 16KB 청크 전송
- SHA256 해시 검증

### 4. AI 동영상 분석
- GPT-4o-mini Vision API
- 프레임 추출 및 인물 인식

### 5. 압축 품질 분석
- 웹캠 실시간 압축 분석
- PSNR/SSIM 품질 지표
- Recharts 그래프 시각화

### 6. 웹캠 실시간 효과
- **영상**: 반전, 전단, AI 필터 (흑백, 세피아, 블러, 엣지, 카툰, 네온)
- **오디오**: Low Pass Filter, Echo, Reverb

---

## 🏗️ 기술 스택

| 구분 | 기술 |
|------|------|
| **백엔드** | FastAPI, python-socketio, SQLite, JWT, OpenCV, OpenAI |
| **프론트엔드** | React 18, TypeScript, Vite, Tailwind CSS, Socket.IO, WebRTC, Recharts |

---

## 📁 프로젝트 구조

```
├── backend/                 # FastAPI 백엔드 (포트 7701)
│   ├── main.py             # REST API
│   ├── socketio_server.py  # 실시간 통신
│   ├── video_analysis.py   # AI 동영상 분석
│   ├── image_compression.py # 압축 품질 분석
│   └── videonet.db         # SQLite DB
│
├── frontend/               # React 프론트엔드 (포트 7700)
│   └── src/
│       ├── pages/          # 페이지 컴포넌트
│       ├── components/     # UI 컴포넌트
│       ├── utils/          # WebRTC, 효과 처리
│       └── contexts/       # React Context
│
└── .docs/                  # 📚 문서
    ├── CLAUDE.md           # 개발 가이드
    └── TODO.md             # 작업 현황
```

---

## 📚 문서

1. **[.docs/CLAUDE.md](.docs/CLAUDE.md)** - 개발 가이드, 아키텍처, 규칙
2. **[.docs/TODO.md](.docs/TODO.md)** - 작업 현황, 버그, 우선순위

---

## ⚠️ 알려진 제약사항

- **WebRTC NAT 통과**: STUN만 사용, TURN 서버 미설정
- **동시 접속**: 최대 100명 (테스트는 4명까지)
- **파일 크기**: 대용량(>100MB) 미테스트

---

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

**한림대학교 콘텐츠IT 학부 멀티미디어개론 기말 팀프로젝트**

---

**마지막 업데이트**: 2025-11-27
