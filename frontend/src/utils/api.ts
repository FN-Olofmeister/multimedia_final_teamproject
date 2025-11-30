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

// ✅ 환경 변수 사용 (핵심!)
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:7701/api';

const api = axios.create({
  baseURL: API_BASE_URL,  // ✅ 절대 경로!
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

console.log('🌐 API Base URL:', API_BASE_URL);

// 요청 인터셉터 - 모든 요청에 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    console.log('📤 API 요청:', config.method?.toUpperCase(), config.url, config.data);
    
    const token = localStorage.getItem('token');
    if (token) {
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
    return response;
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
  async login(data: LoginRequest | { username: string; password: string }): Promise<AuthResponse> {
    const loginData = 'email' in data 
      ? { username: data.email, password: data.password }
      : data;
    
    console.log('🔐 로그인 시도:', loginData);
    
    try {
      const response = await api.post<AuthResponse>('/auth/login', loginData);
      console.log('✅ 로그인 성공:', response.data);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      throw error;
    }
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    console.log('📝 회원가입 시도:', data);
    
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      console.log('✅ 회원가입 성공:', response.data);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

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
  async getRooms(): Promise<Room[]> {
    const response = await api.get<Room[]>('/rooms');
    return response.data;
  },

  async getRoom(roomId: string): Promise<Room> {
    const response = await api.get<Room>(`/rooms/${roomId}`);
    return response.data;
  },

  async createRoom(data: {
    name: string;
    isPrivate?: boolean;
    maxParticipants?: number;
  }): Promise<Room> {
    const response = await api.post<Room>('/rooms', data);
    return response.data;
  },

  async joinRoom(roomId: string, password?: string): Promise<Room> {
    const response = await api.post<Room>(`/rooms/${roomId}/join`, { password });
    return response.data;
  },

  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/leave`);
  },

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`);
  },
};

/**
 * 사용자 관련 API
 */
export const userApi = {
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getUser(userId: string): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/users/profile', data);
    return response.data;
  },

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
    
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      
      if (Array.isArray(detail)) {
        return detail.map(err => err.msg || err.message).join(', ');
      }
      
      if (typeof detail === 'string') {
        return detail;
      }
      
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