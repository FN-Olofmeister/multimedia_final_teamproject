/**
 * 대시보드 페이지 - 로그인 후 메인 페이지
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VideoCameraIcon,
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/utils/api';
import type { Room } from '@/types';
import toast from 'react-hot-toast';
import io, { Socket } from 'socket.io-client';
import { createSocket } from "@/utils/socket";

export default function DashboardPage() {
  const { user, logout, theme, toggleTheme } = useAuth(); // theme, toggleTheme 추가
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPersonalCode, setShowPersonalCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const socketRef = useRef<Socket | null>(null);
  

  // 방 목록 불러오기
  useEffect(() => {
    fetchRooms();
  }, []);

  // Socket.IO 연결 및 실시간 방 목록 업데이트 구독
  useEffect(() => {
    console.log("🔌 Socket.IO 연결 시도 (대시보드)");

    socketRef.current = createSocket(localStorage.getItem("token"));

    socketRef.current.on("connect", () => {
      console.log("✅ Socket.IO 연결 성공 (대시보드)");
    });

    socketRef.current.on("room_list_updated", () => {
      console.log("📢 방 목록 업데이트 알림 수신 - 새로고침");
      fetchRooms();
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Socket.IO 연결 해제 (대시보드)");
    });

    const pollingInterval = setInterval(() => fetchRooms(), 10000);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearInterval(pollingInterval);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const data = await roomApi.getRooms();
      setRooms(data);
    } catch (error) {
      console.error('방 목록 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 새 방 만들기
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('방 이름을 입력해주세요');
      return;
    }

    try {
      setIsLoading(true);
      console.log('방 생성 시작:', newRoomName);
      
      const room = await roomApi.createRoom({
        name: newRoomName,
        maxParticipants: 100,
      });
      
      console.log('방 생성 성공:', room);
      
      toast.success('방이 생성되었습니다!');
      setShowCreateModal(false);
      setNewRoomName('');
      
      // 방 목록 새로고침
      await fetchRooms();
      
      // 생성한 방으로 바로 이동
      navigate(`/room/${room.id}`);
      
    } catch (error: any) {
      console.error('방 생성 실패:', error);
      toast.error(error?.response?.data?.detail || '방 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 방 참가하기 - 단순화
  const handleJoinRoom = (roomId: string) => {
    console.log('회의 참가 시작:', roomId);
    
    if (!roomId) {
      console.error('roomId가 없습니다');
      toast.error('방 ID가 없습니다');
      return;
    }
    
    // API 호출 없이 바로 이동
    toast.success('회의에 참가합니다');
    navigate(`/room/${roomId}`);
  };

  // 개인 코드 복사
  const copyPersonalCode = () => {
    if (user?.personalCode) {
      navigator.clipboard.writeText(user.personalCode);
      toast.success('개인 참가 코드가 복사되었습니다!');
    }
  };

  return (
     <div className="min-h-screen flex dashboard-root"> 
      {/* 사이드바 */}
      <aside className="w-64 flex flex-col dashboard-sidebar"> 
        {/* 사용자 프로필 */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-discord-brand to-zoom-blue rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-m font-semibold text-gray-900 dark:text-white">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button
              onClick={() => setShowPersonalCode(true)}
              className="sidebar-item w-full"
            >
              <ClipboardDocumentCheckIcon className="w-5 h-5 mr-3" />
              내 참가 코드
            </button>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="sidebar-item w-full"
            >
              <Cog6ToothIcon className="w-5 h-5 mr-3" />
              설정
            </button>
          </div>
        </nav>

        {/* 로그아웃 */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 p-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-gray-900 dark:text-gray-100 text-3xl font-bold">
          대시보드
          </h1>
          <p className="text-gray-400">
            회의실을 만들거나 참가해보세요
          </p>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-discord-brand to-zoom-blue p-6 rounded-lg text-white hover:shadow-lg transition-shadow"
          >
            <PlusIcon className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold mb-1">새 회의 시작</h3>
            <p className="text-sm opacity-90">
              즉시 화상회의를 시작하세요
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const code = prompt('회의 코드를 입력하세요:');
              if (code) {
                // 코드로 방 찾기 또는 참가
                const room = rooms.find(r => r.id === code || r.name === code);
                if (room) {
                  handleJoinRoom(room.id);
                } else {
                  toast.error('해당 코드의 회의를 찾을 수 없습니다');
                }
              }
            }}
            className="dashboard-card p-6 rounded-lg hover:border-discord-brand transition-colors cursor-pointer"
          >
            <UserGroupIcon className="w-8 h-8 mb-3 text-gray-600 dark:text-white" />
            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">회의 참가</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              초대 코드로 회의에 참가하세요
            </p>
          </motion.button>
        </div>

        {/* 활성 회의실 목록 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">
            활성 회의실
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner w-8 h-8 border-3" />
            </div>
          ) : rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="dashboard-card rounded-lg p-4 hover:border-discord-brand transition-colors" // 수정부분
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {room.name}
                      </h3>

                      <p className="text-sm text-gray-400">
                        {(room as any).participantCount || 0}/{room.maxParticipants}명 참가 중
                      </p>
                    </div>
                    <VideoCameraIcon className="w-5 h-5 text-discord-brand" />
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {new Date(room.createdAt).toLocaleString()}
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('버튼 클릭 이벤트 발생!', room.id);
                      handleJoinRoom(room.id);
                    }}
                    onMouseDown={(e) => {
                      console.log('마우스 다운 이벤트!', room.id);
                    }}
                    className="w-full btn-discord py-2 text-sm"
                    type="button"
                  >
                    참가하기
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 dashboard-card rounded-lg"> 
              <VideoCameraIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">활성 회의실이 없습니다</p>
              <p className="text-sm text-gray-500 mt-1">
                새 회의를 시작해보세요!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 새 방 만들기 모달 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  새 회의 만들기
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  회의 이름
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="input-field"
                  placeholder="예: 팀 미팅"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 btn-discord"
                >
                  만들기
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-zoom"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개인 코드 모달 */}
      <AnimatePresence>
        {showPersonalCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowPersonalCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-discord-brand to-zoom-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-semibold  mb-2 text-gray-900 dark:text-white ">
                  내 개인 참가 코드
                </h2>
                
                <p className="text-gray-400 text-sm mb-4">
                  이 코드를 공유하여 다른 사람을 초대하세요
                </p>

                <div className="rounded-lg p-4 mb-4 bg-gray-100 dark:bg-discord-darker">
                  <p className="text-2xl font-mono text-discord-brand">
                    {user?.personalCode}
                  </p>
                </div>

                <button
                  onClick={copyPersonalCode}
                  className="btn-discord w-full"
                >
                  코드 복사하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 설정 모달 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  설정
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 사용자 정보 */}
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-100">사용자 정보</h3>
                  <div className="rounded-lg p-4 space-y-3 bg-gray-100 dark:bg-discord-darker">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-400">이름</span>
                      <span className="text-gray-700 dark:text-white">{user?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-400">이메일</span>
                      <span className="text-gray-700 dark:text-white">{user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-400">개인 코드</span>
                      <span className="font-mono text-gray-700 dark:text-white">{user?.personalCode}</span>
                    </div>
                  </div>
                </div>

                {/* 테마 설정 */} 
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-100">테마</h3>
                  <div className="rounded-lg p-4 bg-gray-100 dark:bg-discord-darker">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-400">다크 모드</span>
                      <button
                        onClick={toggleTheme}
                        className={`px-3 py-1 rounded text-sm font-medium transition
                          ${theme === 'dark'
                            ? 'bg-discord-brand text-white'
                            : 'bg-gray-300 text-gray-800'
                          }`}
                      >
                        {theme === 'dark' ? '켜짐' : '꺼짐'}
                      </button>
                    </label>
                  </div>
                </div>

                {/* 알림 설정 */}
                <div>
                  <h3 className="text-sm font-medium  mb-2 text-gray-500 dark:text-gray-100">알림</h3>
                  <div className="rounded-lg p-4 space-y-3 bg-gray-100 dark:bg-discord-darker">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-400">새 메시지 알림</span>
                      <button className="px-3 py-1 rounded bg-green-600 text-white text-sm">
                        켜짐
                      </button>
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-400">회의 참가 알림</span>
                      <button className="px-3 py-1 rounded bg-green-600 text-white text-sm">
                        켜짐
                      </button>
                    </label>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
