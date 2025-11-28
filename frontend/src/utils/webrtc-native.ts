/**
 * Native WebRTC 구현 - SimplePeer 없이 순수 WebRTC API 사용
 * 브라우저 호환성 문제 해결을 위한 대체 구현
 */

import type { ConnectionState } from '@/types';

// WebRTC 설정
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Native WebRTC 연결 관리 클래스
 */
export class NativeWebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private connectionState: ConnectionState = 'new';
  
  // 콜백 함수들
  private onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  private onStream: ((stream: MediaStream) => void) | null = null;
  private onClose: (() => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  constructor(
    private readonly userId: string,
    private readonly isInitiator: boolean
  ) {}

  /**
   * 로컬 미디어 스트림 가져오기 (실제 미디어만 사용)
   */
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      // 실제 미디어 장치만 사용 (더미 스트림 사용하지 않음)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user' // 전면 카메라 우선
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      console.log('로컬 미디어 스트림 획득 성공');
      return this.localStream;
    } catch (error: any) {
      console.error('미디어 스트림 획득 실패:', error);
      
      // 구체적인 에러 메시지
      let errorMessage = '카메라 또는 마이크에 접근할 수 없습니다.';
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라/마이크 권한이 거부되었습니다.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라 또는 마이크를 찾을 수 없습니다.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '카메라/마이크가 다른 프로그램에서 사용 중입니다.';
      }
      
      throw new Error(errorMessage);
    }
  }


  /**
   * P2P 연결 시작
   * @param localStream - 외부에서 전달받은 로컬 스트림 (선택적)
   */
  async connect(localStream?: MediaStream): Promise<void> {
    try {
      // RTCPeerConnection 생성
      this.pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      // 이벤트 핸들러 설정
      this.setupPeerConnectionEvents();

      // 로컬 스트림 추가
      const stream = localStream || await this.getLocalStream();
      this.localStream = stream;
      
      stream.getTracks().forEach(track => {
        this.pc!.addTrack(track, stream);
      });

      this.connectionState = 'connecting';
      console.log(`WebRTC 연결 시작 (initiator: ${this.isInitiator})`);

      // Initiator인 경우 offer 생성
      if (this.isInitiator) {
        await this.createOffer();
      }
    } catch (error) {
      console.error('P2P 연결 시작 실패:', error);
      this.connectionState = 'failed';
      throw error;
    }
  }

  /**
   * Peer Connection 이벤트 설정
   */
  private setupPeerConnectionEvents(): void {
    if (!this.pc) return;

    // ICE candidate 이벤트
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate 생성');
        this.onIceCandidate?.(event.candidate.toJSON());
      }
    };

    // 원격 스트림 수신
    this.pc.ontrack = (event) => {
      console.log('원격 트랙 수신');
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onStream?.(this.remoteStream);
      }
      this.remoteStream.addTrack(event.track);
    };

    // 연결 상태 변경
    this.pc.onconnectionstatechange = () => {
      console.log('연결 상태:', this.pc?.connectionState);
      
      switch (this.pc?.connectionState) {
        case 'connected':
          this.connectionState = 'connected';
          break;
        case 'disconnected':
        case 'closed':
          this.connectionState = 'closed';
          this.cleanup();
          this.onClose?.();
          break;
        case 'failed':
          this.connectionState = 'failed';
          this.onError?.(new Error('WebRTC 연결 실패'));
          break;
      }
    };
  }

  /**
   * Offer 생성 (연결 시작자)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection이 없습니다');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    console.log('Offer 생성 완료');
    
    return offer;
  }

  /**
   * Answer 생성 (연결 수신자)
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection이 없습니다');

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    console.log('Answer 생성 완료');
    
    return answer;
  }

  /**
   * 원격 SDP 설정
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection이 없습니다');

    await this.pc.setRemoteDescription(description);
    console.log('원격 SDP 설정 완료:', description.type);
  }

  /**
   * ICE Candidate 추가
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection이 없습니다');

    await this.pc.addIceCandidate(candidate);
    console.log('ICE candidate 추가 완료');
  }

  /**
   * 마이크 켜기/끄기
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`마이크 ${enabled ? '켜짐' : '꺼짐'}`);
    }
  }

  /**
   * 비디오 켜기/끄기
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`비디오 ${enabled ? '켜짐' : '꺼짐'}`);
    }
  }

  /**
   * 화면 공유 토글
   * @param enabled - true면 화면 공유 시작, false면 원래 비디오로 복구
   * @param screenTrack - 화면 공유 트랙 (enabled가 true일 때)
   * @param originalTrack - 원래 비디오 트랙 (enabled가 false일 때)
   */
  async toggleScreenShare(enabled: boolean, screenTrack?: MediaStreamTrack, originalTrack?: MediaStreamTrack): Promise<void> {
    if (!this.pc) return;

    try {
      const sender = this.pc.getSenders().find(
        s => s.track?.kind === 'video'
      );

      if (!sender) {
        console.error('비디오 sender를 찾을 수 없습니다');
        return;
      }

      if (enabled && screenTrack) {
        // 화면 공유 트랙으로 교체
        await sender.replaceTrack(screenTrack);
        console.log('P2P 연결에 화면 공유 트랙 설정');
      } else if (!enabled && originalTrack) {
        // 원래 비디오 트랙으로 복구
        await sender.replaceTrack(originalTrack);
        console.log('P2P 연결에 원래 비디오 트랙 복구');
      } else if (!enabled && this.localStream) {
        // originalTrack이 없으면 localStream에서 가져오기
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await sender.replaceTrack(videoTrack);
          console.log('P2P 연결에 로컬 비디오 트랙 복구');
        }
      }
    } catch (error) {
      console.error('화면 공유 토글 실패:', error);
      throw error;
    }
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    this.cleanup();
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    // Peer 연결 종료
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // 로컬 스트림 종료
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 원격 스트림 정리
    this.remoteStream = null;
    this.connectionState = 'closed';
    
    console.log('WebRTC 리소스 정리 완료');
  }

  // 콜백 설정 메서드들
  setOnIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    this.onIceCandidate = callback;
  }

  setOnStream(callback: (stream: MediaStream) => void): void {
    this.onStream = callback;
  }

  setOnClose(callback: () => void): void {
    this.onClose = callback;
  }

  setOnError(callback: (err: Error) => void): void {
    this.onError = callback;
  }

  // Getter 메서드들
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getSignalingState(): RTCSignalingState {
    return this.pc?.signalingState || 'closed';
  }

  getCurrentLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  getSenders(): RTCRtpSender[] {
    return this.pc?.getSenders() ?? [];
  }
}