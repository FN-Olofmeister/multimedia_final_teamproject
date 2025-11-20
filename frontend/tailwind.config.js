/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Discord 색상 팔레트
        discord: {
          dark: '#202225',     // 가장 어두운 배경
          darker: '#2f3136',   // 사이드바 배경
          light: '#36393f',    // 메인 채팅 배경
          hover: '#34373c',    // 호버 상태
          brand: '#5865f2',    // Discord 브랜드 색상
          brandHover: '#4752c4',
        },
        // Zoom 색상 팔레트
        zoom: {
          blue: '#2d8cff',     // Zoom 브랜드 파란색
          darkBlue: '#0b5cff', // 진한 파란색
          hover: '#1a76e0',    // 호버 상태
        },
        // 상태 색상
        status: {
          online: '#3ba55c',   // 온라인 상태
          idle: '#faa61a',     // 자리비움 상태
          dnd: '#ed4245',      // 방해금지 상태
          offline: '#747f8d',  // 오프라인 상태
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}