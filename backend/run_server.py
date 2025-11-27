"""
VideoNet Pro - 통합 서버 실행
FastAPI + Socket.IO를 함께 실행합니다
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from main import app as fastapi_app
from socketio_server import socket_app, sio

# FastAPI 앱에 Socket.IO 마운트
fastapi_app.mount("/socket.io", socket_app)

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 VideoNet Pro 서버 시작")
    print("=" * 50)
    print("📍 API Server: http://localhost:7701")
    print("📍 API Docs: http://localhost:7701/docs")
    print("🔌 Socket.IO: ws://localhost:7701/socket.io")
    print("=" * 50)
    
    # 서버 실행
    uvicorn.run(
        fastapi_app, 
        host="0.0.0.0", 
        port=7701,
        log_level="info"
    )