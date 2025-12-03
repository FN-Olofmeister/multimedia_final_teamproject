/**
 * 화상회의 룸 페이지 - WebRTC 비디오 컨퍼런싱
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  CogIcon,
  ArrowLeftIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  MicrophoneIcon as MicrophoneOutlineIcon,
  VideoCameraIcon as VideoCameraOutlineIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSolidIcon,
  VideoCameraIcon as VideoCameraSolidIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { NativeWebRTCConnection } from '@/utils/webrtc-native';
import { roomApi } from '@/utils/api';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import FileTransfer from '@/components/FileTransfer';
import WebcamCompression from '@/components/WebcamCompression';
import WebcamEffects from '@/components/WebcamEffects';
import { createSocket } from "@/utils/socket";

interface VideoStream {
  userId: string;
  username: string;
  stream: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, theme } = useAuth();
  const navigate = useNavigate();

  // 상태 관리
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'file'>('chat'); // 채팅/파일 탭
  const [participants, setParticipants] = useState<VideoStream[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentVideoTrack, setCurrentVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [originalVideoTrack, setOriginalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [showWebcamCompression, setShowWebcamCompression] = useState(false);
  const [showWebcamEffects, setShowWebcamEffects] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const connectionsRef = useRef<Map<string, NativeWebRTCConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  // ✅ 참가자 정보 저장 (username 등) - 연결 전에 정보를 알기 위함
  const participantInfoRef = useRef<Map<string, { username: string; userInfo: any }>>(new Map());

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (!roomId || !user) return;

    // 이미 초기화되었고 소켓 연결이 활성 상태면 스킵
    // (이슈 3: 재입장 시에도 초기화 되도록 조건 완화 - 스트림이 없거나 ended면 재초기화)
    const hasActiveStream = localStreamRef.current && 
      localStreamRef.current.getVideoTracks().some(t => t.readyState === 'live');
    
    if (socketRef.current?.connected && hasActiveStream) {
      console.log('Socket connected and stream active, skipping initialization');
      return;
    }

    initializeRoom();

    return () => {
      cleanup();
    };
  }, [roomId, user?.id]); // user 대신 user?.id로 변경하여 안정적인 참조 사용

  // 미디어 권한 요청 및 스트림 획득
  const requestMediaPermissions = async (): Promise<MediaStream | null> => {
    try {
      // 기존 스트림이 있고 ended 상태가 아니면 재사용
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        
        // 트랙이 살아있는지 확인 (이슈 3 해결)
        const videoAlive = videoTrack && videoTrack.readyState === 'live';
        const audioAlive = audioTrack && audioTrack.readyState === 'live';
        
        if (videoAlive && audioAlive) {
          console.log('[Media] 기존 스트림 재사용');
          return localStreamRef.current;
        } else {
          console.log('[Media] 기존 스트림이 ended 상태, 새로 요청');
          // 기존 스트림 정리
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
      }

      // 먼저 권한 상태 확인
      const permissions = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName })
      ]).catch(() => [null, null]);

      // 권한 요청 UI 표시
      if (permissions.some(p => p?.state === 'prompt')) {
        toast('카메라와 마이크 사용 권한을 요청합니다. 허용해주세요.', {
          icon: 'ℹ️',
        });
      }

      // 실제 미디어 스트림 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'  // 전면 카메라 우선
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true, 
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      toast.success('카메라와 마이크가 연결되었습니다');
      return stream;
    } catch (error: any) {
      console.error('미디어 장치 접근 실패:', error);
      
      // 에러 타입에 따른 메시지
      if (error.name === 'NotAllowedError') {
        toast.error('카메라/마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
      } else if (error.name === 'NotFoundError') {
        toast.error('카메라 또는 마이크를 찾을 수 없습니다. 장치를 연결해주세요.');
      } else if (error.name === 'NotReadableError') {
        toast.error('카메라/마이크가 이미 다른 프로그램에서 사용 중입니다.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('요청한 카메라 설정을 지원하지 않습니다.');
      } else {
        toast.error('미디어 장치 접근에 실패했습니다: ' + error.message);
      }
      
      return null;
    }
  };

  // 룸 초기화
  const initializeRoom = async () => {
    try {
      // 실제 미디어 스트림 요청 (더미 사용하지 않음)
      const stream = await requestMediaPermissions();
      
      if (!stream) {
        // 미디어를 가져올 수 없으면 회의 참가 불가
        toast.error('카메라와 마이크 없이는 회의에 참가할 수 없습니다');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }
      
      localStreamRef.current = stream;
      
      // 원본 비디오 트랙 저장
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setCurrentVideoTrack(videoTrack);
        setOriginalVideoTrack(videoTrack);
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Socket.IO 연결
      connectSocket();
      
      toast.success('회의에 참가했습니다');
    } catch (error) {
      console.error('회의 초기화 실패:', error);
      toast.error('회의 참가에 실패했습니다');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  // Socket.IO 연결
  const connectSocket = () => {
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    socketRef.current = createSocket(localStorage.getItem("token"));
    const socket = socketRef.current;

    // ✅ connect 이벤트 (중복 제거됨)
    socket.on("connect", () => {
      console.log("✅ Socket.IO 연결 성공, Socket ID:", socket.id);
      socketIdRef.current = socket.id;

      socket.emit("join_room", {
        roomId,
        userInfo: { id: user?.id, username: user?.username, email: user?.email },
      });
    });

    // 단일 connect_error 핸들러
    socket.on("connect_error", (error: any) => {
      console.error("❌ Socket.IO 연결 에러:", error);
      toast.error("WebSocket 연결에 실패했습니다");
    });

    // 새 사용자 참가 - initiator 역할을 socketId 정렬로 결정
    socket.on('user_joined', ({ userId, userInfo }: any) => {
      console.log('[user_joined] 새 사용자 참가:', userInfo?.username, 'userId:', userId, 'myId:', socketIdRef.current);

      if (!socketIdRef.current) return;

      // 자기 자신이 아닌 경우에만 처리
      if (userId && userId !== socketIdRef.current) {
        toast(`${userInfo?.username}님이 참가했습니다`, { icon: '👋' });

        // 참가자 정보 저장
        participantInfoRef.current.set(userId, { username: userInfo?.username || 'User', userInfo });

        // 기존 연결이 있으면 정리 (재입장 케이스)
        const existingConnection = connectionsRef.current.get(userId);
        if (existingConnection) {
          console.log('[user_joined] 기존 연결 정리:', userId);
          existingConnection.disconnect();
          connectionsRef.current.delete(userId);
          setParticipants(prev => prev.filter(p => p.userId !== userId));
        }

        // ✅ socketId 비교로 initiator 결정 (일관성 보장)
        const myId = socketIdRef.current;
        const isInitiator = myId < userId;
        console.log(`[user_joined] initiator 결정: myId(${myId}) < userId(${userId}) = ${isInitiator}`);

        createPeerConnection(userId, userInfo?.username || 'User', isInitiator);
      }
    });

    // ✅ 현재 참가자 목록 수신 - 참가자 정보만 저장 (연결은 user_joined 이벤트로 시작)
    socket.on('current_participants', (participantsList: any[]) => {
      console.log('[current_participants] 현재 참가자 목록:', participantsList?.length || 0, '명');

      if (participantsList && participantsList.length > 0) {
        participantsList.forEach(({ userId, userInfo }) => {
          if (userId && userId !== socketIdRef.current) {
            console.log(`[current_participants] 기존 참가자 정보 저장: ${userInfo?.username} (${userId})`);
            // 참가자 정보만 저장 (연결은 기존 참가자들이 user_joined 이벤트를 받아 시작)
            participantInfoRef.current.set(userId, { username: userInfo?.username || 'User', userInfo });
          }
        });
      }
    });

    // ✅ 사용자 나감 - 해당 사용자 연결만 정리 (다른 연결에 영향 없음)
    socket.on('user_left', ({ userId }: any) => {
      console.log('[user_left] 사용자 나감:', userId);
      
      if (userId && userId !== socketIdRef.current) {
        // 참가자 정보 가져오기 및 삭제
        const info = participantInfoRef.current.get(userId);
        participantInfoRef.current.delete(userId);
        
        // ✅ P2P 연결 정리 (먼저 정리)
        const connection = connectionsRef.current.get(userId);
        if (connection) {
          console.log('[user_left] P2P 연결 정리:', userId);
          connection.setOnClose(() => {}); // 콜백 제거
          connection.disconnect();
          connectionsRef.current.delete(userId);
        }
        
        // ✅ toast를 setParticipants 밖으로 이동 (React 렌더링 경고 방지)
        const username = info?.username || 'User';
        setTimeout(() => {
          toast(`${username}님이 나갔습니다`, { icon: '👋' });
        }, 0);
        
        // 참가자 목록에서 제거
        setParticipants(prev => prev.filter(p => p.userId !== userId));
      }
    });

    // WebRTC 시그널링
    socket.on('webrtc_offer', ({ from, offer }: any) => {
      console.log('[webrtc_offer] Offer 수신:', from);
      handleWebRTCOffer(from, offer);
    });

    socket.on('webrtc_answer', ({ from, answer }: any) => {
      console.log('[webrtc_answer] Answer 수신:', from);
      handleWebRTCAnswer(from, answer);
    });

    socket.on('webrtc_ice_candidate', ({ from, candidate }: any) => {
      handleWebRTCIceCandidate(from, candidate);
    });

    // 채팅 메시지
    socket.on('chat_message', (message: any) => {
      setMessages(prev => [...prev, message]);
    });
  };

  // ✅ P2P 연결 생성 (단순화됨)
  const createPeerConnection = async (userId: string, username: string, isInitiator: boolean) => {
    // 이미 연결이 있으면 스킵
    if (connectionsRef.current.has(userId)) {
      console.log(`[createPeerConnection] 이미 연결 존재: ${userId}, 스킵`);
      return;
    }

    console.log(`[createPeerConnection] 새 연결 생성: ${username} (${userId}), initiator: ${isInitiator}`);
    
    const connection = new NativeWebRTCConnection(userId, isInitiator);
    
    // ICE candidate 콜백
    connection.setOnIceCandidate((candidate) => {
      socketRef.current?.emit('webrtc_ice_candidate', {
        to: userId,
        candidate,
      });
    });

    // 원격 스트림 수신 콜백
    connection.setOnStream((stream) => {
      console.log(`[createPeerConnection] 원격 스트림 수신: ${username} (${userId})`);
      setParticipants(prev => {
        const filtered = prev.filter(p => p.userId !== userId);
        return [...filtered, { userId, username, stream, isMuted: false, isVideoOff: false }];
      });
    });

    // 연결 종료 콜백 (user_left에서 처리하므로 여기선 최소한만)
    connection.setOnClose(() => {
      console.log(`[createPeerConnection] 연결 종료 콜백: ${userId}`);
      // 연결 정리는 user_left에서 처리하므로 여기선 참조만 정리
      connectionsRef.current.delete(userId);
    });

    // 연결 초기화 (offer는 생성하지 않음)
    await connection.connect(localStreamRef.current || undefined);
    connectionsRef.current.set(userId, connection);

    // ✅ Initiator인 경우에만 offer 생성 및 전송
    if (isInitiator) {
      try {
        const offer = await connection.createOffer();
        socketRef.current?.emit('webrtc_offer', {
          to: userId,
          offer,
        });
        console.log(`[createPeerConnection] Offer 전송 완료: ${userId}`);
      } catch (error) {
        console.error(`[createPeerConnection] Offer 생성 실패:`, error);
      }
    }
  };

  // ✅ WebRTC offer 처리 (Polite Peer 패턴)
  const handleWebRTCOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      let connection = connectionsRef.current.get(from);
      const participantInfo = participantInfoRef.current.get(from);
      const username = participantInfo?.username || 'User';
      
      // Glare 처리: 이미 연결이 있고 offer를 보낸 상태면 충돌
      if (connection) {
        const signalingState = connection.getSignalingState();
        console.log(`[handleWebRTCOffer] 기존 연결 있음, state: ${signalingState}`);
        
        if (signalingState === 'have-local-offer') {
          const myId = socketIdRef.current || '';
          const isPolite = myId > from;
          
          console.log(`[handleWebRTCOffer] ⚠️ Glare! myId: ${myId}, from: ${from}, polite: ${isPolite}`);
          
          if (isPolite) {
            // 내 offer 철회
            console.log('[handleWebRTCOffer] Rollback 수행');
            await connection.peerConnection?.setLocalDescription({ type: 'rollback' });
          } else {
            // 상대 offer 무시
            console.log('[handleWebRTCOffer] 상대 offer 무시');
            return;
          }
        } else if (signalingState === 'stable' || signalingState === 'have-remote-offer') {
          // 이미 연결이 진행 중이면 offer 무시
          console.log(`[handleWebRTCOffer] 연결 진행 중, offer 무시`);
          return;
        }
      }

      // 연결이 없으면 새로 생성
      if (!connection) {
        console.log(`[handleWebRTCOffer] 새 연결 생성: ${from}`);
        connection = new NativeWebRTCConnection(from, false);
        
        connection.setOnIceCandidate((candidate) => {
          socketRef.current?.emit('webrtc_ice_candidate', {
            to: from,
            candidate,
          });
        });

        connection.setOnStream((stream) => {
          console.log(`[handleWebRTCOffer] 스트림 수신: ${username} (${from})`);
          setParticipants(prev => {
            const filtered = prev.filter(p => p.userId !== from);
            return [...filtered, { userId: from, username, stream, isMuted: false, isVideoOff: false }];
          });
        });

        connection.setOnClose(() => {
          console.log(`[handleWebRTCOffer] 연결 종료: ${from}`);
          connectionsRef.current.delete(from);
        });

        await connection.connect(localStreamRef.current || undefined);
        connectionsRef.current.set(from, connection);
      }

      // Offer 설정 및 Answer 전송
      await connection.setRemoteDescription(offer);
      const answer = await connection.createAnswer();
      socketRef.current?.emit('webrtc_answer', {
        to: from,
        answer,
      });
      console.log(`[handleWebRTCOffer] Answer 전송: ${from}`);
    } catch (error) {
      console.error('[handleWebRTCOffer] 실패:', error);
      // 실패 시 연결 정리
      const conn = connectionsRef.current.get(from);
      if (conn) {
        conn.setOnClose(() => {});
        conn.disconnect();
        connectionsRef.current.delete(from);
      }
    }
  };

  // ✅ WebRTC answer 처리
  const handleWebRTCAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    const connection = connectionsRef.current.get(from);
    if (!connection) {
      console.warn(`[handleWebRTCAnswer] 연결 없음: ${from}`);
      return;
    }

    const signalingState = connection.getSignalingState();
    console.log(`[handleWebRTCAnswer] state: ${signalingState}`);

    if (signalingState === 'have-local-offer') {
      try {
        await connection.setRemoteDescription(answer);
        console.log(`[handleWebRTCAnswer] 설정 완료: ${from}`);
      } catch (error) {
        console.error(`[handleWebRTCAnswer] 실패:`, error);
      }
    } else {
      console.warn(`[handleWebRTCAnswer] 잘못된 상태: ${signalingState}`);
    }
  };

  // WebRTC ICE candidate 처리
  const handleWebRTCIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    const connection = connectionsRef.current.get(from);
    if (connection) {
      await connection.addIceCandidate(candidate);
    }
  };

  // P2P 연결 제거
  const removePeerConnection = (userId: string) => {
    const connection = connectionsRef.current.get(userId);
    if (connection) {
      connection.disconnect();
      connectionsRef.current.delete(userId);
    }

    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  // 마이크 토글
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      setIsMuted(!isMuted);
      
      socketRef.current?.emit('media_toggle', {
        roomId,
        type: 'audio',
        enabled: isMuted,
      });
    }
  };

  // 비디오 토글
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
      
      socketRef.current?.emit('media_toggle', {
        roomId,
        type: 'video',
        enabled: isVideoOff,
      });
    }
  };

  // 화면 공유 토글
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // 화면 공유 시작
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor' // 전체 화면 우선
          } as any,
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        
        // 기존 비디오 트랙을 화면 공유로 교체
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            // 로컬 스트림에서 비디오 트랙 교체
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(screenTrack);
            
            // 현재 트랙 업데이트
            setCurrentVideoTrack(screenTrack);
            
            // 비디오 엘리먼트에 새 스트림 설정
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // 모든 P2P 연결에 화면 공유 트랙 전송
            connectionsRef.current.forEach(connection => {
              connection.toggleScreenShare(true, screenTrack, originalVideoTrack).catch(console.error);
            });
          }
        }

        // 화면 공유가 종료되면 원래 비디오로 복구
        screenTrack.onended = () => {
          restoreOriginalVideo();
        };

        setIsScreenSharing(true);
        toast.success('화면 공유를 시작했습니다');
      } else {
        // 화면 공유 중지
        restoreOriginalVideo();
      }
    } catch (error: any) {
      console.error('화면 공유 실패:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('화면 공유 권한이 거부되었습니다');
      } else {
        toast.error('화면 공유에 실패했습니다');
      }
      setIsScreenSharing(false);
    }
  };

  // 원래 비디오로 복구
  const restoreOriginalVideo = () => {
    try {
      if (originalVideoTrack && localStreamRef.current) {
        // 화면 공유 트랙 제거
        const screenTrack = localStreamRef.current.getVideoTracks()[0];
        if (screenTrack && screenTrack !== originalVideoTrack) {
          screenTrack.stop();
          localStreamRef.current.removeTrack(screenTrack);
        }
        
        // 원래 비디오 트랙 복구
        localStreamRef.current.addTrack(originalVideoTrack);
        
        // 현재 트랙 업데이트
        setCurrentVideoTrack(originalVideoTrack);
        
        // 비디오 엘리먼트에 새 스트림 설정
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        // 모든 P2P 연결에 원래 비디오 복구
        connectionsRef.current.forEach(connection => {
          connection.toggleScreenShare(false, undefined, originalVideoTrack).catch(console.error);
        });
      }
      
      setIsScreenSharing(false);
      toast('화면 공유를 종료했습니다');
    } catch (error) {
      console.error('비디오 복구 실패:', error);
    }
  };

  // 회의 나가기
  const leaveRoom = async () => {
    try {
      // Socket.IO로 방 나가기 이벤트 먼저 전송
      if (socketRef.current && roomId) {
        socketRef.current.emit('leave_room', { roomId });
        console.log('방 나가기 이벤트 전송:', roomId);
      }

      // 리소스 정리
      cleanup();

      // API 호출 (에러는 무시)
      if (roomId) {
        await roomApi.leaveRoom(roomId).catch(console.error);
      }
    } catch (error) {
      console.error('방 나가기 실패:', error);
    } finally {
      navigate('/dashboard');
    }
  };

  // 정리 함수
  const cleanup = () => {
    console.log('[Cleanup] 시작 - 모든 연결 정리');

    // ✅ 모든 P2P 연결 종료 (콜백 제거 후 정리)
    connectionsRef.current.forEach((connection, odId) => {
      connection.setOnClose(() => {}); // 콜백 제거
      connection.disconnect();
    });
    connectionsRef.current.clear();

    // ✅ 참가자 정보 정리
    participantInfoRef.current.clear();

    // 로컬 스트림 종료
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`[Cleanup] 트랙 종료: ${track.kind} (${track.label})`);
      });
      localStreamRef.current = null;
    }

    // 비디오 트랙 상태 초기화
    setCurrentVideoTrack(null);
    setOriginalVideoTrack(null);

    // Socket 연결 종료
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Socket ID 초기화
    socketIdRef.current = null;

    // 참가자 목록 초기화
    setParticipants([]);

    console.log('[Cleanup] 완료');
  };

  // 채팅 메시지 전송
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;

    const message = {
      userId: user?.id,
      username: user?.username,
      content: messageInput,
      timestamp: new Date().toISOString(),
    };

    socketRef.current?.emit('chat_message', {
      roomId,
      message,
    });

    setMessages(prev => [...prev, message]);
    setMessageInput('');
  };

  // 비디오 그리드 클래스 계산
  const getGridClass = () => {
    const count = participants.length + 1; // +1 for local video
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4';
  };

  return (
    <div className="h-screen flex room-root">
      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 비디오 설정 */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">비디오</h3>
                <div className="room-settings-box">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">카메라</span>
                    <button
                      onClick={toggleVideo}
                      className={`px-3 py-1 rounded ${!isVideoOff ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}
                    >
                      {!isVideoOff ? '켜짐' : '꺼짐'}
                    </button>
                  </label>
                </div>
              </div>

              {/* 오디오 설정 */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">오디오</h3>
                <div className="room-settings-box">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">마이크</span>
                    <button
                      onClick={toggleMute}
                      className={`px-3 py-1 rounded ${!isMuted ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}
                    >
                      {!isMuted ? '켜짐' : '꺼짐'}
                    </button>
                  </label>
                </div>
              </div>

              {/* 사용자 정보 */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">사용자 정보</h3>
                <div className="room-settings-box space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">이름</span>
                    <span className="text-gray-900 dark:text-white">{user?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">이메일</span>
                    <span className="text-gray-900 dark:text-white">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">개인 코드</span>
                    <span className="text-gray-900 dark:text-white font-mono">{user?.personalCode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="btn-discord"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* 메인 비디오 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="room-header px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            {/* 뒤로가기 버튼 추가 */}
            <button
              onClick={() => {
                if (window.confirm('회의를 나가시겠습니까?')) {
                  leaveRoom();
                }
              }}
              className="mr-4 p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-discord-light dark:hover:bg-discord-hover text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="대시보드로 돌아가기"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            
            <h2 className="text-gray-900 dark:text-white font-semibold mr-4">회의룸 #{roomId}</h2>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <UserGroupIcon className="w-4 h-4 mr-1" />
              <span>나 + {participants.length}명 = 총 {participants.length + 1}명 참가 중</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              title="설정"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 비디오 그리드 */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={`video-grid ${getGridClass()}`}>
            {/* 로컬 비디오 */}
            <div className="video-tile">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover bg-discord-darker"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect width='640' height='480' fill='%232f3136'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23747f8d' font-family='Arial' font-size='20'%3E카메라 연결 중...%3C/text%3E%3C/svg%3E"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${localStreamRef.current ? 'bg-green-500' : 'bg-gray-500'}`} />
                나 ({user?.username}) [ID: {socketIdRef.current?.substring(0, 6)}]
              </div>
              {isVideoOff && (
                <div className="absolute inset-0 bg-discord-darker flex items-center justify-center">
                  <div className="text-center">
                    <VideoCameraIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">비디오 꺼짐</p>
                  </div>
                </div>
              )}
            </div>

            {/* 원격 비디오들 */}
            {participants.map((participant) => (
              <div key={participant.userId} className="video-tile">
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) el.srcObject = participant.stream;
                  }}
                  className="w-full h-full object-cover bg-discord-darker"
                  poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect width='640' height='480' fill='%232f3136'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23747f8d' font-family='Arial' font-size='20'%3E연결 중...%3C/text%3E%3C/svg%3E"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${participant.stream ? 'bg-green-500' : 'bg-gray-500'}`} />
                  {participant.username} [ID: {participant.userId?.substring(0, 6)}]
                </div>
                {participant.isVideoOff && (
                  <div className="absolute inset-0 bg-discord-darker flex items-center justify-center">
                    <div className="text-center">
                      <VideoCameraIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">비디오 꺼짐</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* 참가자가 없을 때 안내 메시지 */}
            {participants.length === 0 && (
              <div className="video-tile col-span-full flex items-center justify-center bg-discord-darker/50">
                <div className="text-center">
                  <UserGroupIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">대기 중...</p>
                  <p className="text-gray-500 text-sm">다른 참가자를 기다리고 있습니다</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 컨트롤 바 */}
        <div className="room-header border-t px-4 py-4">
          <div className="flex items-center justify-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={`p-3 rounded-full ${
                isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
              } text-white transition-colors`}
            >
              {isMuted ? (
                <MicrophoneSolidIcon className="w-6 h-6" />
              ) : (
                <MicrophoneIcon className="w-6 h-6" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
              } text-white transition-colors`}
            >
              {isVideoOff ? (
                <VideoCameraSolidIcon className="w-6 h-6" />
              ) : (
                <VideoCameraIcon className="w-6 h-6" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleScreenShare}
              className={`p-3 rounded-full ${
                isScreenSharing ? 'bg-discord-brand' : 'bg-gray-700 hover:bg-gray-600'
              } text-white transition-colors`}
            >
              <ComputerDesktopIcon className="w-6 h-6" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowChat(!showChat)}
              className="p-3 rounded-full control-btn"
              title="채팅/파일 전송"
            >
              <ChatBubbleLeftIcon className="w-6 h-6" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowWebcamCompression(true)}
              className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              title="압축 품질 분석"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowWebcamEffects(true)}
              className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              title="영상/오디오 효과"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={leaveRoom}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="회의 나가기"
            >
              <PhoneXMarkIcon className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 채팅/파일 사이드바 */}
      {showChat && (
        <motion.aside
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          exit={{ x: 300 }}
          className="w-96 flex flex-col room-sidebar"
        >
          {/* 탭 헤더 */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                  sidebarTab === 'chat'
                    ? 'bg-gray-100 dark:bg-discord-darker text-gray-900 dark:text-white border-b-2 border-discord-brand'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span className="font-semibold">채팅</span>
              </button>
              <button
                onClick={() => setSidebarTab('file')}
                className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                  sidebarTab === 'file'
                    ? 'bg-gray-100 dark:bg-discord-darker text-gray-900 dark:text-white border-b-2 border-discord-brand'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                <span className="font-semibold">파일 전송</span>
              </button>
            </div>
          </div>

          {/* 채팅 탭 */}
          {sidebarTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <div className="flex-1">
                      <div className="flex items-baseline mb-1">
                        <span className="text-gray-900 dark:text-white font-medium text-sm mr-2">
                          {msg.username}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="input-field"
                  placeholder="메시지 입력..."
                />
              </form>
            </>
          )}

          {/* 파일 전송 탭 */}
          {sidebarTab === 'file' && (
            <div className="flex-1 overflow-y-auto p-4">
              <FileTransfer
                roomId={roomId || ''}
                socket={socketRef.current}
                myUserId={socketIdRef.current || ''}
              />
            </div>
          )}
        </motion.aside>
      )}

      {/* 웹캠 압축 품질 분석 모달 */}
      <WebcamCompression
        videoRef={localVideoRef}
        isOpen={showWebcamCompression}
        onClose={() => setShowWebcamCompression(false)}
      />

      {/* 웹캠 실시간 효과 모달 */}
      <WebcamEffects
        isOpen={showWebcamEffects}
        onClose={() => setShowWebcamEffects(false)}
        localStream={localStreamRef.current}
        onStreamUpdate={(newStream) => {
          // 새 스트림으로 업데이트
          localStreamRef.current = newStream;

          // 로컬 비디오 엘리먼트 업데이트
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
            localVideoRef.current.muted = true; // 로컬 비디오 음소거 (하울링 방지)
          }

          // 모든 P2P 연결에 새 트랙 교체 (replaceTrack 사용 - 재협상 불필요)
          connectionsRef.current.forEach((connection, peerId) => {
            console.log(`[WebcamEffects] P2P 연결 ${peerId}에 새 스트림 적용`);

            const senders = connection.peerConnection?.getSenders() || [];
            const newVideoTrack = newStream.getVideoTracks()[0];
            const newAudioTrack = newStream.getAudioTracks()[0];

            senders.forEach(sender => {
              if (sender.track?.kind === 'video' && newVideoTrack) {
                sender.replaceTrack(newVideoTrack)
                  .then(() => console.log(`[WebcamEffects] 비디오 트랙 교체 완료 (${peerId})`))
                  .catch(err => console.error(`[WebcamEffects] 비디오 트랙 교체 실패:`, err));
              } else if (sender.track?.kind === 'audio' && newAudioTrack) {
                sender.replaceTrack(newAudioTrack)
                  .then(() => console.log(`[WebcamEffects] 오디오 트랙 교체 완료 (${peerId})`))
                  .catch(err => console.error(`[WebcamEffects] 오디오 트랙 교체 실패:`, err));
              }
            });
          });

          console.log('[WebcamEffects] 스트림 업데이트 완료');
          toast.success('효과가 적용되었습니다!');
        }}
      />
    </div>
  );
}
