import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite configuration file - 웹 애플리케이션 빌드 도구 설정
export default defineConfig({
  plugins: [react()], // React 플러그인 사용
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @ 경로를 src 폴더로 매핑
    },
  },
  define: {
    // SimplePeer와 같은 라이브러리를 위한 Node.js 전역 변수 정의
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    // SimplePeer 종속성 사전 번들링
    include: ['simple-peer'],
  },
  server: {
    port: 7700, // 개발 서버 포트 (VideoNet Pro 전용)
    strictPort: true, // 포트 고정 (다른 포트로 변경 방지)
    host: true, // 외부 접속 허용 (중요!)
    // E2B 샌드박스 환경에서 외부 접근 허용
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'videonet.jhlab.ai.kr', // VideoNet Pro 도메인
      '.jhlab.ai.kr', // 모든 jhlab.ai.kr 서브도메인 허용
      '.e2b.dev', // 모든 e2b.dev 서브도메인 허용
      '3000-i37urfutaoyq78dgicu29-6532622b.e2b.dev' // 특정 호스트 허용
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:7701', // 백엔드 서버 주소 (VideoNet Pro)
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:7701', // Socket.IO 연결 (VideoNet Pro)
        ws: true, // WebSocket 지원
        changeOrigin: true,
      },
    },
  },
})