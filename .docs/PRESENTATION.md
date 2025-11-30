# 🎬 VideoNet Pro - 팀 프로젝트 발표 자료

> **과목**: 멀티미디어 (AI+X)
> **발표일**: 2025년 11월 28일
> **발표 시간**: 약 10분
> **팀 인원**: 4명

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [팀 역할 분담](#3-팀-역할-분담)
4. [구현한 기능](#4-구현한-기능)
5. [해결한 버그](#5-해결한-버그)
6. [시연 데모](#6-시연-데모)
7. [협업 과정](#7-협업-과정)
8. [느낀 점 및 향후 계획](#8-느낀-점-및-향후-계획)

---

## 1. 프로젝트 개요

### 🎯 목표
기존에 미완성된 **VideoNet Pro** 화상회의 플랫폼을 분석하여 **버그를 수정**하고 **새로운 기능을 추가**하는 것

### 📌 VideoNet Pro란?
- WebRTC 기반 **실시간 화상회의** 플랫폼
- Discord/Zoom 스타일의 모던 UI
- P2P 방식으로 서버 부하 최소화

### ⏰ 개발 기간
2025년 11월 25일 ~ 11월 27일 (3일)

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

## 3. 팀 역할 분담

> 💡 **팀원별로 아래 중 담당 파트를 선택하여 발표**

### 👤 팀원 1: 웹캠 압축 품질 분석
- 담당 파일: `WebcamCompression.tsx`, `CompressionAnalysis.tsx`, `image_compression.py`
- 주요 기능:
  - 웹캠 영상 실시간 압축 (품질 1~100 조절)
  - **PSNR/SSIM** 품질 지표 계산
  - Recharts로 실시간 그래프 시각화

### 👤 팀원 2: 웹캠 실시간 효과 (영상)
- 담당 파일: `WebcamEffects.tsx`, `video-effects.ts`
- 주요 기능:
  - 영상 반전 (좌우/상하)
  - 전단 효과 (45°/90°)
  - AI 필터 6종 (흑백, 세피아, 블러, 엣지 감지, 카툰, 네온)

### 👤 팀원 3: 웹캠 실시간 효과 (오디오) + 다크모드
- 담당 파일: `audio-effects.ts`, `AuthContext.tsx`, `index.css`
- 주요 기능:
  - 오디오 효과 3종 (Low Pass Filter, Echo, Reverb)
  - 다크/라이트 모드 토글 시스템
  - 테마별 CSS 클래스 시스템

### 👤 팀원 4: 버그 수정 + 통합
- 담당 파일: `RoomPage.tsx`, `DashboardPage.tsx`, `socketio_server.py`
- 주요 작업:
  - P0 긴급 버그 5개 해결
  - 테마 적용 누락 수정
  - WebRTC 재연결 로직 개선

---

## 4. 구현한 기능

### 4.1 🎥 압축 품질 분석 (PSNR/SSIM)

**기능 설명:**
- 웹캠 영상을 실시간으로 압축하고 품질 저하 정도를 **수치로 측정**
- 원본 vs 압축 이미지 비교 시각화

**기술 포인트:**
```python
# PSNR (Peak Signal-to-Noise Ratio) - dB 단위
psnr = peak_signal_noise_ratio(original, compressed)

# SSIM (Structural Similarity Index) - 0~1 사이
ssim = structural_similarity(original, compressed, channel_axis=2)
```

**활용 예시:**
- 영상 통화 시 대역폭 제한 환경에서 최적 품질 결정
- 압축률에 따른 화질 변화 분석

---

### 4.2 🎨 웹캠 실시간 영상 효과

**구현된 효과들:**

| 카테고리 | 효과 | 설명 |
|----------|------|------|
| 기하 변환 | 좌우 반전 | Canvas `scale(-1, 1)` |
| 기하 변환 | 상하 반전 | Canvas `scale(1, -1)` |
| 기하 변환 | 45° 전단 | `skewX(45deg)` 효과 |
| 기하 변환 | 90° 전단 | 극단적 비스듬한 효과 |
| AI 필터 | 흑백 | `getImageData` → 픽셀별 연산 |
| AI 필터 | 세피아 | RGB → 세피아 톤 변환 |
| AI 필터 | 블러 | CSS `filter: blur()` |
| AI 필터 | 엣지 감지 | Sobel 필터 적용 |
| AI 필터 | 카툰 | 양자화 + 엣지 강조 |
| AI 필터 | 네온 | 색상 반전 + 글로우 효과 |

**핵심 코드:**
```typescript
// 영상 효과 토글 시 즉시 적용
const handleVideoEffectToggle = async (key, value) => {
  const newEffects = { ...videoEffects, [key]: value };
  setVideoEffects(newEffects);
  
  // Canvas로 실시간 처리
  const processedStream = await videoProcessor.processStream(stream);
  onStreamUpdate(processedStream);
};
```

---

### 4.3 🔊 웹캠 실시간 오디오 효과

**구현된 효과들:**

| 효과 | Web Audio API 노드 | 설명 |
|------|-------------------|------|
| Low Pass Filter | `BiquadFilterNode` | 고주파 제거 (뭉개진 소리) |
| Echo | `DelayNode` + `GainNode` | 딜레이 0.1~1.0초 조절 |
| Reverb | `ConvolverNode` | 잔향 효과 (공간감) |

**핵심 코드:**
```typescript
// Web Audio API 체인 구성
source → lowpassFilter → echoDelay → reverbConvolver → destination
```

---

### 4.4 🌓 다크/라이트 모드

**구현 방식:**
- `html[data-theme='dark']` / `html[data-theme='light']` 속성 기반
- Tailwind CSS 커스텀 클래스로 테마별 스타일 분리

**적용된 컴포넌트:**
- Dashboard (대시보드)
- RoomPage (화상회의 방)
- FileTransfer (파일 전송)
- 모달 창들

---

## 5. 해결한 버그

### 🔴 P0 긴급 버그 (5개 모두 해결)

| # | 버그 | 원인 | 해결 방법 |
|---|------|------|-----------|
| 1 | 비활성 방(0/100)이 너무 많음 | 서버 재시작 시 DB 동기화 누락 | 서버 시작 시 모든 방 `inactive` 초기화 |
| 2 | 방 생성이 실시간 반영 안됨 | `join_room`에서 알림 미발송 | Socket.IO 이벤트 추가 + 10초 폴링 백업 |
| 3 | 재입장 시 카메라 검은 화면 | 트랙 ended 상태에서 재사용 시도 | 트랙 상태 체크 후 재요청 |
| 4 | 상대방 퇴장 시 내 화면 검은색 | React `setState` 클로저 문제 | `setParticipants` 콜백 패턴 사용 |
| 5 | 영상/오디오 효과 충돌 | 적용 버튼이 트랙 전체 덮어쓰기 | 토글형 즉시 적용 + 독립 트랙 처리 |

### 🟡 추가 버그 수정

| 버그 | 파일 | 수정 내용 |
|------|------|-----------|
| CSS 구문 오류 | `index.css` | `#추가부분` 잘못된 주석 제거, `@layer` 닫힘 |
| 버튼 안 보임 (라이트 모드) | `DashboardPage.tsx` | 배경색과 동일한 버튼 색상 수정 |
| 오타 (`dark: text-white`) | 여러 파일 | `dark:text-white`로 수정 |
| `accept` 속성 중복 | `FileTransfer.tsx` | 중복 제거 |

---

## 6. 시연 데모

### 🖥️ 시연 순서 (제안)

1. **회원가입/로그인** (30초)
   - 마스터 초대코드: `MASTER2024`

2. **방 생성 및 참가** (1분)
   - 2개 브라우저 탭에서 동시 접속
   - 참가자 수 실시간 반영 확인

3. **압축 품질 분석** (1분)
   - 품질 슬라이더 조절
   - PSNR/SSIM 그래프 변화 확인

4. **영상 효과** (1분)
   - 좌우 반전, 흑백, 네온 필터 적용
   - 토글 즉시 적용 확인

5. **오디오 효과** (1분)
   - Echo 효과 적용 후 말하기
   - 상대방에게 효과 적용된 소리 전달 확인

6. **다크/라이트 모드 전환** (30초)
   - 설정에서 테마 토글
   - 전체 UI 색상 변경 확인

---

## 7. 협업 과정

### 📅 일정

| 날짜 | 작업 내용 |
|------|-----------|
| 11/25 | 프로젝트 분석, Socket.IO 중복 연결 버그 수정 |
| 11/26 | 압축 품질 분석, 웹캠 실시간 효과 기능 구현 |
| 11/27 | P0 버그 5개 수정, 다크모드 병합, 테마 적용 |

### 🔀 Git 브랜치 전략

```
main ─── KYW_0.1 (주 개발)
    └── JM (다크모드 기능)
```

### 💬 소통 방식

- **GitHub Issues**: 버그 및 기능 요청 관리
- **Pull Request**: 코드 리뷰 후 병합
- **TODO.md**: 작업 현황 실시간 공유

---

## 8. 느낀 점 및 향후 계획

### 💡 배운 점

1. **WebRTC의 복잡성**
   - 단순해 보이지만 ICE, STUN, 시그널링 등 이해 필요

2. **실시간 미디어 처리**
   - Canvas API와 Web Audio API의 강력함

3. **협업의 중요성**
   - 브랜치 전략과 코드 리뷰의 필요성

### 🚀 향후 계획 (추후 개선)

| 기능 | 설명 |
|------|------|
| TURN 서버 | NAT/방화벽 환경 지원 |
| 가상 배경 | TensorFlow.js BodyPix 활용 |
| 회의 녹화 | MediaRecorder API |
| 파일 전송 UI | 진행률, 취소 버튼 |

---

## 📎 참고 자료

- **GitHub**: [FN-Olofmeister/multimedia_final_teamproject](https://github.com/FN-Olofmeister/multimedia_final_teamproject)
- **WebRTC 공식 문서**: https://webrtc.org
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## 🙏 감사합니다!

### Q&A
