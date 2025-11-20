#!/bin/bash

# VideoNet Pro 서비스 설치 스크립트

echo "🔧 VideoNet Pro 서비스를 설치합니다..."

# 1. 기존 프로세스 종료
echo "📌 기존 프로세스 종료 중..."
pkill -f "uvicorn main:app --host 0.0.0.0 --port 7701" 2>/dev/null
lsof -i :7700 | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null

# 2. systemd 서비스 파일 복사
echo "📌 systemd 서비스 파일 복사 중..."
sudo cp /tmp/videonet-backend.service /etc/systemd/system/
sudo cp /tmp/videonet-frontend.service /etc/systemd/system/

# 3. systemd 데몬 리로드
echo "📌 systemd 데몬 리로드 중..."
sudo systemctl daemon-reload

# 4. 서비스 활성화 및 시작
echo "📌 백엔드 서비스 시작 중..."
sudo systemctl enable videonet-backend
sudo systemctl start videonet-backend

echo "📌 프론트엔드 서비스 시작 중..."
sudo systemctl enable videonet-frontend
sudo systemctl start videonet-frontend

# 5. 서비스 상태 확인
sleep 3
echo ""
echo "✅ 설치 완료!"
echo ""
echo "📊 서비스 상태:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl status videonet-backend --no-pager -l | head -15
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl status videonet-frontend --no-pager -l | head -15
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 VideoNet Pro가 성공적으로 설치되었습니다!"
echo ""
echo "📌 유용한 명령어:"
echo "   sudo systemctl restart videonet-backend   # 백엔드 재시작"
echo "   sudo systemctl restart videonet-frontend  # 프론트엔드 재시작"
echo "   sudo systemctl stop videonet-backend      # 백엔드 중지"
echo "   sudo systemctl stop videonet-frontend     # 프론트엔드 중지"
echo "   sudo journalctl -u videonet-backend -f    # 백엔드 로그 보기"
echo "   sudo journalctl -u videonet-frontend -f   # 프론트엔드 로그 보기"
echo ""
