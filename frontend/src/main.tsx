/**
 * 애플리케이션 진입점 - React 앱을 DOM에 렌더링합니다
 */

// SimplePeer와 같은 Node.js 라이브러리를 위한 폴리필 설정
// 이 설정은 import 문 전에 와야 합니다
if (typeof global === 'undefined') {
  (window as any).global = window;
}
(window as any).process = { env: {} };

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';  // Tailwind CSS와 커스텀 스타일

// React 18의 createRoot API 사용
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);