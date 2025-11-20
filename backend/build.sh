#!/usr/bin/env bash
# Render 빌드 스크립트

set -o errexit

# Python 패키지 설치
pip install -r requirements.txt

# 데이터베이스 초기화 (필요시)
python -c "from database import engine, Base; Base.metadata.create_all(bind=engine)"

echo "Build completed successfully!"