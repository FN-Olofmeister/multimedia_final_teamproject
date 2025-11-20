/**
 * 랜딩 페이지 - 서비스 소개 페이지
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  VideoCameraIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const features = [
    {
      icon: VideoCameraIcon,
      title: 'HD 화상회의',
      description: '고화질 비디오와 선명한 오디오로 실시간 소통',
    },
    {
      icon: UserGroupIcon,
      title: '대규모 회의',
      description: '최대 100명까지 동시 참가 가능',
    },
    {
      icon: ShieldCheckIcon,
      title: '보안 연결',
      description: '초대 코드 시스템으로 안전한 회의 환경',
    },
    {
      icon: SparklesIcon,
      title: '화면 공유',
      description: '프레젠테이션과 협업을 위한 화면 공유',
    },
  ];

  return (
    <div className="min-h-screen bg-discord-dark">
      {/* 네비게이션 */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <div className="flex items-center">
              <img src="/logo.svg" alt="VideoNet Pro" className="h-16 w-16" />
              <span className="ml-3 text-2xl font-bold text-white">VideoNet Pro</span>
            </div>

            {/* 로그인/회원가입 버튼 */}
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="btn-discord"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-discord-brand/20 via-transparent to-zoom-blue/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.img
              src="/logo.svg"
              alt="VideoNet Pro Logo"
              className="h-48 w-48 mx-auto mb-8"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            />
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-discord-brand to-zoom-blue bg-clip-text text-transparent">
                VideoNet Pro
              </span>
              <br />
              차세대 화상회의 플랫폼
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
              Discord의 직관적인 UI와 Zoom의 강력한 기능을 결합한
              <br />
              프리미엄 화상회의 솔루션
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-discord-brand to-zoom-blue text-white rounded-lg font-medium text-lg hover:shadow-xl transition-all"
                >
                  무료로 시작하기
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center px-8 py-4 bg-discord-darker border border-gray-600 text-gray-200 rounded-lg font-medium text-lg hover:bg-discord-hover transition-all"
                >
                  데모 체험하기
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 기능 섹션 */}
      <section className="py-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              강력한 기능들
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              VideoNet Pro는 팀 협업을 위한 모든 기능을 제공합니다
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-discord-light rounded-lg p-6 border border-gray-700 hover:border-discord-brand transition-colors"
              >
                <feature.icon className="w-12 h-12 text-discord-brand mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-discord-brand/20 to-zoom-blue/20 rounded-2xl p-12 border border-gray-700"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-gray-300 mb-8">
              초대 코드가 있으신가요? 지금 가입하고 프리미엄 기능을 경험해보세요.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-3 bg-white text-discord-dark rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              회원가입
              <ArrowRightIcon className="ml-2 w-5 h-5" />
            </Link>
            
            <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                보안 연결
              </div>
              <div className="flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                무제한 참가자
              </div>
              <div className="flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                무료 이용
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm space-y-2">
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
        </div>
      </footer>
    </div>
  );
}