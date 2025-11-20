#!/bin/bash
# VideoNet Pro Frontend Startup Script

# NVM 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 작업 디렉토리로 이동
cd /home/kitri/videonet/frontend

# npm run dev 실행
npm run dev
