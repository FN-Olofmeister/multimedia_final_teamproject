/**
 * 메인 App 컴포넌트 - 애플리케이션의 최상위 컴포넌트
 * 라우팅과 전역 Provider들을 설정합니다
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 페이지 컴포넌트들 (lazy loading으로 최적화)
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import RoomPage from '@/pages/RoomPage';
import LandingPage from '@/pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* 토스트 알림 설정 - Discord 스타일 */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#36393f',
              color: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #4a4d52',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#3ba55c',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ed4245',
                secondary: '#ffffff',
              },
            },
          }}
        />

        {/* 라우트 설정 */}
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 보호된 라우트 - 로그인 필요 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Route>

          {/* 404 페이지 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;