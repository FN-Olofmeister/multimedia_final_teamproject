/**
 * 보호된 라우트 컴포넌트 - 로그인이 필요한 페이지를 보호합니다
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-discord-dark flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-discord-brand mx-auto mb-4" />
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않았으면 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 인증되었으면 자식 라우트 렌더링
  return <Outlet />;
}