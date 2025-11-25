# VideoNet Pro AI 코딩 지침

## 🚨 중요 규칙 (CLAUDE.md 참고)
1.  **모의 데이터/가짜 구현 금지 (NO MOCKS / NO FAKES)**: 절대 모의(mock) 데이터, 임시 수정, 또는 "테스트 전용" 구현을 생성하지 마십시오. 모든 코드는 프로덕션 수준이어야 하며 완전히 작동해야 합니다.
2.  **근본 원인 분석**: 문제를 피상적으로 해결하지 말고 근본적으로 해결하십시오.
3.  **프로덕션 품질**: 모든 코드에 강력한 오류 처리, 로깅 및 보안 검사를 포함하십시오.
4.  **언어**: **AI는 항상 한국어로 대답해야 합니다.** 코드 주석과 문서 또한 한국어로 작성하십시오.

## 프로젝트 아키텍처
**VideoNet Pro**는 AI 기능이 포함된 하이브리드 WebRTC/Socket.IO 화상 회의 플랫폼입니다.

### 백엔드 (`/backend`)
-   **프레임워크**: FastAPI + python-socketio (Async).
-   **데이터베이스**: SQLite (`videonet.db`).
    -   **패턴**: SQLAlchemy ORM이 요구사항에 있더라도 사용하지 않고, `get_db` 컨텍스트 매니저를 통해 **Raw SQL** (`sqlite3`)을 사용합니다.
-   **인증**: JWT (HS256). 비밀번호는 bcrypt로 해시 처리됩니다.
-   **주요 파일**:
    -   `main.py`: REST API 엔드포인트 및 DB 로직.
    -   `socketio_server.py`: 실시간 이벤트 처리 (시그널링, 채팅).
    -   `video_analysis.py`: GPT Vision API 통합.

### 프론트엔드 (`/frontend`)
-   **프레임워크**: React 18 + Vite + TypeScript.
-   **스타일링**: Tailwind CSS (Discord 영감 다크 테마: `#1e1f2e`).
-   **상태 관리**: Zustand (`src/contexts` 및 stores).
-   **네트워크**:
    -   REST: `axios` -> 포트 7701.
    -   실시간: `socket.io-client`.
    -   P2P: 커스텀 WebRTC 구현 (`src/utils/webrtc-native.ts` 참조).

## 개발 워크플로우
-   **포트**:
    -   프론트엔드: `7700`
    -   백엔드: `7701`
-   **시작**:
    -   백엔드: `cd backend && uvicorn main:app --host 0.0.0.0 --port 7701`
    -   프론트엔드: `cd frontend && npm run dev`

## 구현 패턴 및 규칙
-   **데이터 매핑**:
    -   백엔드는 DB/내부 로직에 **snake_case**를 사용합니다.
    -   API 응답은 프론트엔드를 위해 종종 수동으로 **camelCase**로 매핑됩니다 (예: `personal_code` -> `personalCode`). **`main.py`의 응답 모델을 주의 깊게 확인하십시오.**
-   **파일 전송**:
    -   Socket.IO 청크(16KB 제한)를 통해 구현되었습니다.
    -   무결성을 위해 SHA256 해시 검증이 필요합니다.
-   **동영상 분석**:
    -   OpenCV를 사용하여 프레임을 자르고 -> GPT-4o-mini Vision API를 사용합니다.
    -   토큰 사용 최적화 (low detail, max tokens).
-   **언어**: 주요 문서와 주석은 **한국어**로 작성해야 합니다.

## 일반 작업
-   **API 엔드포인트 추가**: `main.py`를 Raw SQL 쿼리로 업데이트하십시오. 프론트엔드로 반환할 때 수동 JSON 매핑을 확인하십시오.
-   **소켓 이벤트**: `socketio_server.py`에 이벤트를 정의하고 프론트엔드 컴포넌트에서 해당 리스너를 처리하십시오.

## 프로젝트 개조 및 기능 추가 가이드
이 프로젝트는 **기존 코드베이스를 개조하고 새로운 기능을 추가하는 것이 목적**입니다.

### 프로젝트 파악 순서
1. **`.docs/PROJECT_STATUS.md`** - 현재 프로젝트 상태 및 진단 결과 확인
2. **`.docs/FEATURE_PLAN.md`** - 추가할 기능 및 개선 계획 확인
3. **주요 파일 분석** - `backend/main.py`, `frontend/src/pages/RoomPage.tsx` 등 핵심 파일 구조 파악
4. **기능 테스트** - 실제 동작 확인 후 개선점 도출

### 개조 작업 시 주의사항
-   기존 기능을 망가뜨리지 않도록 **점진적으로** 수정
-   새 기능 추가 전 반드시 **기존 코드 동작 확인**
-   변경 사항은 `.docs/CHANGELOG.md`에 기록
