// src/utils/socket.ts
import { io, type Socket } from "socket.io-client";

function getSocketBaseUrl() {
  // ✅ 배포: VITE_SOCKET_URL 우선
  const envUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  // ✅ 개발: Vite 서버(7700) 기준으로 상대경로 연결 -> vite proxy가 /socket.io 를 백엔드로 넘김
  return window.location.origin;
}

export function createSocket(authToken?: string | null): Socket {
  return io(getSocketBaseUrl(), {
    path: "/socket.io",                // ⚠️ 슬래시 통일 (뒤에 / 붙이지 말기)
    transports: ["websocket", "polling"],
    auth: authToken ? { token: authToken } : undefined,
  });
}
