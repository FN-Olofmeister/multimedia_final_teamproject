# TODO.md - VideoNet Pro 작업 현황
작업, 이슈, 완료된 작업등 기록 및 최신화

> **마지막 업데이트**: 2025-11-27
> **현재 상태**: 개발 진행 중

---

## 🔴 P0 - 긴급 버그

### ~~이슈 1: 비활성 방(0/100)이 너무 많이 남아있음~~ ✅ 해결
- **원인**: 서버 재시작 시 메모리 초기화, 비정상 종료 시 DB 동기화 누락
- **해결**: 서버 시작 시 모든 방 inactive 초기화 + join_room에서 active 변경
- **수정 파일**: `backend/main.py` (startup), `backend/socketio_server.py` (join_room)

### ~~이슈 2: 방 생성 시 다른 사용자에게 실시간 반영 안됨~~ ✅ 해결
- **원인**: join_room에서 `notify_room_list_update()` 미호출
- **해결**: join_room에서도 알림 발송 + 대시보드 폴링 추가 (10초마다)
- **수정 파일**: `backend/socketio_server.py`, `frontend/src/pages/DashboardPage.tsx`

### ~~이슈 3: 방 재입장 시 카메라 검은색/연결중~~ ✅ 해결
- **원인**: cleanup에서 트랙 종료 후 재입장 시 스트림 재요청 안됨
- **해결**: 스트림 ended 상태 체크 + 초기화 조건 완화 + 트랙 상태 완전 초기화
- **수정 파일**: `frontend/src/pages/RoomPage.tsx`, `frontend/src/utils/webrtc-native.ts`

### ~~이슈 4: 한쪽 퇴장 시 상대편 카메라 검은화면~~ ✅ 해결
- **원인**: `user_left` 핸들러에서 participants 상태 클로저 문제, 재입장 시 기존 P2P 연결 미정리
- **해결**: `setParticipants` 콜백 사용 + 재입장 시 기존 연결 정리 후 새 P2P 생성
- **수정 파일**: `frontend/src/pages/RoomPage.tsx` (user_left, user_joined 핸들러)

### ~~이슈 5: 효과 적용 버튼 혼란 및 영상/오디오 효과 충돌~~ ✅ 해결
- **원인**: "영상 효과 적용"/"오디오 효과 적용" 버튼이 별도로 있어 혼란, 효과 적용 시 비디오/오디오 트랙 덮어쓰기
- **해결**: 모든 효과를 토글형으로 변경 (즉시 적용), 비디오/오디오 트랙 독립 처리, 적용 버튼 제거
- **수정 파일**: `frontend/src/components/WebcamEffects.tsx` (전면 재작성)

---

## 🟡 P1 - 중요 작업 (추후)

- [ ] TURN 서버 추가 (NAT 환경 지원)
- [ ] 파일 전송 UI 개선 (진행률, 취소)
- [ ] 에러 핸들링 강화

---

## 🟢 P2 - 개선사항 (추후)

- [ ] 채팅 고급 기능 (이모지, 드래그앤드롭)
- [ ] 사용자 프로필 (이미지, 닉네임)
- [ ] 회의 녹화 (MediaRecorder)
- [ ] 가상 배경 (TensorFlow.js BodyPix)

---

## ✅ 완료된 작업

### 2025-11-27 (이슈 수정 - 2차)
- [x] 이슈 4: user_left 핸들러 수정 (setParticipants 콜백으로 클로저 문제 해결)
- [x] 이슈 4: user_joined 핸들러 수정 (재입장 시 기존 P2P 정리 후 새 연결 생성)
- [x] 이슈 5: WebcamEffects.tsx 토글형으로 전면 재작성
- [x] 이슈 5: 비디오/오디오 효과 독립 처리 로직 구현 (processedVideoStreamRef, processedAudioStreamRef 분리)
- [x] 이슈 5: "영상 효과 적용", "오디오 효과 적용" 버튼 제거, 토글 시 즉시 적용

### 2025-11-27 (이슈 수정 - 1차)
- [x] 이슈 1: 서버 시작 시 모든 방 inactive 초기화 + join_room에서 active 변경
- [x] 이슈 2: join_room에서 room_list_updated 알림 + 대시보드 10초 폴링
- [x] 이슈 3: 스트림 ended 상태 체크 + cleanup 시 트랙 상태 완전 초기화
- [x] NativeWebRTCConnection에 peerConnection getter 추가

### 2025-11-27
- [x] 웹캠 실시간 효과 버그 수정 (video-effects.ts async, audio-effects.ts wetGain, replaceTrack)

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
- [x] 웹캠 실시간 효과 (영상+오디오)
- [x] 사용자 퇴장/재입장 시 화면 복구
- [x] 영상/오디오 효과 토글 즉시 적용
- [x] 영상+오디오 효과 동시 적용 (충돌 없음)

### ⚠️ 미테스트
- [ ] P2P 파일 전송 (대용량 >100MB)
- [ ] 동시 접속 (10명 이상)
- [ ] NAT/방화벽 환경
- [ ] 동영상 분석 (OpenAI API 키 필요)

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
