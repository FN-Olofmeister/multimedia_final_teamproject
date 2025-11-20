"""
동영상 분석 모듈 - OpenCV와 GPT Vision API 사용
슬라이싱 기반 요약 및 인물 인식
"""

import cv2
import base64
import os
from pathlib import Path
from typing import List, Dict, Tuple, Any
import hashlib
from openai import OpenAI
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import tempfile
import time

router = APIRouter(prefix="/api/video", tags=["video"])

# OpenAI 클라이언트 초기화 (lazy initialization)
# API 키가 없어도 서버가 시작되도록 함
client = None

def get_openai_client():
    """OpenAI 클라이언트 가져오기 (필요할 때만 초기화)"""
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API 키가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY를 설정하세요."
            )
        client = OpenAI(api_key=api_key)
    return client

class VideoAnalysisResult(BaseModel):
    """동영상 분석 결과"""
    duration: float
    frame_count: int
    fps: float
    resolution: Tuple[int, int]
    file_size: int
    analysis_time: float
    summary: str
    persons_detected: List[Dict[str, Any]]
    key_frames: List[str]  # Base64 인코딩된 이미지

class FileVerificationResult(BaseModel):
    """파일 검증 결과"""
    is_valid: bool
    original_hash: str
    received_hash: str
    file_size_match: bool
    original_size: int
    received_size: int
    verification_time: float

def calculate_file_hash(file_path: str) -> str:
    """파일의 SHA256 해시 계산"""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def extract_key_frames(video_path: str, num_frames: int = 10) -> List[str]:
    """
    동영상에서 주요 프레임 추출 (슬라이싱 기반)
    균등한 간격으로 프레임 샘플링
    """
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames == 0:
        cap.release()
        raise ValueError("동영상 읽기 실패")

    # 균등한 간격으로 프레임 선택
    frame_indices = [int(i * total_frames / num_frames) for i in range(num_frames)]

    key_frames = []
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()

        if ret:
            # JPEG로 인코딩 (압축률 높임)
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            # Base64 인코딩
            frame_b64 = base64.b64encode(buffer).decode('utf-8')
            key_frames.append(frame_b64)

    cap.release()
    return key_frames

def analyze_frame_with_gpt(frame_b64: str) -> Dict:
    """
    GPT Vision API로 프레임 분석
    토큰 절약을 위해 텍스트 데이터로 변환
    """
    try:
        # OpenAI 클라이언트 가져오기
        openai_client = get_openai_client()

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # 저렴한 모델 사용
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "이 이미지를 분석해주세요. 다음 정보를 간단히 제공해주세요:\n1. 인물 수 (몇 명)\n2. 주요 활동/장면\n3. 배경/장소\n최대한 짧게 답변해주세요."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{frame_b64}",
                                "detail": "low"  # 저해상도로 분석 (토큰 절약)
                            }
                        }
                    ]
                }
            ],
            max_tokens=150
        )

        return {
            "description": response.choices[0].message.content,
            "tokens_used": response.usage.total_tokens
        }
    except Exception as e:
        print(f"GPT Vision 분석 실패: {e}")
        return {
            "description": "분석 실패",
            "tokens_used": 0
        }

@router.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """
    동영상 분석 API
    - 슬라이싱 기반 요약
    - GPT Vision API 인물 인식
    """
    start_time = time.time()

    # 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        # 동영상 메타데이터 추출
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()

        # 파일 크기
        file_size = len(content)

        # 주요 프레임 추출 (10개)
        print("📸 주요 프레임 추출 중...")
        key_frames = extract_key_frames(tmp_path, num_frames=10)

        # GPT Vision으로 전체 프레임 분석
        print(f"🤖 GPT Vision 분석 중... (총 {len(key_frames)}개 프레임)")
        persons_detected = []
        total_tokens = 0
        has_person = False

        for i, frame_b64 in enumerate(key_frames):  # 전체 프레임 분석
            print(f"  📸 프레임 {i+1}/{len(key_frames)} 분석 중...")
            result = analyze_frame_with_gpt(frame_b64)

            # "인물 없음" 감지
            description = result["description"]
            if "인물" in description.lower() and ("없" in description or "0" in description or "무" in description):
                has_person_in_frame = False
            else:
                has_person_in_frame = True
                has_person = True

            persons_detected.append({
                "frame_index": i,
                "analysis": description,
                "has_person": has_person_in_frame,
                "tokens_used": result["tokens_used"]
            })
            total_tokens += result["tokens_used"]

        # 요약 생성
        summary = f"동영상 길이: {duration:.2f}초, 해상도: {width}x{height}, FPS: {fps:.2f}\n"
        summary += f"전체 프레임 수: {frame_count}개, 분석된 프레임 수: {len(key_frames)}개\n"
        summary += f"총 사용 토큰: {total_tokens}개\n\n"

        if not has_person:
            summary += "⚠️ 동영상 전체에서 인물이 감지되지 않았습니다.\n"
        else:
            summary += "✅ 인물이 감지된 프레임:\n"
            for p in persons_detected:
                if p['has_person']:
                    summary += f"  - 프레임 {p['frame_index']+1}: {p['analysis']}\n"

            summary += "\n❌ 인물이 없는 프레임:\n"
            for p in persons_detected:
                if not p['has_person']:
                    summary += f"  - 프레임 {p['frame_index']+1}\n"

        analysis_time = time.time() - start_time

        print(f"✅ 분석 완료 (총 {total_tokens} 토큰 사용, {analysis_time:.2f}초)")

        return VideoAnalysisResult(
            duration=duration,
            frame_count=frame_count,
            fps=fps,
            resolution=(width, height),
            file_size=file_size,
            analysis_time=analysis_time,
            summary=summary,
            persons_detected=persons_detected,
            key_frames=key_frames  # 전체 프레임 반환
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"동영상 분석 실패: {str(e)}")

    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/verify")
async def verify_file(original_file: UploadFile = File(...), received_file: UploadFile = File(...)):
    """
    파일 검증 API
    - SHA256 해시 비교
    - 파일 크기 비교
    """
    start_time = time.time()

    # 원본 파일 저장
    with tempfile.NamedTemporaryFile(delete=False) as tmp1:
        original_content = await original_file.read()
        tmp1.write(original_content)
        tmp1_path = tmp1.name

    # 수신 파일 저장
    with tempfile.NamedTemporaryFile(delete=False) as tmp2:
        received_content = await received_file.read()
        tmp2.write(received_content)
        tmp2_path = tmp2.name

    try:
        # 해시 계산
        print("🔐 파일 해시 계산 중...")
        original_hash = calculate_file_hash(tmp1_path)
        received_hash = calculate_file_hash(tmp2_path)

        # 크기 비교
        original_size = len(original_content)
        received_size = len(received_content)

        is_valid = (original_hash == received_hash) and (original_size == received_size)
        verification_time = time.time() - start_time

        print(f"{'✅ 검증 성공' if is_valid else '❌ 검증 실패'} ({verification_time:.2f}초)")

        return FileVerificationResult(
            is_valid=is_valid,
            original_hash=original_hash,
            received_hash=received_hash,
            file_size_match=(original_size == received_size),
            original_size=original_size,
            received_size=received_size,
            verification_time=verification_time
        )

    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp1_path):
            os.remove(tmp1_path)
        if os.path.exists(tmp2_path):
            os.remove(tmp2_path)

# ===== 채팅 세션 관리 =====

# 메모리에 채팅 세션 저장 (파일명을 키로 사용)
chat_sessions: Dict[str, List[Dict[str, str]]] = {}

class ChatRequest(BaseModel):
    """채팅 요청"""
    question: str
    analysisResult: Dict[str, Any]
    videoInfo: Dict[str, Any]
    chatHistory: List[Dict[str, str]] = []  # 프론트엔드에서 전달받은 채팅 기록

@router.post("/chat")
async def chat_with_analysis(request: ChatRequest):
    """
    동영상 분석 결과 기반 채팅 API
    - 분석 결과를 컨텍스트로 사용
    - GPT를 통해 추가 질문에 답변
    - 대화 기억력 보장 (전체 채팅 히스토리 포함)
    """
    try:
        # OpenAI 클라이언트 가져오기
        openai_client = get_openai_client()

        filename = request.videoInfo.get('filename', 'unknown')

        # 세션 초기화 (파일별로 대화 저장)
        if filename not in chat_sessions:
            chat_sessions[filename] = []

        # 컨텍스트 구성 (동영상 정보)
        context = f"""
동영상 정보:
- 파일명: {filename}
- 길이: {request.videoInfo.get('duration', 0):.2f}초
- 해상도: {request.videoInfo.get('resolution', [0, 0])[0]}x{request.videoInfo.get('resolution', [0, 0])[1]}

분석 요약:
{request.analysisResult.get('summary', '')}

인물 감지 정보:
"""
        # 인물 정보 추가
        for person in request.analysisResult.get('persons_detected', []):
            context += f"\n- 프레임 {person.get('frame_index', 0) + 1}: {person.get('analysis', '')}"

        # GPT 메시지 구성 (시스템 메시지 + 컨텍스트 + 전체 대화 기록)
        messages = [
            {
                "role": "system",
                "content": f"""당신은 동영상 분석 전문 AI 어시스턴트입니다.
사용자의 질문에 대해 제공된 동영상 분석 결과를 바탕으로 정확하고 상세하게 답변해주세요.
동영상에 등장하는 인물의 특징, 장면 설명, 동영상 요약 등을 명확하게 전달하세요.
분석 결과에 없는 정보는 추측하지 말고, "분석 결과에 해당 정보가 없습니다"라고 답변하세요.
이전 대화 내용을 참고하여 일관성 있게 답변하세요.

{context}"""
            }
        ]

        # 프론트엔드에서 전달받은 채팅 히스토리 추가 (assistant의 초기 메시지 제외)
        for msg in request.chatHistory:
            if msg['role'] == 'user' or (msg['role'] == 'assistant' and '동영상 분석이 완료되었습니다' not in msg['content']):
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })

        # 현재 질문 추가
        messages.append({
            "role": "user",
            "content": request.question
        })

        # GPT 호출
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        answer = response.choices[0].message.content

        # 세션에 대화 저장
        chat_sessions[filename].append({
            "role": "user",
            "content": request.question,
            "timestamp": time.time()
        })
        chat_sessions[filename].append({
            "role": "assistant",
            "content": answer,
            "timestamp": time.time()
        })

        return {
            "answer": answer,
            "tokens_used": response.usage.total_tokens,
            "session_id": filename,
            "message_count": len(chat_sessions[filename])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 처리 실패: {str(e)}")

@router.get("/chat/history/{filename}")
async def get_chat_history(filename: str):
    """
    특정 파일의 채팅 기록 조회
    """
    if filename not in chat_sessions:
        return {
            "history": [],
            "message_count": 0
        }

    return {
        "history": chat_sessions[filename],
        "message_count": len(chat_sessions[filename])
    }

@router.delete("/chat/history/{filename}")
async def clear_chat_history(filename: str):
    """
    특정 파일의 채팅 기록 삭제
    """
    if filename in chat_sessions:
        del chat_sessions[filename]

    return {
        "message": "채팅 기록이 삭제되었습니다",
        "filename": filename
    }
