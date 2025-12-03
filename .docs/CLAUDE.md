# CLAUDE.md - VideoNet Pro 개발 가이드

> **마지막 업데이트**: 2025-12-03
> **프로젝트**: VideoNet Pro - WebRTC 기반 화상회의 플랫폼
> **작성자**: 한림대학교 콘텐츠IT 김재형

---

## 🚨 절대 규칙

1. **목업/테스트/임시 데이터 금지** - 모든 코드는 프로덕션 품질
2. **SQLAlchemy ORM 사용 금지** - Raw SQL + `get_db()` 컨텍스트 매니저만 사용
3. **한국어 사용** - AI 응답, 주석, 문서 모두 한국어
4. **camelCase 매핑** - API 응답은 프론트엔드 규칙(camelCase) 준수

---

## 📁 프로젝트 구조

```
multimedia_final_teamproject/
├── backend/                    # FastAPI 백엔드 (포트 7701)
│   ├── main.py                # REST API + 라우터 등록
│   ├── socketio_server.py     # Socket.IO 실시간 통신
│   ├── video_analysis.py      # GPT Vision 동영상 분석
│   ├── image_compression.py   # 이미지 압축 및 PSNR/SSIM
│   ├── file_transfer.py       # 파일 전송 검증
│   ├── run.py                 # 서버 실행 스크립트
│   └── videonet.db            # SQLite 데이터베이스
│
├── frontend/                   # React 프론트엔드 (포트 7700)
│   └── src/
│       ├── pages/             # 페이지 컴포넌트
│       │   ├── RoomPage.tsx   # 핵심! 화상회의 룸
│       │   ├── DashboardPage.tsx
│       │   ├── LoginPage.tsx
│       │   └── RegisterPage.tsx
│       ├── components/        # 재사용 컴포넌트
│       │   ├── FileTransfer.tsx
│       │   ├── WebcamEffects.tsx      # 실시간 영상/오디오 효과
│       │   ├── WebcamCompression.tsx  # 압축 품질 분석
│       │   ├── CompressionAnalysis.tsx
│       │   └── CompressionQualitySlider.tsx
│       ├── utils/
│       │   ├── webrtc-native.ts  # WebRTC 연결
│       │   ├── video-effects.ts  # Canvas 영상 효과
│       │   ├── audio-effects.ts  # Web Audio 효과
│       │   └── api.ts
│       └── contexts/
│           └── AuthContext.tsx
│
└── .docs/                      # 문서
    ├── CLAUDE.md              # 이 파일 (개발 가이드)
    └── TODO.md                # 작업 현황 및 버그
```

---

## 🚀 서버 실행

```bash
# 백엔드 (포트 7701)
cd backend
python run.py
# 또는 개발 모드 (자동 재시작)
uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload

# 프론트엔드 (포트 7700)
cd frontend
npm install  # 최초 1회
npm run dev
```

**⚠️ 주의**: `uvicorn main:app` 사용 시 Socket.IO 403 에러 발생 → `main:combined_app` 사용

### 접속 URL
- 프론트엔드: http://localhost:7700
- 백엔드 API: http://localhost:7701
- API 문서: http://localhost:7701/docs

---

## 🔧 기술 스택

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| FastAPI | 0.104.1 | REST API |
| python-socketio | 5.10.0 | 실시간 통신 |
| SQLite | - | 데이터베이스 (Raw SQL) |
| JWT + bcrypt | - | 인증 |
| OpenCV | >=4.9.0 | 영상 처리 |
| scikit-image | >=0.24.0 | PSNR/SSIM 계산 |
| OpenAI | 1.12.0 | GPT-4o-mini Vision |

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.2.0 | UI 프레임워크 |
| TypeScript | 5.3.3 | 타입 안정성 |
| Vite | 7.2.4 | 빌드 도구 |
| Tailwind CSS | 3.3.6 | 스타일링 (Discord 다크테마) |
| Socket.IO Client | 4.5.4 | 실시간 통신 |
| 순수 WebRTC API | - | 화상통화 |
| Recharts | 3.5.0 | 그래프 시각화 |
| Framer Motion | 10.16.16 | 애니메이션 |

---

## 📡 Socket.IO 이벤트

### 방 관리
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `join_room` | C→S | 방 입장 |
| `leave_room` | C→S | 방 퇴장 |
| `room_list_updated` | S→C | 방 목록 실시간 갱신 |

### WebRTC 시그널링
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `webrtc_offer` | C↔S | SDP Offer |
| `webrtc_answer` | C↔S | SDP Answer |
| `webrtc_ice_candidate` | C↔S | ICE 후보 |

### 채팅 & 미디어
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `chat_message` | C↔S | 채팅 (언더스코어!) |
| `media_toggle` | C↔S | 오디오/비디오 토글 |

### 파일 전송
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `file_transfer_start` | C↔S | 전송 시작 |
| `file_chunk` | C↔S | 16KB 청크 |
| `file_transfer_end` | C↔S | 전송 완료 |

---

## 🗄️ 데이터베이스

### 접근 패턴
```python
# ✅ 올바른 방법: Raw SQL
with get_db() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    result = cursor.fetchone()

# ❌ SQLAlchemy ORM 사용 금지
```

### 주요 테이블
```sql
users (id, email, username, password_hash, personal_code, created_at)
invite_codes (id, code, created_by, max_uses, current_uses, expires_at)
meetings (id, host_id, name, is_private, max_participants, status, created_at)
```

---

## ✨ 구현된 기능

### 1. 인증 시스템
- 회원가입 (초대코드 검증)
- 로그인 (JWT 토큰)
- 개인 초대코드 자동 생성 (P-XXXXXX)

### 2. 화상회의 (WebRTC)
- 다중 사용자 실시간 비디오/오디오
- 화면 공유
- 마이크/카메라 토글
- 실시간 참가자 수 추적

### 3. 실시간 채팅
- Socket.IO 기반 방별 채팅

### 4. P2P 파일 전송
- 16KB 청크 전송
- SHA256 해시 검증

### 5. AI 동영상 분석
- GPT-4o-mini Vision API
- 프레임 추출 및 인물 인식

### 6. 압축 품질 분석
- 웹캠 실시간 압축 분석 (PNG 무손실 원본 대비 측정)
- PSNR/SSIM 품질 지표
- Recharts 그래프 시각화

### 7. 파일 전송 압축
- **이미지**: Canvas JPEG 압축 (품질 슬라이더 적용)
- **영상**: FFmpeg H.264 압축 (CRF 기반)
- **오디오**: FFmpeg MP3 압축 (비트레이트 기반)
- 압축 전후 용량 비교 표시

### 8. 웹캠 실시간 효과 (토글형 즉시 적용)
- **영상**: 반전(좌우/상하), 전단(45°/90°), AI 필터 6종
  - 흑백, 세피아, 블러, 엣지 감지, 카툰, 네온
- **오디오**: Low Pass Filter, Echo, Reverb
- **특징**: 토글 시 즉시 적용, 비디오/오디오 독립 처리 (충돌 없음)

---

## 📝 코드 작성 규칙

### API 응답 매핑 (snake_case → camelCase)
```python
# 백엔드 응답 시 수동 매핑
return {
    "id": user["id"],
    "personalCode": user["personal_code"],  # 수동 매핑!
    "fullName": user["full_name"]
}
```

### 새 기능 추가 시 체크리스트
1. **API**: `main.py`에 Raw SQL로 구현
2. **Socket 이벤트**: `socketio_server.py`에 정의
3. **프론트엔드**: camelCase 응답 매핑 확인
4. **에러 처리**: 모든 엣지 케이스 고려
5. **문서**: `.docs/TODO.md` 업데이트

---

## ⚠️ 알려진 제약사항

1. **WebRTC NAT 통과** - STUN만 사용, TURN 서버 미설정
2. **동시 접속** - 최대 100명 (테스트는 4명까지만)
3. **파일 크기** - 대용량(>100MB) 미테스트
4. **브라우저** - Chrome/Edge 완벽 지원, Safari 일부 제한

---

## 🧪 테스트 계정

- **마스터 초대코드**: `MASTER2024`
- 회원가입 후 개인 코드 자동 생성 (P-XXXXXX)

---

## 🔗 참고

- **GitHub**: [FN-Olofmeister/multimedia_final_teamproject](https://github.com/FN-Olofmeister/multimedia_final_teamproject)
- **현재 브랜치**: KYW_0.1

