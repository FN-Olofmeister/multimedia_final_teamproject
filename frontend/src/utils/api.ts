/**
 * API 유틸리티 - 백엔드와 통신하는 함수들
 * axios를 사용해서 HTTP 요청을 보냅니다
 */

import axios, { AxiosError } from 'axios';
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  Room, 
  ApiError 
} from '@/types';

// axios 인스턴스 생성 - 기본 설정을 가진 HTTP 클라이언트
// E2B 환경에서는 프록시가 제대로 작동하지 않을 수 있으므로 직접 백엔드 URL 사용
const API_BASE_URL = window.location.hostname.includes('e2b.dev') 
  ? 'https://8000-i37urfutaoyq78dgicu29-6532622b.e2b.dev/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,  // 환경에 따라 다른 URL 사용
  headers: {
    'Content-Type': 'application/json',  // JSON 형식으로 데이터 전송
  },
  withCredentials: false,  // CORS 문제 방지
});

console.log('🌐 API Base URL:', API_BASE_URL);

// 요청 인터셉터 - 모든 요청에 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    console.log('📤 API 요청:', config.method?.toUpperCase(), config.url, config.data);
    
    // localStorage에서 토큰 가져오기
    const token = localStorage.getItem('token');
    if (token) {
      // 토큰이 있으면 Authorization 헤더에 추가
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ 요청 인터셉터 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log('✅ API 응답 성공:', response.config.url, response.data);
    return response;  // 성공하면 그대로 반환
  },
  (error: AxiosError<ApiError>) => {
    console.error('❌ API 에러:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // 401 에러 (인증 실패)면 로그인 페이지로 이동
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * 인증 관련 API
 */
export const authApi = {
  // 로그인 - username(이메일 또는 사용자명)과 비밀번호로 로그인
  async login(data: LoginRequest | { username: string; password: string }): Promise<AuthResponse> {
    // LoginRequest의 email을 username으로 변환
    const loginData = 'email' in data 
      ? { username: data.email, password: data.password }
      : data;
    
    console.log('🔐 로그인 시도:', loginData);
    
    try {
      const response = await api.post<AuthResponse>('/auth/login', loginData);
      console.log('✅ 로그인 성공:', response.data);
      // 토큰과 사용자 정보를 localStorage에 저장
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      throw error;
    }
  },

  // 회원가입 - 초대 코드 필수!
  async register(data: RegisterRequest): Promise<AuthResponse> {
    console.log('📝 회원가입 시도:', data);
    
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      console.log('✅ 회원가입 성공:', response.data);
      // 토큰과 사용자 정보를 localStorage에 저장
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      throw error;
    }
  },

  // 로그아웃
  async logout(): Promise<void> {
    // localStorage에서 토큰과 사용자 정보 삭제
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // 현재 사용자 정보 가져오기
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // 토큰 갱신
  async refreshToken(): Promise<string> {
    const response = await api.post<{ access_token: string }>('/auth/refresh');
    const newToken = response.data.access_token;
    localStorage.setItem('token', newToken);
    return newToken;
  },
};

/**
 * 방(Room) 관련 API
 */
export const roomApi = {
  // 모든 방 목록 가져오기
  async getRooms(): Promise<Room[]> {
    const response = await api.get<Room[]>('/rooms');
    return response.data;
  },

  // 특정 방 정보 가져오기
  async getRoom(roomId: string): Promise<Room> {
    const response = await api.get<Room>(`/rooms/${roomId}`);
    return response.data;
  },

  // 새 방 만들기
  async createRoom(data: {
    name: string;
    isPrivate?: boolean;
    maxParticipants?: number;
  }): Promise<Room> {
    const response = await api.post<Room>('/rooms', data);
    return response.data;
  },

  // 방 참가하기
  async joinRoom(roomId: string, password?: string): Promise<Room> {
    const response = await api.post<Room>(`/rooms/${roomId}/join`, { password });
    return response.data;
  },

  // 방 나가기
  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/leave`);
  },

  // 방 삭제하기 (방장만 가능)
  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`);
  },
};

/**
 * 사용자 관련 API
 */
export const userApi = {
  // 모든 사용자 목록 가져오기
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  // 특정 사용자 정보 가져오기
  async getUser(userId: string): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  // 프로필 업데이트
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/users/profile', data);
    return response.data;
  },

  // 아바타 업로드
  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post<{ url: string }>(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
};

// 에러 처리 헬퍼 함수
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    // FastAPI validation error 처리
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      
      // ValidationError 배열인 경우
      if (Array.isArray(detail)) {
        return detail.map(err => err.msg || err.message).join(', ');
      }
      
      // 문자열인 경우
      if (typeof detail === 'string') {
        return detail;
      }
      
      // 객체인 경우
      if (typeof detail === 'object' && detail.msg) {
        return detail.msg;
      }
    }
    
    return axiosError.response?.data?.error || 
           axiosError.message ||
           '알 수 없는 오류가 발생했습니다';
  }
  return '알 수 없는 오류가 발생했습니다';
}

export default api;