# 🎬 VideoNet Pro - 팀 프로젝트 발표 자료

> **과목**: 멀티미디어 (AI+X)
> **발표일**: 2025년 12월
> **발표 시간**: 약 10분
> **팀 인원**: 4명

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [해결한 버그](#3-해결한-버그)
4. [추가한 기능](#4-추가한-기능)
5. [협업 과정](#5-협업-과정)

---

## 1. 프로젝트 개요

### 🎯 목표
기존에 미완성된 **VideoNet Pro** 화상회의 플랫폼을 분석하여 **버그를 수정**하고 **새로운 기능을 추가**하는 것

### 📌 VideoNet Pro란?
- WebRTC 기반 **실시간 화상회의** 플랫폼
- Discord/Zoom 스타일의 모던 UI
- P2P 방식으로 서버 부하 최소화

### ⏰ 개발 기간
2025년 11월 25일 ~ 11월 30일

---

## 2. 기술 스택

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.2.0 | UI 프레임워크 |
| TypeScript | 5.3.3 | 타입 안정성 |
| Vite | 7.2.4 | 빌드 도구 |
| Tailwind CSS | 3.3.6 | 스타일링 |
| Socket.IO Client | 4.5.4 | 실시간 통신 |
| Recharts | 3.5.0 | 그래프 시각화 |

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| FastAPI | 0.104.1 | REST API |
| python-socketio | 5.10.0 | 실시간 통신 |
| SQLite | - | 데이터베이스 |
| OpenCV | 4.9+ | 영상 처리 |
| scikit-image | 0.24+ | 품질 분석 (PSNR/SSIM) |

### 핵심 기술
| 기술 | 용도 |
|------|------|
| **WebRTC** | 순수 API로 P2P 화상통화 구현 |
| **Canvas API** | 실시간 영상 효과 처리 |
| **Web Audio API** | 실시간 오디오 효과 처리 |

---

## 3. 해결한 버그

### 🐛 버그 1: 백엔드 웹소켓과 FastAPI 포트 불일치
| 항목 | 내용 |
|------|------|
| **증상** | Socket.IO 연결 시 403 에러 발생 |
| **원인** | `uvicorn main:app`으로 실행 시 Socket.IO가 별도 포트에서 동작 |
| **해결** | FastAPI와 Socket.IO를 `combined_app`으로 통합하여 같은 포트(7701)에서 실행 |
| **관련 파일** | `backend/main.py`, `backend/run.py` |

---

### 🐛 버그 2: 웹소켓 중복 연결 오류
| 항목 | 내용 |
|------|------|
| **증상** | 같은 사용자가 여러 번 연결되어 이벤트 중복 발생, 참가자 수 이상 |
| **원인** | 페이지 리렌더링 시 기존 Socket.IO 연결을 정리하지 않고 새로 연결 |
| **해결** | 연결 전 기존 소켓 체크 + `useEffect` cleanup에서 `disconnect()` 호출 |
| **관련 파일** | `frontend/src/pages/RoomPage.tsx`, `frontend/src/pages/DashboardPage.tsx` |

---

### 🐛 버그 3: 방에 0명이어도 방이 남아있는 문제
| 항목 | 내용 |
|------|------|
| **증상** | 비활성 방(0/100)이 대시보드에 계속 표시됨 |
| **원인** | 서버 재시작 시 메모리는 초기화되지만 DB의 `status`가 `active`로 유지 |
| **해결** | 서버 시작 시 모든 방을 `inactive`로 초기화 + 마지막 참가자 퇴장 시 방 삭제 |
| **관련 파일** | `backend/main.py` (startup 이벤트), `backend/socketio_server.py` (leave_room) |

---

### 🐛 버그 4: 호스트가 2명으로 표시 / UI상 인원 불일치
| 항목 | 내용 |
|------|------|
| **증상** | 방 참가자 수가 실제와 다르게 표시, 호스트가 2명으로 보임 |
| **원인** | `user_left` 핸들러에서 React `setState` 클로저 문제로 이전 상태 참조 |
| **해결** | `setParticipants(prev => prev.filter(...))` 콜백 패턴 사용 |
| **관련 파일** | `frontend/src/pages/RoomPage.tsx` (user_left, user_joined 핸들러) |

---

### 🐛 버그 5: 다크모드/라이트모드 동작 안 함
| 항목 | 내용 |
|------|------|
| **증상** | 테마 토글 버튼 클릭해도 UI 색상 변경 안 됨 |
| **원인** | CSS에 `#추가부분` 잘못된 주석 + `@layer components` 블록 미닫힘 |
| **해결** | CSS 구문 오류 수정 + 테마별 클래스 시스템(`.room-root`, `.dashboard-root` 등) 적용 |
| **관련 파일** | `frontend/src/styles/index.css`, `frontend/src/pages/RoomPage.tsx`, `DashboardPage.tsx` |

---

### 🐛 버그 6: 파일 전송 시 이전 파일 정보로 값 오류
| 항목 | 내용 |
|------|------|
| **증상** | 두 번째 파일 전송 시 이전 파일의 크기/해시 정보가 남아있음 |
| **원인** | 전송 완료 후 상태 변수 초기화 누락 |
| **해결** | `file_transfer_end` 이벤트에서 `setTransferStats(null)`, `setReceivedFile(null)` 호출 |
| **관련 파일** | `frontend/src/components/FileTransfer.tsx` |

---

### 🐛 버그 7: 재입장 시 카메라 검은 화면
| 항목 | 내용 |
|------|------|
| **증상** | 방을 나갔다가 다시 입장하면 카메라가 "연결중..."으로만 표시 |
| **원인** | cleanup에서 트랙 종료 후 재입장 시 `ended` 상태의 스트림 재사용 시도 |
| **해결** | 스트림 `readyState === 'live'` 체크 + 트랙 상태 완전 초기화 |
| **관련 파일** | `frontend/src/pages/RoomPage.tsx`, `frontend/src/utils/webrtc-native.ts` |

---

### 🐛 버그 8: 상대방 퇴장 시 내 화면 검은색
| 항목 | 내용 |
|------|------|
| **증상** | 상대방이 방을 나가면 내 카메라 화면도 검은색으로 변함 |
| **원인** | 재입장 시 기존 P2P 연결 미정리로 충돌 발생 |
| **해결** | `user_joined` 핸들러에서 기존 연결 정리 후 새 P2P 생성 |
| **관련 파일** | `frontend/src/pages/RoomPage.tsx` |

---

### 🐛 버그 9: 영상/오디오 효과 적용 시 충돌
| 항목 | 내용 |
|------|------|
| **증상** | 영상 효과 적용하면 오디오가 끊기고, 오디오 효과 적용하면 영상이 멈춤 |
| **원인** | "영상 효과 적용" 버튼이 전체 스트림을 교체하여 오디오 트랙도 덮어씀 |
| **해결** | 비디오/오디오 트랙 독립 처리 (`processedVideoStreamRef`, `processedAudioStreamRef` 분리) |
| **관련 파일** | `frontend/src/components/WebcamEffects.tsx` |

---

### 🐛 버그 10: 웹캠 효과 적용 시 영상 안 보임
| 항목 | 내용 |
|------|------|
| **증상** | 효과 적용 버튼 클릭 후 영상이 "연결중..."으로만 표시 |
| **원인** | `processStream`에서 비디오 메타데이터 로딩 전에 Canvas 크기가 0×0으로 반환 |
| **해결** | `processStream`을 `async`로 변경 + `onloadedmetadata` Promise 대기 |
| **관련 파일** | `frontend/src/utils/video-effects.ts` |

---

### 🐛 버그 11: 오디오 효과 안 들림
| 항목 | 내용 |
|------|------|
| **증상** | Echo, Reverb 효과 적용해도 소리 변화 없음 |
| **원인** | `wetGain.gain.value = 0.0`으로 설정되어 효과음 출력 안 됨 |
| **해결** | `wetGain` 초기값 0.7로 수정 + 에코/리버브 동시 적용 지원 |
| **관련 파일** | `frontend/src/utils/audio-effects.ts` |

---

### 🐛 버그 12: 라이트모드 버튼 안 보임
| 항목 | 내용 |
|------|------|
| **증상** | 라이트모드에서 "회의 참가" 버튼이 배경과 동일해서 안 보임 |
| **원인** | 버튼 배경색이 다크모드 전용 색상으로 하드코딩됨 |
| **해결** | `.dashboard-card` 테마별 클래스 적용 (`bg-white` / `bg-discord-light`) |
| **관련 파일** | `frontend/src/pages/DashboardPage.tsx`, `frontend/src/styles/index.css` |

---

### 🐛 버그 13: Tailwind 클래스 오타
| 항목 | 내용 |
|------|------|
| **증상** | 일부 텍스트가 다크모드에서 안 보임 |
| **원인** | `dark: text-white` (콜론 뒤 공백) 오타 |
| **해결** | `dark:text-white`로 수정 |
| **관련 파일** | `DashboardPage.tsx`, `FileTransfer.tsx` 등 |

---

### 🐛 버그 14: accept 속성 중복
| 항목 | 내용 |
|------|------|
| **증상** | 파일 선택 시 HTML 경고 발생 |
| **원인** | `<input>` 태그에 `accept="*/*"` 속성이 2개 |
| **해결** | 중복 속성 제거 |
| **관련 파일** | `frontend/src/components/FileTransfer.tsx` |

---

## 4. 추가한 기능

### ✨ 기능 1: 다크모드 / 라이트모드
| 항목 | 내용 |
|------|------|
| **설명** | 사용자가 테마를 선택하여 UI 색상 전환 가능 |
| **구현 방식** | `html[data-theme='dark']` / `html[data-theme='light']` 속성 기반 |
| **기술 포인트** | Tailwind CSS 커스텀 클래스 + LocalStorage 저장 |
| **관련 파일** | `frontend/src/contexts/AuthContext.tsx`, `frontend/src/styles/index.css` |

---

### ✨ 기능 2: 백엔드 실행 시 방 자동 초기화
| 항목 | 내용 |
|------|------|
| **설명** | 서버 시작 시 모든 방을 `inactive` 상태로 초기화 |
| **구현 방식** | FastAPI `@app.on_event("startup")`에서 SQL 실행 |
| **기술 포인트** | 서버 재시작 시 좀비 방 방지 |
| **관련 파일** | `backend/main.py` |

---

### ✨ 기능 3: 빈 방 자동 삭제
| 항목 | 내용 |
|------|------|
| **설명** | 마지막 참가자가 퇴장하면 방이 자동으로 삭제됨 |
| **구현 방식** | `leave_room` 이벤트에서 참가자 수 체크 후 DB 삭제 |
| **기술 포인트** | Socket.IO 이벤트 + Raw SQL |
| **관련 파일** | `backend/socketio_server.py` |

---

### ✨ 기능 4: 웹캠 실시간 압축 품질 분석
| 항목 | 내용 |
|------|------|
| **설명** | 웹캠 영상을 실시간으로 압축하고 품질 저하 정도를 수치로 측정 |
| **구현 방식** | 백엔드에서 PSNR/SSIM 계산 + 프론트엔드에서 Recharts 그래프 시각화 |
| **기술 포인트** | OpenCV 이미지 처리, scikit-image 품질 지표 |
| **관련 파일** | `backend/image_compression.py`, `frontend/src/components/WebcamCompression.tsx`, `CompressionAnalysis.tsx` |

**품질 지표:**
```python
# PSNR (Peak Signal-to-Noise Ratio) - dB 단위, 높을수록 좋음
psnr = peak_signal_noise_ratio(original, compressed)

# SSIM (Structural Similarity Index) - 0~1 사이, 1에 가까울수록 좋음
ssim = structural_similarity(original, compressed, channel_axis=2)
```

---

### ✨ 기능 5: 파일 전송 시 무결성 검증
| 항목 | 내용 |
|------|------|
| **설명** | 전송된 파일의 SHA256 해시를 비교하여 무결성 검증 |
| **구현 방식** | 송신 측에서 해시 계산 → 수신 측에서 재계산 후 비교 |
| **기술 포인트** | Web Crypto API `crypto.subtle.digest()` |
| **관련 파일** | `frontend/src/components/FileTransfer.tsx` |

---

### ✨ 기능 6: 웹캠 영상 효과 (6종)
| 항목 | 내용 |
|------|------|
| **설명** | 실시간으로 웹캠 영상에 다양한 필터 적용 |
| **구현 방식** | Canvas API `getImageData` → 픽셀별 연산 → `putImageData` |
| **효과 목록** | 흑백, 세피아, 블러, 엣지 감지, 카툰, 네온 |
| **관련 파일** | `frontend/src/utils/video-effects.ts`, `frontend/src/components/WebcamEffects.tsx` |

**효과별 구현:**
| 효과 | 구현 방식 |
|------|-----------|
| 흑백 | `gray = 0.299*R + 0.587*G + 0.114*B` |
| 세피아 | RGB → 세피아 톤 매트릭스 변환 |
| 블러 | CSS `filter: blur(Npx)` |
| 엣지 감지 | Sobel 필터 커널 적용 |
| 카툰 | 색상 양자화 + 엣지 강조 |
| 네온 | 색상 반전 + 글로우 효과 |

---

### ✨ 기능 7: 웹캠 기하 변환 효과
| 항목 | 내용 |
|------|------|
| **설명** | 영상을 반전하거나 기울이는 효과 |
| **구현 방식** | Canvas `scale()`, `transform()` 메서드 |
| **효과 목록** | 좌우 반전, 상하 반전, 45° 전단, 90° 전단 |
| **관련 파일** | `frontend/src/utils/video-effects.ts` |

---

### ✨ 기능 8: 웹캠 오디오 효과 (3종)
| 항목 | 내용 |
|------|------|
| **설명** | 실시간으로 마이크 음성에 효과 적용 |
| **구현 방식** | Web Audio API 노드 체인 |
| **효과 목록** | Low Pass Filter, Echo, Reverb |
| **관련 파일** | `frontend/src/utils/audio-effects.ts`, `frontend/src/components/WebcamEffects.tsx` |

**Web Audio API 노드:**
| 효과 | 노드 | 설명 |
|------|------|------|
| Low Pass Filter | `BiquadFilterNode` | 고주파 제거 (뭉개진 소리) |
| Echo | `DelayNode` + `GainNode` | 딜레이 0.1~1.0초 조절 |
| Reverb | `ConvolverNode` | 잔향 효과 (공간감) |

---

### ✨ 기능 9: 효과 토글형 즉시 적용
| 항목 | 내용 |
|------|------|
| **설명** | 효과 체크박스 클릭 시 즉시 적용 (기존: 적용 버튼 별도 클릭 필요) |
| **구현 방식** | `onChange` 핸들러에서 바로 스트림 업데이트 |
| **기술 포인트** | `replaceTrack()`으로 renegotiation 없이 트랙 교체 |
| **관련 파일** | `frontend/src/components/WebcamEffects.tsx`, `frontend/src/pages/RoomPage.tsx` |

---

### ✨ 기능 10: 방 리스트 실시간 업데이트
| 항목 | 내용 |
|------|------|
| **설명** | 다른 사용자가 방을 생성/삭제하면 실시간으로 대시보드에 반영 |
| **구현 방식** | Socket.IO `room_list_updated` 이벤트 + 10초 폴링 백업 |
| **기술 포인트** | 이벤트 누락 대비 폴링 추가 |
| **관련 파일** | `backend/socketio_server.py`, `frontend/src/pages/DashboardPage.tsx` |

---

### ✨ 기능 11: WebRTC 연결 상태 검증
| 항목 | 내용 |
|------|------|
| **설명** | 시그널링 전 연결 상태 확인하여 오류 방지 |
| **구현 방식** | `pc.signalingState` 체크 후 offer/answer 생성 |
| **기술 포인트** | `stable`, `have-local-offer` 등 상태별 처리 |
| **관련 파일** | `frontend/src/utils/webrtc-native.ts` |

---

## 5. 협업 과정

### 📅 작업 타임라인

| 날짜 | 커밋 | 주요 작업 |
|------|------|-----------|
| 11/25 | `3deff13` | 프로젝트 구조 정리, 백엔드/프론트엔드 코드 개선, 포트 통합 |
| 11/27 | `13e8d92` | 압축 품질 분석 + 웹캠 효과 기능 추가 + Socket.IO 버그 수정 |
| 11/27 | `52698eb` | 웹캠 효과 버그 수정 (async, wetGain, replaceTrack) |
| 11/28 | `2b3dd59` | JM 브랜치 병합 (다크모드 기능) |
| 11/30 | `8afe807` | P0 버그 5개 수정 + UI 테마 적용 + 발표 문서 추가 |

### 🔀 Git 브랜치 전략

```
main ─── KYW_0.1 (주 개발)
    └── JM (다크모드 기능)
```

### 💬 소통 방식

- **GitHub Pull Request**: 코드 리뷰 후 병합
- **TODO.md**: 작업 현황 실시간 공유

---

## 📎 참고 자료

- **GitHub**: [FN-Olofmeister/multimedia_final_teamproject](https://github.com/FN-Olofmeister/multimedia_final_teamproject)
- **WebRTC 공식 문서**: https://webrtc.org
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## 🙏 감사합니다!
