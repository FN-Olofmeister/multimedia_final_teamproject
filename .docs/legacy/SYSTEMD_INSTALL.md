# VideoNet Pro - systemd 서비스 설치 가이드

> **작성자**: 김재형 (20205146, 한림대학교 콘텐츠IT학과)
> **프로젝트**: AI+X 프로젝트 과제물 · 2025년 제작

---

## systemd 서비스 설치하기

systemd 서비스를 설치하면 **컴퓨터를 껐다 켜도 VideoNet Pro가 자동으로 시작**됩니다!

### 1단계: 서비스 파일 복사

터미널에서 다음 명령어를 실행하세요:

```bash
sudo cp /tmp/videonet-backend.service /etc/systemd/system/
sudo cp /tmp/videonet-frontend.service /etc/systemd/system/
```

### 2단계: systemd 데몬 리로드

```bash
sudo systemctl daemon-reload
```

### 3단계: 서비스 활성화 및 시작

```bash
# 백엔드 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable videonet-backend

# 백엔드 서비스 시작
sudo systemctl start videonet-backend

# 프론트엔드 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable videonet-frontend

# 프론트엔드 서비스 시작
sudo systemctl start videonet-frontend
```

### 4단계: 서비스 상태 확인

```bash
# 백엔드 상태 확인
sudo systemctl status videonet-backend

# 프론트엔드 상태 확인
sudo systemctl status videonet-frontend
```

정상적으로 실행 중이면 **Active: active (running)** 이라고 표시됩니다!

---

## 유용한 명령어

### 서비스 재시작
```bash
sudo systemctl restart videonet-backend
sudo systemctl restart videonet-frontend
```

### 서비스 중지
```bash
sudo systemctl stop videonet-backend
sudo systemctl stop videonet-frontend
```

### 서비스 비활성화 (부팅 시 자동 시작 해제)
```bash
sudo systemctl disable videonet-backend
sudo systemctl disable videonet-frontend
```

### 로그 확인
```bash
# 백엔드 로그 (실시간)
sudo journalctl -u videonet-backend -f

# 프론트엔드 로그 (실시간)
sudo journalctl -u videonet-frontend -f

# 최근 50줄 로그
sudo journalctl -u videonet-backend -n 50
sudo journalctl -u videonet-frontend -n 50
```

---

## 트러블슈팅

### 서비스가 시작되지 않을 때

1. **로그 확인**
```bash
sudo journalctl -u videonet-backend -n 50
```

2. **포트 충돌 확인**
```bash
lsof -i :7701  # 백엔드 포트
lsof -i :7700  # 프론트엔드 포트
```

3. **기존 프로세스 종료**
```bash
# 백엔드 종료
pkill -f "uvicorn main:app"

# 프론트엔드 종료
lsof -i :7700 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

4. **서비스 재시작**
```bash
sudo systemctl restart videonet-backend
sudo systemctl restart videonet-frontend
```

### 환경 변수가 로드되지 않을 때

`/home/kitri/videonet/backend/.env` 파일이 존재하는지 확인하세요:

```bash
ls -la /home/kitri/videonet/backend/.env
```

없다면 `.env.example`을 복사하고 수정하세요:

```bash
cd /home/kitri/videonet/backend
cp .env.example .env
nano .env  # OpenAI API Key 등 입력
```

---

## 현재 상태 (2025년 10월 26일)

현재 VideoNet Pro는 **백그라운드 프로세스로 실행 중**입니다:
- 백엔드: `http://localhost:7701` (PID 907102)
- 프론트엔드: `http://localhost:7700` (PID 907170)

systemd 서비스를 설치하면:
- ✅ 컴퓨터 재부팅 시 자동 시작
- ✅ 크래시 시 자동 재시작 (RestartSec=5)
- ✅ systemctl로 간편한 관리
- ✅ 로그 중앙 관리 (journalctl)

---

**참고**: systemd 서비스 파일은 이미 `/tmp/videonet-backend.service`, `/tmp/videonet-frontend.service`에 준비되어 있습니다!
