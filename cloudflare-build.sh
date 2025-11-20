#!/bin/bash

# Cloudflare Pages 빌드 스크립트
echo "🚀 Starting Cloudflare Pages build..."

# Frontend 디렉토리로 이동하여 빌드
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo "🔨 Building frontend..."
npm run build

# 빌드된 파일을 루트의 dist 폴더로 복사
echo "📂 Copying build files to root dist..."
cd ..
rm -rf dist
cp -r frontend/dist .

echo "✅ Build completed successfully!"
echo "📁 Build output is in ./dist"