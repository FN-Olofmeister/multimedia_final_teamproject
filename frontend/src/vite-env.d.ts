/// <reference types="vite/client" />

// Vite 환경 타입 정의 파일
// SimplePeer와 같은 Node.js 라이브러리를 위한 전역 변수 타입 정의

declare global {
  interface Window {
    global: Window;
    process: any;
    Buffer: any;
  }
}

// Vite 환경 변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  // 다른 환경 변수들을 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}