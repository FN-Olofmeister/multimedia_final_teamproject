# 웹캠 실시간 효과 기능 (Webcam Effects)

## 📌 개요

WebRTC 화상회의에서 **웹캠 비디오/오디오에 실시간 효과를 적용**하는 기능입니다.
모든 처리는 **클라이언트(브라우저)**에서 이루어지며, 효과가 적용된 스트림이 다른 참가자에게 전송됩니다.

**기술 스택:**
- Canvas API (영상 효과)
- Web Audio API (오디오 효과)
- MediaStream API (WebRTC 스트림 처리)

---

## 🎯 구현 기능 (난이도 순)

### ✅ 1단계: 영상 반전 효과 (예제1)
**난이도:** ⭐☆☆☆☆ (10분)

**기능:**
- 좌우 반전 (Horizontal Flip)
- 상하 반전 (Vertical Flip)

**구현 방법:**
```javascript
// Canvas 2D Context Transform
ctx.scale(-1, 1);  // 좌우 반전
ctx.scale(1, -1);  // 상하 반전
```

**사용 사례:**
- 화상회의 시 거울 모드
- 방향 교정

---

### ✅ 2단계: 전단 효과 (예제3)
**난이도:** ⭐⭐☆☆☆ (15분)

**기능:**
- 45도 전단 (Shear)
- 90도 전단

**구현 방법:**
```javascript
// Canvas Transform Matrix
ctx.transform(1, Math.tan(angle), 0, 1, 0, 0);  // X축 전단
ctx.transform(1, 0, Math.tan(angle), 1, 0, 0);  // Y축 전단
```

**사용 사례:**
- 창의적인 영상 효과
- 예술적 표현

---

### ✅ 3단계: 오디오 Low Pass Filter (예제1)
**난이도:** ⭐⭐☆☆☆ (20분)

**기능:**
- 저주파 통과 필터
- 주파수 조절 (100Hz ~ 10kHz)

**구현 방법:**
```javascript
// Web Audio API
const audioContext = new AudioContext();
const lowpassFilter = audioContext.createBiquadFilter();
lowpassFilter.type = 'lowpass';
lowpassFilter.frequency.value = 1000; // Hz
```

**사용 사례:**
- 배경 소음 제거
- 고음 차단
- 전화 통화 느낌

---

### ✅ 4단계: 음성 변조 효과 (예제4)
**난이도:** ⭐⭐⭐☆☆ (30분)

**기능:**
- 음정 변조 (Pitch Shift): -12 ~ +12 반음
- 에코 효과 (Echo/Delay)
- 리버브 효과 (Reverb)

**구현 방법:**
```javascript
// Pitch Shift (Web Audio API + AudioWorklet)
// Echo (DelayNode + GainNode)
const delay = audioContext.createDelay();
delay.delayTime.value = 0.3; // 300ms

// Reverb (ConvolverNode)
const convolver = audioContext.createConvolver();
convolver.buffer = impulseResponse;
```

**사용 사례:**
- 목소리 변조 (익명성)
- 재미있는 효과
- 가수 연습용

---

### ✅ 5단계: AI 렌더링 필터 (예제5)
**난이도:** ⭐⭐⭐⭐☆ (40분)

**기능:**
- 흑백 (Grayscale)
- 세피아 (Sepia)
- 블러 (Gaussian Blur)
- 엣지 감지 (Edge Detection)
- 카툰 효과 (Cartoon/Posterize)
- 네온 효과 (Neon)

**구현 방법:**
```javascript
// Canvas ImageData 픽셀 조작
const imageData = ctx.getImageData(0, 0, width, height);
const data = imageData.data;

// 흑백 변환
for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i+1] + data[i+2]) / 3;
  data[i] = data[i+1] = data[i+2] = avg;
}

ctx.putImageData(imageData, 0, 0);
```

**사용 사례:**
- Instagram 스타일 필터
- 예술적 표현
- 배경 흐림 (가상 배경)

---

## 🏗️ 아키텍처

### 전체 흐름

```
[사용자 웹캠]
      ↓
getUserMedia() → [원본 MediaStream]
      ↓
┌─────────────────────────────────┐
│   WebcamEffects.tsx             │
│   ┌──────────────────────────┐  │
│   │ Canvas Video Processor   │  │
│   │ - 프레임 캡처            │  │
│   │ - 효과 적용 (반전, 전단) │  │
│   │ - 필터 처리              │  │
│   └──────────────────────────┘  │
│   ┌──────────────────────────┐  │
│   │ Web Audio Processor      │  │
│   │ - Low Pass Filter        │  │
│   │ - Pitch Shift            │  │
│   │ - Echo/Reverb            │  │
│   └──────────────────────────┘  │
└─────────────────────────────────┘
      ↓
[효과 적용된 MediaStream]
      ↓
WebRTC PeerConnection → [다른 참가자]
```

### 파일 구조

```
frontend/src/
├── components/
│   ├── WebcamEffects.tsx          (새로 생성) - UI 모달
│   └── WebcamCompression.tsx      (기존) - 압축 품질
├── utils/
│   ├── video-effects.ts           (새로 생성) - 영상 효과 처리
│   └── audio-effects.ts           (새로 생성) - 오디오 효과 처리
└── pages/
    └── RoomPage.tsx               (수정) - 버튼 추가
```

---

## 🎨 UI 디자인

### 버튼 위치
RoomPage.tsx 하단 컨트롤 바에 "🎬 영상 효과" 버튼 추가

### 모달 UI (WebcamEffects.tsx)
```
┌─────────────────────────────────────────┐
│ 🎬 실시간 영상/오디오 효과         [X]  │
├─────────────────────────────────────────┤
│ 📹 영상 효과                            │
│ ☐ 좌우 반전                             │
│ ☐ 상하 반전                             │
│ ☐ 45도 전단 효과                        │
│ ☐ 90도 전단 효과                        │
│                                         │
│ 🎨 필터 효과                            │
│ [선택: 없음 ▼]                          │
│   - 흑백                                │
│   - 세피아                              │
│   - 블러                                │
│                                         │
│ 🎵 오디오 효과                          │
│ ☐ Low Pass Filter                      │
│   주파수: [━━━━●──────] 1000 Hz         │
│ ☐ 음정 변조                             │
│   반음: [────●────] 0                  │
│ ☐ 에코 효과                             │
│   딜레이: [━━●────────] 300 ms          │
│                                         │
│ [모든 효과 초기화]                      │
└─────────────────────────────────────────┘
```

---

## 📊 예상 소요시간

| 작업 | 시간 |
|------|------|
| 문서 작성 | 30분 ✅ |
| video-effects.ts | 40분 |
| audio-effects.ts | 40분 |
| WebcamEffects.tsx UI | 30분 |
| RoomPage.tsx 통합 | 20분 |
| 테스트 및 디버깅 | 30분 |
| **총계** | **약 3시간** |

---

## 🔧 구현 핵심 코드 스니펫

### video-effects.ts (핵심 부분)
```typescript
export class VideoEffectProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effects = {
    flipH: false,
    flipV: false,
    shear45: false,
    shear90: false,
    filter: 'none'
  };

  processStream(inputStream: MediaStream): MediaStream {
    // Canvas로 비디오 처리
    // 효과 적용
    // MediaStream 반환
    return this.canvas.captureStream(30);
  }

  applyTransforms() {
    if (this.effects.flipH) this.ctx.scale(-1, 1);
    if (this.effects.flipV) this.ctx.scale(1, -1);
    if (this.effects.shear45) {
      this.ctx.transform(1, Math.tan(Math.PI / 4), 0, 1, 0, 0);
    }
  }
}
```

### audio-effects.ts (핵심 부분)
```typescript
export class AudioEffectProcessor {
  private audioContext: AudioContext;
  private lowpassFilter: BiquadFilterNode;
  private delayNode: DelayNode;

  processStream(inputStream: MediaStream): MediaStream {
    // Web Audio API로 효과 적용
    // 필터 체인 연결
    return this.destinationNode.stream;
  }

  connectNodes() {
    // Low Pass Filter
    if (this.effects.lowpass) {
      this.lowpassFilter.frequency.value = this.effects.lowpassFreq;
      currentNode.connect(this.lowpassFilter);
    }
    // Echo
    if (this.effects.echo) {
      this.delayNode.delayTime.value = this.effects.echoDelay;
    }
  }
}
```

---

## ✅ 구현 체크리스트

- [x] 기술 문서 작성
- [ ] Git 커밋 & 푸시
- [ ] video-effects.ts 구현
- [ ] audio-effects.ts 구현
- [ ] WebcamEffects.tsx UI 구현
- [ ] RoomPage.tsx 통합
- [ ] 테스트 완료

---

## 📚 참고 자료

### MDN 문서
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaStream API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API)

### 구현 예제
- Canvas Transform: 반전 및 전단 효과
- Web Audio: 필터 및 이펙트 체인
- MediaStream: 실시간 스트림 처리

---

**작성일**: 2025-11-26
**작성자**: 김재형 (20205146)
**버전**: 1.0.0
