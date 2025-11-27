/**
 * 화상회의 룸 페이지 - WebRTC 비디오 컨퍼런싱
 * Perfect Negotiation + ICE Candidate Queue + Glare 완전 해결
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
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSolidIcon,
  VideoCameraIcon as VideoCameraSolidIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { NativeWebRTCConnection } from '@/utils/webrtc-native';
import { roomApi } from '@/utils/api';
import io, { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import FileTransfer from '@/components/FileTransfer';

interface VideoStream {
  userId: string;
  username: string;
  stream: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 상태 관리
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'file'>('chat');
  const [participants, setParticipants] = useState<VideoStream[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentVideoTrack, setCurrentVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [originalVideoTrack, setOriginalVideoTrack] = useState<MediaStreamTrack | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const connectionsRef = useRef<Map<string, NativeWebRTCConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef<Set<string>>(new Set());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const pendingAnswersRef = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (!roomId || !user) return;
    initializeRoom();
    return () => {
      cleanup();
    };
  }, [roomId, user]);

  // 미디어 권한 요청 및 스트림 획득
  const requestMediaPermissions = async (): Promise<MediaStream | null> => {
    try {
      const permissions = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName })
      ]).catch(() => [null, null]);

      if (permissions.some(p => p?.state === 'prompt')) {
        toast('카메라와 마이크 사용 권한을 요청합니다. 허용해주세요.', {
          icon: 'ℹ️',
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
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
      const stream = await requestMediaPermissions();

      if (!stream) {
        toast.error('카메라와 마이크 없이는 회의에 참가할 수 없습니다');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      localStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setCurrentVideoTrack(videoTrack);
        setOriginalVideoTrack(videoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

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
    const socketUrl = window.location.hostname.includes('e2b.dev')
      ? 'https://8000-i37urfutaoyq78dgicu29-6532622b.e2b.dev'
      : import.meta.env.VITE_SOCKET_URL || 'http://localhost:7701';

    console.log('🔌 Socket.IO 연결 시도:', socketUrl);

    socketRef.current = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket.IO 연결 성공!');
      console.log('🆔 Socket ID:', socket.id);
      socketIdRef.current = socket.id;

      socket.emit('join_room', {
        roomId,
        userInfo: {
          id: user?.id,
          username: user?.username,
          email: user?.email
        }
      });
    });

    // 새 사용자 참가
    socket.on('user_joined', ({ userId, userInfo }: any) => {
      console.log('👥 새 사용자 참가:', userInfo?.username, 'userId:', userId);

      if (userId && userId !== socketIdRef.current) {
        toast(`${userInfo?.username}님이 참가했습니다`, { icon: '👋' });

        const shouldInitiate = socketIdRef.current! > userId;
        console.log(`🔗 연결 시작: ${userInfo?.username} [내가 Initiator: ${shouldInitiate}]`);
        console.log(`   내 ID: ${socketIdRef.current}, 상대 ID: ${userId}`);
        createPeerConnection(userId, userInfo?.username || 'User', shouldInitiate);
      }
    });

    // 현재 참가자 목록 수신
    socket.on('current_participants', (participants: any[]) => {
      console.log('📋 현재 참가자 목록:', participants);

      if (participants && participants.length > 0) {
        participants.forEach(({ userId, userInfo }) => {
          if (userId && userId !== socketIdRef.current) {
            const shouldInitiate = socketIdRef.current! > userId;
            console.log(`🔗 기존 참가자와 연결: ${userInfo?.username} [내가 Initiator: ${shouldInitiate}]`);
            console.log(`   내 ID: ${socketIdRef.current}, 상대 ID: ${userId}`);
            createPeerConnection(userId, userInfo?.username || 'User', shouldInitiate);
          }
        });
      }
    });

    // 사용자 나감
    socket.on('user_left', ({ userId }: any) => {
      console.log('👋 사용자 나감:', userId);

      if (userId && userId !== socketIdRef.current) {
        const participant = participants.find(p => p.userId === userId);
        if (participant) {
          toast(`${participant.username}님이 나갔습니다`, { icon: '👋' });
        }

        removePeerConnection(userId);
      }
    });

    // WebRTC 시그널링
    socket.on('webrtc_offer', ({ from, offer }: any) => {
      console.log('📨 WebRTC Offer 수신:', from);
      handleWebRTCOffer(from, offer);
    });

    socket.on('webrtc_answer', ({ from, answer }: any) => {
      console.log('📨 WebRTC Answer 수신:', from);
      handleWebRTCAnswer(from, answer);
    });

    socket.on('webrtc_ice_candidate', ({ from, candidate }: any) => {
      console.log('🧊 ICE Candidate 수신:', from);
      handleWebRTCIceCandidate(from, candidate);
    });

    // 채팅 메시지
    socket.on('chat_message', (message: any) => {
      setMessages(prev => [...prev, message]);
    });

    // 연결 에러 처리
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket.IO 연결 에러:', error);
      toast.error('서버 연결에 실패했습니다');
    });
  };

  // P2P 연결 생성 (Signaling State 체크 추가)
  const createPeerConnection = async (userId: string, username: string, isInitiator: boolean) => {
    try {
      if (connectingRef.current.has(userId)) {
        console.log(`⚠️ ${userId}와 이미 연결 진행 중. 무시.`);
        return;
      }

      const existingConnection = connectionsRef.current.get(userId);
      if (existingConnection) {
        const pc = (existingConnection as any).peerConnection;
        if (pc) {
          const state = pc.connectionState;
          console.log(`📊 기존 연결 상태 (${userId}):`, state);

          if (state === 'connected' || state === 'connecting') {
            console.log(`⚠️ ${userId}와 이미 ${state} 상태. 무시.`);
            return;
          }

          if (state === 'failed' || state === 'closed') {
            console.log(`🔄 ${userId} 연결 재시도`);
            removePeerConnection(userId);
          }
        }
      }

      connectingRef.current.add(userId);
      console.log(`🚀 ${username} (${userId})와 P2P 연결 시작 [Initiator: ${isInitiator}]`);

      const connection = new NativeWebRTCConnection(userId, isInitiator);

      connection.setOnIceCandidate((candidate) => {
        socketRef.current?.emit('webrtc_ice_candidate', {
          to: userId,
          candidate,
        });
      });

      connection.setOnStream((stream) => {
        console.log(`✅ 원격 스트림 수신: ${username} (${userId})`);
        setParticipants(prev => {
          const filtered = prev.filter(p => p.userId !== userId);
          return [...filtered, { userId, username, stream, isMuted: false, isVideoOff: false }];
        });
      });

      connection.setOnClose(() => {
        console.log(`🔌 연결 종료: ${userId}`);
        removePeerConnection(userId);
      });

      connectionsRef.current.set(userId, connection);
      await connection.connect(localStreamRef.current || undefined);

      // ✅ 대기 중이던 Answer 처리
      const pendingAnswer = pendingAnswersRef.current.get(userId);
      if (pendingAnswer) {
        console.log(`📬 대기 중이던 Answer 처리: ${userId}`);
        await handleWebRTCAnswer(userId, pendingAnswer);
        pendingAnswersRef.current.delete(userId);
      }

      // ✅ Offer를 보내기 전에 signaling state 체크
      if (isInitiator) {
        const pc = (connection as any).peerConnection;

        if (!pc) {
          console.error(`❌ PeerConnection이 없음. Offer 전송 불가: ${userId}`);
          connectingRef.current.delete(userId);
          return;
        }

        console.log(`📊 Offer 전송 전 Signaling State: ${pc.signalingState}`);

        // ✅ have-remote-offer 상태면 Offer를 보내지 않음 (이미 상대방 Offer 받음)
        if (pc.signalingState === 'have-remote-offer') {
          console.log(`⚠️ 이미 remote offer 수신함. Offer 전송 건너뜀: ${userId}`);
          connectingRef.current.delete(userId);
          return;
        }

        // ✅ stable 상태일 때만 Offer 전송
        if (pc.signalingState === 'stable') {
          try {
            const offer = await connection.createOffer();
            socketRef.current?.emit('webrtc_offer', {
              to: userId,
              offer,
            });
            console.log(`📤 Offer 전송: ${userId}`);
          } catch (offerError) {
            console.error(`❌ Offer 생성/전송 실패 (${userId}):`, offerError);
            connectingRef.current.delete(userId);
            return;
          }
        } else {
          console.log(`⚠️ Offer를 보낼 수 없는 상태 (${pc.signalingState}). 건너뜀: ${userId}`);
        }
      }

      connectingRef.current.delete(userId);

    } catch (error) {
      console.error(`❌ ${userId}와 연결 생성 실패:`, error);
      connectingRef.current.delete(userId);
      toast.error(`${username}님과의 연결에 실패했습니다`);
    }
  };

  // WebRTC Offer 처리
  const handleWebRTCOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      if (from === socketIdRef.current) {
        console.log(`⚠️ 자기 자신의 offer 무시: ${from}`);
        return;
      }

      console.log(`📥 Offer 처리 시작: ${from}`);

      let connection = connectionsRef.current.get(from);

      if (!connection) {
        console.log(`🆕 새 연결 생성: ${from}`);
        connection = new NativeWebRTCConnection(from, false);
        connectionsRef.current.set(from, connection);

        connection.setOnIceCandidate((candidate) => {
          socketRef.current?.emit('webrtc_ice_candidate', {
            to: from,
            candidate,
          });
        });

        connection.setOnStream((stream) => {
          console.log(`✅ 원격 스트림 수신 (offer 응답): ${from}`);
          setParticipants(prev => {
            const filtered = prev.filter(p => p.userId !== from);
            return [...filtered, { userId: from, username: 'User', stream, isMuted: false, isVideoOff: false }];
          });
        });

        connection.setOnClose(() => {
          removePeerConnection(from);
        });

        await connection.connect(localStreamRef.current || undefined);
      }

      const pc = (connection as any).peerConnection;

      if (pc) {
        console.log(`📊 Signaling State (${from}):`, pc.signalingState);

        // Glare 감지
        if (pc.signalingState === 'have-local-offer') {
          console.log(`⚠️ Glare 감지! 양쪽이 동시에 offer 전송`);

          const shouldRollback = socketIdRef.current! < from;

          if (shouldRollback) {
            console.log(`🔄 내가 양보: 내 offer 롤백하고 상대 offer 수용`);
            try {
              await pc.setLocalDescription({ type: 'rollback' });
              console.log(`✅ 롤백 완료. 현재 상태: ${pc.signalingState}`);
            } catch (rollbackError) {
              console.error(`❌ 롤백 실패:`, rollbackError);
              removePeerConnection(from);
              return;
            }
          } else {
            console.log(`⏹️ 상대가 양보해야 함: 이 offer 무시`);
            return;
          }
        } else if (pc.signalingState === 'have-remote-offer') {
          console.log(`⚠️ 이미 remote offer 존재. 중복 offer 무시: ${from}`);
          return;
        } else if (pc.signalingState === 'closed') {
          console.log(`⚠️ 연결이 이미 종료됨. 무시: ${from}`);
          return;
        } else if (pc.signalingState !== 'stable') {
          console.log(`⚠️ Offer를 받을 수 없는 상태: ${pc.signalingState}. 무시.`);
          return;
        }
      } else {
        console.warn(`⚠️ PeerConnection 아직 초기화 안됨: ${from} (계속 진행)`);
      }

      // Remote description 설정
      try {
        await connection.setRemoteDescription(offer);
        console.log(`✅ Remote Description (Offer) 설정 완료: ${from}`);
      } catch (sdpError) {
        console.error(`❌ Remote Description 설정 실패:`, sdpError);
        throw sdpError;
      }

      // 대기 중인 ICE candidates 처리
      const pendingCandidates = pendingIceCandidatesRef.current.get(from);
      if (pendingCandidates && pendingCandidates.length > 0) {
        console.log(`📦 대기 중인 ICE candidates 처리: ${pendingCandidates.length}개`);
        for (const candidate of pendingCandidates) {
          try {
            await connection.addIceCandidate(candidate);
            console.log(`✅ 대기 ICE candidate 추가 완료`);
          } catch (err) {
            console.error(`❌ 대기 ICE candidate 추가 실패:`, err);
          }
        }
        pendingIceCandidatesRef.current.delete(from);
      }

      // Answer 생성 및 전송
      try {
        const answer = await connection.createAnswer();
        socketRef.current?.emit('webrtc_answer', {
          to: from,
          answer,
        });
        console.log(`📤 Answer 전송: ${from}`);
      } catch (answerError) {
        console.error(`❌ Answer 생성 실패:`, answerError);
        throw answerError;
      }

    } catch (error) {
      console.error(`❌ Offer 처리 실패 (${from}):`, error);
      console.log(`⚠️ 연결 유지. 재시도 대기 중...`);
    }
  };

  // WebRTC Answer 처리
  const handleWebRTCAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    try {
      if (from === socketIdRef.current) {
        console.log(`⚠️ 자기 자신의 answer 무시: ${from}`);
        return;
      }

      console.log(`📥 Answer 처리 시작: ${from}`);

      const connection = connectionsRef.current.get(from);

      // 연결이 없으면 Answer를 큐에 저장
      if (!connection) {
        console.log(`⏳ 연결 없음. Answer 큐에 저장: ${from}`);
        pendingAnswersRef.current.set(from, answer);
        return;
      }

      const pc = (connection as any).peerConnection;

      // PeerConnection이 없으면 Answer를 큐에 저장
      if (!pc) {
        console.log(`⏳ PeerConnection 없음. Answer 큐에 저장: ${from}`);
        pendingAnswersRef.current.set(from, answer);
        return;
      }

      console.log(`📊 Signaling State (${from}):`, pc.signalingState);

      if (pc.signalingState === 'stable') {
        console.log(`⚠️ 이미 stable 상태. Answer 무시 (이미 연결됨 or 롤백됨): ${from}`);
        return;
      }

      if (pc.signalingState !== 'have-local-offer') {
        console.log(`⚠️ Answer를 받을 수 없는 상태: ${pc.signalingState}. 무시.`);
        return;
      }

      // Remote description 설정
      try {
        await connection.setRemoteDescription(answer);
        console.log(`✅ Remote Description (Answer) 설정 완료: ${from}`);

        // 대기 중인 ICE candidates 처리
        const pendingCandidates = pendingIceCandidatesRef.current.get(from);
        if (pendingCandidates && pendingCandidates.length > 0) {
          console.log(`📦 대기 중인 ICE candidates 처리: ${pendingCandidates.length}개`);
          for (const candidate of pendingCandidates) {
            try {
              await connection.addIceCandidate(candidate);
              console.log(`✅ 대기 ICE candidate 추가 완료`);
            } catch (err) {
              console.error(`❌ 대기 ICE candidate 추가 실패:`, err);
            }
          }
          pendingIceCandidatesRef.current.delete(from);
        }
      } catch (sdpError: any) {
        if (sdpError.name === 'InvalidStateError' && sdpError.message.includes('stable')) {
          console.log(`⚠️ stable 상태 에러 무시 (이미 연결됨): ${from}`);
          return;
        }
        throw sdpError;
      }
    } catch (error) {
      console.error(`❌ Answer 처리 실패 (${from}):`, error);
    }
  };

  // WebRTC ICE Candidate 처리
  const handleWebRTCIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    try {
      if (from === socketIdRef.current) {
        console.log(`⚠️ 자기 자신의 ICE candidate 무시: ${from}`);
        return;
      }

      const connection = connectionsRef.current.get(from);

      // 연결이 없으면 큐에 저장
      if (!connection) {
        console.log(`⏳ 연결 없음. ICE candidate 큐에 저장: ${from}`);

        if (!pendingIceCandidatesRef.current.has(from)) {
          pendingIceCandidatesRef.current.set(from, []);
        }
        pendingIceCandidatesRef.current.get(from)!.push(candidate);
        return;
      }

      const pc = (connection as any).peerConnection;

      // PeerConnection이 없으면 큐에 저장
      if (!pc) {
        console.log(`⏳ PeerConnection 없음. ICE candidate 큐에 저장: ${from}`);

        if (!pendingIceCandidatesRef.current.has(from)) {
          pendingIceCandidatesRef.current.set(from, []);
        }
        pendingIceCandidatesRef.current.get(from)!.push(candidate);
        return;
      }

      // Remote description이 없으면 큐에 저장
      if (!pc.remoteDescription) {
        console.log(`⏳ Remote description 없음. ICE candidate 큐에 저장: ${from}`);

        if (!pendingIceCandidatesRef.current.has(from)) {
          pendingIceCandidatesRef.current.set(from, []);
        }
        pendingIceCandidatesRef.current.get(from)!.push(candidate);
        return;
      }

      // Remote description이 있으면 즉시 추가
      await connection.addIceCandidate(candidate);
      console.log(`✅ ICE candidate 추가 완료: ${from}`);

    } catch (error: any) {
      if (error.message?.includes('remote description was null')) {
        console.warn(`⚠️ Remote description 없음 (ICE candidate 무시): ${from}`);
      } else {
        console.error(`❌ ICE Candidate 처리 실패 (${from}):`, error);
      }
    }
  };

  // P2P 연결 제거
  const removePeerConnection = (userId: string) => {
    const connection = connectionsRef.current.get(userId);
    if (connection) {
      connection.disconnect();
      connectionsRef.current.delete(userId);
    }

    connectingRef.current.delete(userId);
    pendingIceCandidatesRef.current.delete(userId);
    pendingAnswersRef.current.delete(userId);
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor'
          } as any,
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(screenTrack);

            setCurrentVideoTrack(screenTrack);

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }

            connectionsRef.current.forEach(connection => {
              connection.toggleScreenShare(true, screenTrack, originalVideoTrack).catch(console.error);
            });
          }
        }

        screenTrack.onended = () => {
          restoreOriginalVideo();
        };

        setIsScreenSharing(true);
        toast.success('화면 공유를 시작했습니다');
      } else {
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
        const screenTrack = localStreamRef.current.getVideoTracks()[0];
        if (screenTrack && screenTrack !== originalVideoTrack) {
          screenTrack.stop();
          localStreamRef.current.removeTrack(screenTrack);
        }

        localStreamRef.current.addTrack(originalVideoTrack);

        setCurrentVideoTrack(originalVideoTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

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
      cleanup();
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
    connectionsRef.current.forEach(connection => {
      connection.disconnect();
    });
    connectionsRef.current.clear();
    connectingRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    pendingAnswersRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
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
    const count = participants.length + 1;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4';
  };

  return (
    <div className="h-screen bg-discord-dark flex">
      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-discord-light rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">비디오</h3>
                <div className="bg-discord-darker rounded p-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-400">카메라</span>
                    <button
                      onClick={toggleVideo}
                      className={`px-3 py-1 rounded ${!isVideoOff ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}
                    >
                      {!isVideoOff ? '켜짐' : '꺼짐'}
                    </button>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">오디오</h3>
                <div className="bg-discord-darker rounded p-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-400">마이크</span>
                    <button
                      onClick={toggleMute}
                      className={`px-3 py-1 rounded ${!isMuted ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}
                    >
                      {!isMuted ? '켜짐' : '꺼짐'}
                    </button>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">사용자 정보</h3>
                <div className="bg-discord-darker rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">이름</span>
                    <span className="text-white">{user?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">이메일</span>
                    <span className="text-white">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">개인 코드</span>
                    <span className="text-white font-mono">{user?.personalCode}</span>
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
        <div className="bg-discord-darker border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (window.confirm('회의를 나가시겠습니까?')) {
                  leaveRoom();
                }
              }}
              className="mr-4 p-2 rounded-lg bg-discord-light hover:bg-discord-hover text-gray-400 hover:text-white transition-colors"
              title="대시보드로 돌아가기"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <h2 className="text-white font-semibold mr-4">회의룸 #{roomId}</h2>
            <div className="flex items-center text-sm text-gray-400">
              <UserGroupIcon className="w-4 h-4 mr-1" />
              <span>나 + {participants.length}명 = 총 {participants.length + 1}명 참가 중</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-400 hover:text-white transition-colors"
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

            {/* 참가자가 없을 때 */}
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
        <div className="bg-discord-darker border-t border-gray-800 px-4 py-4">
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
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <ChatBubbleLeftIcon className="w-6 h-6" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={leaveRoom}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
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
          className="w-96 bg-discord-light border-l border-gray-800 flex flex-col"
        >
          <div className="border-b border-gray-700">
            <div className="flex">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                  sidebarTab === 'chat'
                    ? 'bg-discord-darker text-white border-b-2 border-discord-brand'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span className="font-semibold">채팅</span>
              </button>
              <button
                onClick={() => setSidebarTab('file')}
                className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                  sidebarTab === 'file'
                    ? 'bg-discord-darker text-white border-b-2 border-discord-brand'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                <span className="font-semibold">파일 전송</span>
              </button>
            </div>
          </div>

          {sidebarTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <div className="flex-1">
                      <div className="flex items-baseline mb-1">
                        <span className="text-white font-medium text-sm mr-2">
                          {msg.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
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
    </div>
  );
}