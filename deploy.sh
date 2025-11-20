#!/bin/bash

echo "🚀 VideoNet Pro 배포 스크립트"
echo "=============================="

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}어느 플랫폼에 배포하시겠습니까?${NC}"
echo "1) Render (추천 - 가장 쉬움)"
echo "2) Vercel + Railway"
echo "3) Netlify + Supabase"
echo "4) GitHub Pages + Cloudflare"

read -p "선택 (1-4): " choice

case $choice in
  1)
    echo -e "${GREEN}Render 배포 시작...${NC}"
    echo "1. https://render.com 접속"
    echo "2. GitHub 계정으로 로그인"
    echo "3. New > Blueprint 클릭"
    echo "4. Repository: kjhk3082/Videonet 연결"
    echo "5. render.yaml 파일이 자동으로 감지됨"
    echo "6. Apply 클릭"
    echo ""
    echo "✅ 약 10분 후 배포 완료!"
    echo "URL: https://videonet-frontend.onrender.com"
    ;;
    
  2)
    echo -e "${GREEN}Vercel + Railway 배포 시작...${NC}"
    
    # Frontend (Vercel)
    echo "📦 Frontend 배포 (Vercel)..."
    cd frontend
    npx vercel --prod
    
    # Backend (Railway)
    echo "📦 Backend 배포 (Railway)..."
    cd ../backend
    railway login
    railway init
    railway up
    
    echo "✅ 배포 완료!"
    ;;
    
  3)
    echo -e "${GREEN}Netlify + Supabase 배포 시작...${NC}"
    
    # Frontend
    echo "📦 Frontend 배포 (Netlify)..."
    cd frontend
    npm run build
    npx netlify deploy --prod --dir=dist
    
    echo "📦 Backend는 Supabase에서 수동 설정 필요"
    echo "https://supabase.com 에서 프로젝트 생성"
    ;;
    
  4)
    echo -e "${GREEN}GitHub Pages 배포 시작...${NC}"
    cd frontend
    npm run build
    git add dist -f
    git commit -m "Deploy to GitHub Pages"
    git subtree push --prefix frontend/dist origin gh-pages
    
    echo "✅ GitHub Pages 배포 완료!"
    echo "Settings > Pages에서 활성화 필요"
    ;;
esac

echo ""
echo "=============================="
echo "🎉 배포 프로세스 완료!"