/**
 * 회원가입 페이지 - 초대 코드 필수!
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  TicketIcon,
  EyeIcon, 
  EyeSlashIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisterRequest } from '@/types';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    inviteCode: '',
  });

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.username || !formData.email || !formData.password || !formData.inviteCode) {
      return;
    }

    // 비밀번호 길이 체크
    if (formData.password.length < 6) {
      return;
    }

    try {
      await register(formData);
    } catch (error) {
      // 에러는 AuthContext에서 처리
    }
  };

  // 입력 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-discord-dark flex items-center justify-center p-4">
      {/* 배경 그라데이션 효과 */}
      <div className="absolute inset-0 bg-gradient-to-br from-zoom-blue/10 via-transparent to-discord-brand/10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* 회원가입 카드 */}
        <div className="bg-discord-light rounded-lg shadow-2xl p-8">
          {/* 로고와 타이틀 */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block"
            >
              <img src="/logo.svg" alt="VideoNet Pro" className="w-28 h-28 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              계정 만들기
            </h1>
            <p className="text-gray-400 text-sm">
              VideoNet Pro와 함께 시작하세요
            </p>
          </div>

          {/* 초대 코드 안내 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-discord-brand/10 border border-discord-brand/30 rounded-md p-4 mb-6"
          >
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-discord-brand mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-gray-200 font-medium mb-1">
                  초대 코드가 필요합니다
                </p>
                <p className="text-gray-400">
                  VideoNet Pro는 초대받은 사용자만 가입할 수 있습니다. 
                  초대 코드를 받으셨다면 아래에 입력해주세요.
                </p>
              </div>
            </div>
          </motion.div>

          {/* 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 사용자명 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                사용자명
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="홍길동"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* 이메일 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일 주소
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="user@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="최소 6자 이상"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.password && formData.password.length < 6 && (
                <p className="mt-1 text-xs text-red-400">
                  비밀번호는 최소 6자 이상이어야 합니다
                </p>
              )}
            </div>

            {/* 초대 코드 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                초대 코드 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <TicketIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  className="input-field pl-10 font-mono uppercase"
                  placeholder="INVITE-CODE"
                  required
                  style={{ letterSpacing: '0.1em' }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                초대 코드는 관리자로부터 받으실 수 있습니다
              </p>
            </div>

            {/* 회원가입 버튼 */}
            <motion.button
              type="submit"
              disabled={isLoading || formData.password.length < 6}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-zoom py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner w-5 h-5 border-2 mr-2" />
                  계정 생성 중...
                </div>
              ) : (
                '계정 만들기'
              )}
            </motion.button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center text-sm text-gray-400">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-discord-brand hover:underline font-medium">
              로그인하기
            </Link>
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-discord-light text-gray-500">정보</span>
            </div>
          </div>

          {/* 가입 후 안내 */}
          <div className="bg-discord-darker rounded-md p-4 text-sm">
            <p className="text-gray-300 font-medium mb-2">✨ 가입 후 혜택</p>
            <ul className="space-y-1 text-gray-400">
              <li>• 개인 참가 코드 발급</li>
              <li>• 무제한 화상회의 생성</li>
              <li>• 최대 100명 동시 참가</li>
              <li>• 화면 공유 및 녹화 기능</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-6 text-xs text-gray-500 space-y-2">
          <p>© 2025 VideoNet Pro. All rights reserved.</p>
          <p className="text-gray-400">
            20205146 한림대학교 콘텐츠IT학과 김재형
          </p>
          <p>
            AI+X 프로젝트 과제물 · 2025년 제작
          </p>
          <p className="text-gray-600 text-xs mt-3">
            videonet C 프로젝트를 기반으로 만들었습니다
          </p>
        </div>
      </motion.div>
    </div>
  );
}