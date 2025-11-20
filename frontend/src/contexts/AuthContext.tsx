/**
 * 인증 컨텍스트 - 전역 인증 상태 관리
 * React Context API를 사용해서 로그인 상태를 전체 앱에서 사용할 수 있게 합니다
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, getErrorMessage } from '@/utils/api';
import type { User, LoginRequest, RegisterRequest } from '@/types';

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null;           // 현재 로그인한 사용자
  isLoading: boolean;          // 로딩 상태
  isAuthenticated: boolean;    // 인증 여부
  login: (data: LoginRequest) => Promise<void>;      // 로그인 함수
  register: (data: RegisterRequest) => Promise<void>; // 회원가입 함수
  logout: () => Promise<void>;                       // 로그아웃 함수
  refreshUser: () => Promise<void>;                  // 사용자 정보 새로고침
}

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 컴포넌트 - 인증 상태를 제공하는 Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 localStorage에서 사용자 정보 복원
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          // 저장된 사용자 정보가 있으면 복원
          setUser(JSON.parse(savedUser));
          
          // 서버에서 최신 사용자 정보 가져오기
          try {
            const currentUser = await authApi.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // 토큰이 만료되었거나 유효하지 않으면 로그아웃
            console.error('사용자 정보 가져오기 실패:', error);
            await logout();
          }
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * 로그인 함수
   */
  const login = async (data: LoginRequest) => {
    console.log('🔑 AuthContext 로그인 시작:', data);
    try {
      setIsLoading(true);
      // 백엔드 API는 username 필드를 사용하므로 email을 username으로 전송
      const loginData = {
        username: data.email, // email을 username으로 사용
        password: data.password
      };
      console.log('📤 API 호출 데이터:', loginData);
      const response = await authApi.login(loginData as any);
      console.log('📥 API 응답:', response);
      setUser(response.user);
      
      toast.success(`환영합니다, ${response.user.username}님!`);
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ AuthContext 로그인 에러:', error);
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 회원가입 함수
   */
  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      const response = await authApi.register(data);
      setUser(response.user);
      
      toast.success('회원가입이 완료되었습니다!');
      toast.success(`개인 참가 코드: ${response.user.personalCode}`, {
        duration: 10000,  // 10초 동안 표시
      });
      
      navigate('/dashboard');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그아웃 함수
   */
  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      toast.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  /**
   * 사용자 정보 새로고침
   */
  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      throw error;
    }
  };

  // 컨텍스트 값
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth 훅 - AuthContext를 쉽게 사용하기 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  
  return context;
}