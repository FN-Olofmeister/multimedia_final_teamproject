/**
 * 로그인 페이지 - Discord 스타일의 로그인 폼
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { LoginRequest } from '@/types';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  
  // 로그인 API는 username 필드를 사용하므로 email을 username으로 처리
  const [loginMethod, setLoginMethod] = useState<'email' | 'username'>('email');

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.email || !formData.password) {
      console.error('❌ 이메일 또는 비밀번호가 비어있습니다');
      return;
    }

    console.log('🚀 로그인 폼 제출:', formData);
    
    try {
      await login(formData);
    } catch (error) {
      console.error('❌ 로그인 페이지 에러:', error);
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
      <div className="absolute inset-0 bg-gradient-to-br from-discord-brand/10 via-transparent to-zoom-blue/10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* 로그인 카드 */}
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
              다시 오신 것을 환영합니다!
            </h1>
            <p className="text-gray-400 text-sm">
              VideoNet Pro에 로그인하세요
            </p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 또는 사용자명 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일 또는 사용자명
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="이메일 또는 사용자명"
                  required
                  autoComplete="username"
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
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
            </div>

            {/* 비밀번호 찾기 링크 */}
            <div className="flex justify-end">
              <a href="#" className="text-sm text-discord-brand hover:underline">
                비밀번호를 잊으셨나요?
              </a>
            </div>

            {/* 로그인 버튼 */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-discord py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner w-5 h-5 border-2 mr-2" />
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </motion.button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center text-sm text-gray-400">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-discord-brand hover:underline font-medium">
              회원가입하기
            </Link>
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-discord-light text-gray-500">또는</span>
            </div>
          </div>

          {/* 데모 계정 정보 */}
          <div className="bg-discord-darker rounded-md p-4 text-sm">
            <p className="text-gray-300 font-medium mb-2">🎯 테스트 계정</p>
            <p className="text-gray-400">이메일: demo@example.com</p>
            <p className="text-gray-400">비밀번호: demo1234</p>
            <p className="text-gray-400 mt-2">초대 코드: MASTER2024</p>
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