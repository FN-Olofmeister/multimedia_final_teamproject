"""
VideoNet Pro - 통합 서버 실행
FastAPI + Socket.IO를 함께 실행합니다

실행 방법: python run.py
"""

import uvicorn
from main import combined_app

if __name__ == "__main__":
    print("=" * 60)
    print("[VideoNet Pro] Backend starting on port 7701")
    print("=" * 60)
    print("REST API: http://localhost:7701")
    print("API Docs: http://localhost:7701/docs")
    print("Socket.IO: ws://localhost:7701/socket.io")
    print("=" * 60)

    # reload=True는 import string 방식에서만 작동
    # 개발 시 자동 재시작이 필요하면 uvicorn 명령어 직접 사용 권장:
    # uvicorn main:combined_app --host 0.0.0.0 --port 7701 --reload
    uvicorn.run(
        combined_app,
        host="0.0.0.0",
        port=7701,
        log_level="info"
    )
