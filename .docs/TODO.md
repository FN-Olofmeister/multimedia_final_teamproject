# TODO.md - VideoNet Pro 작업 현황

> **마지막 업데이트**: 2025-11-27
> **현재 상태**: 개발 진행 중

---

## 🔴 P0 - 긴급 버그 (즉시 수정 필요)

### 🎬 웹캠 실시간 효과 버그 수정

**증상:**
1. 영상 효과 적용 시 카메라가 "연결중..."으로만 표시됨 (영상이 안 보임)
2. 오디오 효과가 실제로 적용되지 않음 (소리 변화 없음)

**원인 분석:**
1. **영상 효과**: `VideoEffectProcessor.processStream()`에서 `onloadedmetadata` 이벤트가 비동기로 발생하는데, 스트림 반환 시점에 Canvas 크기가 0×0이라 빈 스트림 반환
2. **오디오 효과**: `AudioEffectProcessor`에서 dry/wet 믹스의 wetGain이 0.0으로 설정되어 효과음이 들리지 않음
3. **스트림 교체**: P2P 연결에서 트랙 교체 시 renegotiation이 필요한데 처리 안 됨

---

### 📋 수정 작업 체크리스트

#### Step 1: video-effects.ts 수정
**파일**: `frontend/src/utils/video-effects.ts`

- [ ] **1-1. processStream을 async/await로 변경**
  ```typescript
  // 변경 전
  public processStream(inputStream: MediaStream): MediaStream
  
  // 변경 후  
  public async processStream(inputStream: MediaStream): Promise<MediaStream>
  ```

- [ ] **1-2. 비디오 메타데이터 로드 대기 추가**
  ```typescript
  // onloadedmetadata 대신 Promise로 대기
  await new Promise<void>((resolve) => {
    this.videoElement.onloadedmetadata = () => {
      this.canvas.width = this.videoElement.videoWidth || 640;
      this.canvas.height = this.videoElement.videoHeight || 480;
      resolve();
    };
  });
  
  // play() 호출 추가
  await this.videoElement.play();
  ```

- [ ] **1-3. 기본 Canvas 크기 설정 (fallback)**
  ```typescript
  // 비디오 크기가 0인 경우 기본값 사용
  if (this.canvas.width === 0 || this.canvas.height === 0) {
    this.canvas.width = 640;
    this.canvas.height = 480;
  }
  ```

---

#### Step 2: audio-effects.ts 수정
**파일**: `frontend/src/utils/audio-effects.ts`

- [ ] **2-1. wetGain 초기값 수정**
  ```typescript
  // 변경 전
  this.wetGain.gain.value = 0.0;
  
  // 변경 후
  this.wetGain.gain.value = 0.5; // 효과음이 들리도록
  ```

- [ ] **2-2. 효과 비활성화 시 bypass 처리**
  ```typescript
  // 효과가 모두 꺼져있으면 직접 연결
  if (!this.effects.lowpass && !this.effects.echo && !this.effects.reverb) {
    this.sourceNode.connect(this.destinationNode);
    return;
  }
  ```

- [ ] **2-3. echo/reverb 동시 활성화 처리**
  ```typescript
  // 현재: echo OR reverb (else if)
  // 변경: echo AND reverb 동시 지원
  ```

---

#### Step 3: WebcamEffects.tsx 수정
**파일**: `frontend/src/components/WebcamEffects.tsx`

- [ ] **3-1. applyVideoEffects를 async로 수정**
  ```typescript
  // processStream이 Promise를 반환하므로 await 필요
  const processedStream = await processor.processStream(localStream);
  ```

- [ ] **3-2. 원본 스트림 보존 로직 개선**
  ```typescript
  // 원본 스트림 clone하여 보존
  if (localStream && !originalStreamRef.current) {
    originalStreamRef.current = localStream.clone();
  }
  ```

- [ ] **3-3. 효과 적용 후 미리보기 추가** (선택)
  ```typescript
  // 모달 내에 작은 비디오 프리뷰 추가
  <video ref={previewRef} autoPlay muted className="w-48 h-36" />
  ```

---

#### Step 4: RoomPage.tsx 스트림 교체 로직 수정
**파일**: `frontend/src/pages/RoomPage.tsx`

- [ ] **4-1. replaceTrack 사용으로 변경**
  ```typescript
  // 변경 전: removeTrack + addTrack (renegotiation 필요)
  // 변경 후: replaceTrack 사용 (renegotiation 불필요)
  
  const senders = connection.peerConnection?.getSenders() || [];
  newStream.getTracks().forEach(newTrack => {
    const sender = senders.find(s => s.track?.kind === newTrack.kind);
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  });
  ```

- [ ] **4-2. 로컬 비디오 muted 확인**
  ```typescript
  // 로컬 비디오는 항상 muted (하울링 방지)
  if (localVideoRef.current) {
    localVideoRef.current.srcObject = newStream;
    localVideoRef.current.muted = true;
  }
  ```

---

#### Step 5: 테스트
- [ ] **5-1. 영상 효과 테스트**
  - 좌우 반전 → 화면에 반영되는지 확인
  - 흑백 필터 → 흑백으로 보이는지 확인
  - 네온 필터 → 색상 반전되는지 확인

- [ ] **5-2. 오디오 효과 테스트**
  - Low Pass Filter → 고음이 줄어드는지 확인
  - Echo → 메아리 들리는지 확인
  - Reverb → 잔향 들리는지 확인

- [ ] **5-3. P2P 전송 테스트**
  - 2개 브라우저 탭에서 효과 적용 후 상대방에게 보이는지 확인

---

### 예상 소요 시간
| 작업 | 시간 |
|------|------|
| Step 1: video-effects.ts | 20분 |
| Step 2: audio-effects.ts | 20분 |
| Step 3: WebcamEffects.tsx | 15분 |
| Step 4: RoomPage.tsx | 15분 |
| Step 5: 테스트 | 20분 |
| **총계** | **약 1시간 30분** |

---

## 🟡 P1 - 중요 작업 (1주일 내)

### 1. WebRTC 연결 안정화
- [ ] TURN 서버 추가 (coturn 또는 Twilio)
- [ ] ICE 연결 실패 시 재시도 로직
- [ ] NAT/방화벽 환경 테스트

### 2. 파일 전송 UI 개선
- [ ] 상세 진행률 바
- [ ] 전송 속도/남은 시간 표시
- [ ] 취소 버튼

### 3. 에러 핸들링 강화
- [ ] 전역 에러 핸들러 (프론트엔드)
- [ ] API 에러 응답 표준화 (백엔드)
- [ ] 사용자 친화적 에러 메시지

---

## 🟢 P2 - 개선사항 (1개월 이상)

### 4. 채팅 고급 기능
- [ ] 이모지 피커
- [ ] 파일 드래그 앤 드롭
- [ ] 읽음 확인

### 5. 사용자 프로필
- [ ] 프로필 이미지 업로드
- [ ] 닉네임 변경
- [ ] 온라인/오프라인 표시

### 6. 회의 녹화
- [ ] MediaRecorder API 통합
- [ ] 서버 측 저장
- [ ] 다운로드 기능

### 7. 가상 배경
- [ ] TensorFlow.js BodyPix 통합
- [ ] 배경 분리
- [ ] 이미지/동영상 배경 교체

---

## ✅ 완료된 작업

### 2025-11-26
- [x] 웹캠 실시간 효과 기능 (영상 반전, 전단, AI 필터, 오디오 효과)
- [x] 압축 품질 조절 및 PSNR/SSIM 시각화

### 2025-11-25
- [x] Socket.IO 중복 연결 문제 해결
- [x] 방 리스트 실시간 업데이트
- [x] 참가자 수 동기화
- [x] 빈 방 자동 삭제
- [x] Windows cp949 인코딩 문제 수정
- [x] Socket.IO 이벤트 이름 통일 (media_toggle, chat_message)
- [x] WebRTC signaling state 검증 추가

---

## 🧪 테스트 현황

### ✅ 테스트 완료
- [x] 회원가입/로그인
- [x] 방 생성/입장
- [x] WebRTC 연결 (1-4명)
- [x] 오디오/비디오 토글
- [x] 채팅 메시지
- [x] 화면 공유
- [x] 웹캠 압축 분석
- [x] 방 리스트 실시간 업데이트

### ⚠️ 미테스트
- [ ] P2P 파일 전송 (대용량 >100MB)
- [ ] 동시 접속 (10명 이상)
- [ ] NAT/방화벽 환경
- [ ] 동영상 분석 (OpenAI API 키 필요)
- [ ] 웹캠 실시간 효과 (브라우저 테스트)

---

## 📝 작업 시 주의사항

### 반드시 지켜야 할 규칙
1. **목업 데이터 절대 금지** - 실제 동작하는 코드만
2. **Raw SQL 사용** - SQLAlchemy ORM 금지
3. **camelCase 매핑** - API 응답 시 프론트엔드 규칙 준수
4. **이 문서 업데이트** - 작업 완료 후 반드시 기록

### 서버 실행 방법
```bash
# 백엔드
cd backend
python run.py

# 프론트엔드
cd frontend
npm run dev
```

---

**참고**: 자세한 개발 가이드는 `.docs/CLAUDE.md` 참조
