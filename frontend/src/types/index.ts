/**
 * 타입 정의 파일 - 전체 애플리케이션에서 사용되는 타입들
 * TypeScript를 사용해서 코드의 안정성을 높입니다
 */

// 사용자 정보 타입
export interface User {
  id: string;                  // 사용자 고유 ID
  username: string;             // 사용자 이름
  email: string;                // 이메일 주소
  personalCode: string;         // 개인 참가 코드
  avatar?: string;              // 아바타 이미지 URL (선택사항)
  isOnline: boolean;            // 온라인 상태
  createdAt: string;            // 계정 생성 시간
}

// 로그인 요청 타입
export interface LoginRequest {
  email: string;                // 이메일
  password: string;             // 비밀번호
}

// 회원가입 요청 타입
export interface RegisterRequest {
  username: string;             // 사용자 이름
  email: string;                // 이메일
  password: string;             // 비밀번호
  inviteCode: string;           // 초대 코드 (필수!)
}

// 인증 응답 타입
export interface AuthResponse {
  access_token: string;         // JWT 액세스 토큰
  user: User;                   // 사용자 정보
}

// 방(Room) 정보 타입
export interface Room {
  id: string;                   // 방 ID
  name: string;                 // 방 이름
  hostId: string;               // 방장 ID
  participants: Participant[];  // 참가자 목록
  isPrivate: boolean;           // 비공개 방 여부
  maxParticipants: number;      // 최대 참가자 수
  createdAt: string;            // 생성 시간
}

// 참가자 정보 타입
export interface Participant {
  userId: string;               // 사용자 ID
  username: string;             // 사용자 이름
  avatar?: string;              // 아바타
  isMuted: boolean;             // 마이크 음소거 상태
  isVideoOff: boolean;          // 비디오 끄기 상태
  isScreenSharing: boolean;     // 화면 공유 상태
  isSpeaking: boolean;          // 말하는 중 상태
  joinedAt: string;             // 참가 시간
}

// 채팅 메시지 타입
export interface ChatMessage {
  id: string;                   // 메시지 ID
  roomId: string;               // 방 ID
  userId: string;               // 보낸 사용자 ID
  username: string;             // 보낸 사용자 이름
  avatar?: string;              // 아바타
  content: string;              // 메시지 내용
  timestamp: string;            // 전송 시간
  isSystem?: boolean;           // 시스템 메시지 여부
}

// WebRTC 연결 상태 타입
export type ConnectionState = 
  | 'new'                       // 새 연결
  | 'connecting'                // 연결 중
  | 'connected'                 // 연결됨
  | 'disconnected'              // 연결 끊김
  | 'failed'                    // 연결 실패
  | 'closed';                   // 연결 종료

// 미디어 스트림 타입
export interface MediaStream {
  stream: MediaStream;          // 실제 미디어 스트림
  userId: string;               // 스트림 소유자 ID
  type: 'local' | 'remote';     // 로컬/원격 구분
  isVideo: boolean;             // 비디오 포함 여부
  isAudio: boolean;             // 오디오 포함 여부
}

// Socket 이벤트 타입들
export interface SocketEvents {
  // 연결 관련
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: string) => void;

  // 방 관련
  'room:join': (data: { roomId: string; user: User }) => void;
  'room:leave': (data: { roomId: string; userId: string }) => void;
  'room:update': (room: Room) => void;

  // 채팅 관련
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (data: { userId: string; isTyping: boolean }) => void;

  // WebRTC 시그널링
  'webrtc:offer': (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc:answer': (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit }) => void;

  // 미디어 컨트롤
  'media:toggle-audio': (data: { userId: string; isMuted: boolean }) => void;
  'media:toggle-video': (data: { userId: string; isVideoOff: boolean }) => void;
  'media:screen-share': (data: { userId: string; isSharing: boolean }) => void;
}

// API 에러 응답 타입
export interface ApiError {
  error: string;                // 에러 메시지
  detail?: string;              // 상세 정보
  status?: number;              // HTTP 상태 코드
}

// 토스트 알림 타입
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;                   // 토스트 ID
  type: ToastType;              // 토스트 타입
  message: string;              // 메시지
  duration?: number;            // 표시 시간 (ms)
}