"""
이미지/영상 압축 및 품질 평가 모듈
- JPEG/PNG 압축품질 조절
- PSNR (Peak Signal-to-Noise Ratio) 계산
- SSIM (Structural Similarity Index) 계산
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any
import tempfile
import time
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from skimage.metrics import peak_signal_noise_ratio, structural_similarity
import io
from PIL import Image

router = APIRouter(prefix="/api/compression", tags=["Image Compression"])


class CompressionResult(BaseModel):
    """압축 결과"""
    quality: int
    original_size: int
    compressed_size: int
    compression_ratio: float
    psnr: float
    ssim: float
    processing_time: float


class CompressionAnalysis(BaseModel):
    """압축 품질별 분석 결과"""
    original_size: int
    results: List[CompressionResult]
    image_width: int
    image_height: int
    image_format: str


def calculate_psnr(original: np.ndarray, compressed: np.ndarray) -> float:
    """
    PSNR (Peak Signal-to-Noise Ratio) 계산
    높을수록 품질이 좋음 (일반적으로 30dB 이상이면 양호)
    """
    if original.shape != compressed.shape:
        raise ValueError("이미지 크기가 다릅니다")

    # 이미지가 3채널(컬러)인 경우 평균 계산
    if len(original.shape) == 3:
        psnr_value = peak_signal_noise_ratio(original, compressed, data_range=255)
    else:
        psnr_value = peak_signal_noise_ratio(original, compressed, data_range=255)

    return float(psnr_value)


def calculate_ssim(original: np.ndarray, compressed: np.ndarray) -> float:
    """
    SSIM (Structural Similarity Index) 계산
    0~1 사이 값, 1에 가까울수록 원본과 유사함
    """
    if original.shape != compressed.shape:
        raise ValueError("이미지 크기가 다릅니다")

    # 이미지가 3채널(컬러)인 경우
    if len(original.shape) == 3:
        ssim_value = structural_similarity(
            original, compressed,
            channel_axis=2,  # 컬러 채널 축
            data_range=255
        )
    else:
        ssim_value = structural_similarity(
            original, compressed,
            data_range=255
        )

    return float(ssim_value)


def compress_image_jpeg(image: np.ndarray, quality: int) -> Tuple[bytes, int]:
    """
    JPEG 압축
    quality: 0-100 (높을수록 고품질)
    """
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, encoded_image = cv2.imencode('.jpg', image, encode_param)
    compressed_bytes = encoded_image.tobytes()
    compressed_size = len(compressed_bytes)

    return compressed_bytes, compressed_size


def compress_image_png(image: np.ndarray, compression_level: int) -> Tuple[bytes, int]:
    """
    PNG 압축
    compression_level: 0-9 (높을수록 압축률 높음, 속도 느림)
    """
    encode_param = [int(cv2.IMWRITE_PNG_COMPRESSION), compression_level]
    _, encoded_image = cv2.imencode('.png', image, encode_param)
    compressed_bytes = encoded_image.tobytes()
    compressed_size = len(compressed_bytes)

    return compressed_bytes, compressed_size


def decompress_image(compressed_bytes: bytes) -> np.ndarray:
    """압축된 이미지를 numpy 배열로 디코딩"""
    nparr = np.frombuffer(compressed_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return image


@router.post("/analyze-image", response_model=CompressionAnalysis)
async def analyze_image_compression(
    file: UploadFile = File(...),
    format: str = Form("jpeg"),  # "jpeg" 또는 "png"
    quality_levels: str = Form("10,30,50,70,90")  # 쉼표로 구분된 품질 레벨
):
    """
    이미지 압축 품질별 분석
    - 여러 품질 레벨로 압축
    - 각 레벨별 파일 크기, PSNR, SSIM 계산
    """
    start_time = time.time()

    # 파일 읽기
    content = await file.read()
    original_size = len(content)

    # 이미지 디코딩
    nparr = np.frombuffer(content, np.uint8)
    original_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if original_image is None:
        raise HTTPException(status_code=400, detail="이미지 파일을 읽을 수 없습니다")

    height, width = original_image.shape[:2]

    # 품질 레벨 파싱
    try:
        qualities = [int(q.strip()) for q in quality_levels.split(',')]
    except ValueError:
        raise HTTPException(status_code=400, detail="품질 레벨 형식이 잘못되었습니다")

    results = []

    for quality in qualities:
        iter_start = time.time()

        # 압축
        if format.lower() == "jpeg":
            if not (0 <= quality <= 100):
                raise HTTPException(status_code=400, detail="JPEG 품질은 0-100 사이여야 합니다")
            compressed_bytes, compressed_size = compress_image_jpeg(original_image, quality)
        elif format.lower() == "png":
            if not (0 <= quality <= 9):
                raise HTTPException(status_code=400, detail="PNG 압축 레벨은 0-9 사이여야 합니다")
            compressed_bytes, compressed_size = compress_image_png(original_image, quality)
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 형식입니다 (jpeg 또는 png)")

        # 압축 해제 (품질 평가용)
        compressed_image = decompress_image(compressed_bytes)

        # PSNR 계산
        psnr = calculate_psnr(original_image, compressed_image)

        # SSIM 계산
        ssim = calculate_ssim(original_image, compressed_image)

        # 압축률 계산
        compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0

        iter_time = time.time() - iter_start

        results.append(CompressionResult(
            quality=quality,
            original_size=original_size,
            compressed_size=compressed_size,
            compression_ratio=compression_ratio,
            psnr=psnr,
            ssim=ssim,
            processing_time=iter_time
        ))

        print(f"품질 {quality}: 크기={compressed_size}bytes, PSNR={psnr:.2f}dB, SSIM={ssim:.4f}")

    total_time = time.time() - start_time
    print(f"전체 분석 완료: {total_time:.2f}초")

    return CompressionAnalysis(
        original_size=original_size,
        results=results,
        image_width=width,
        image_height=height,
        image_format=format.lower()
    )


@router.post("/compress-image")
async def compress_single_image(
    file: UploadFile = File(...),
    quality: int = Form(80),
    format: str = Form("jpeg")
):
    """
    단일 이미지 압축
    - 지정된 품질로 압축
    - 압축된 이미지 반환 (Base64)
    """
    # 파일 읽기
    content = await file.read()
    original_size = len(content)

    # 이미지 디코딩
    nparr = np.frombuffer(content, np.uint8)
    original_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if original_image is None:
        raise HTTPException(status_code=400, detail="이미지 파일을 읽을 수 없습니다")

    # 압축
    if format.lower() == "jpeg":
        compressed_bytes, compressed_size = compress_image_jpeg(original_image, quality)
    elif format.lower() == "png":
        compressed_bytes, compressed_size = compress_image_png(original_image, quality)
    else:
        raise HTTPException(status_code=400, detail="지원하지 않는 형식입니다")

    # Base64 인코딩
    compressed_b64 = base64.b64encode(compressed_bytes).decode('utf-8')

    # 압축 해제 후 품질 지표 계산
    compressed_image = decompress_image(compressed_bytes)
    psnr = calculate_psnr(original_image, compressed_image)
    ssim = calculate_ssim(original_image, compressed_image)
    compression_ratio = (1 - compressed_size / original_size) * 100

    return {
        "original_size": original_size,
        "compressed_size": compressed_size,
        "compression_ratio": compression_ratio,
        "psnr": psnr,
        "ssim": ssim,
        "compressed_image_base64": compressed_b64,
        "format": format.lower()
    }


@router.post("/analyze-video", response_model=CompressionAnalysis)
async def analyze_video_compression(
    file: UploadFile = File(...),
    quality_levels: str = Form("10,30,50,70,90"),
    sample_frame_count: int = Form(5)  # 샘플링할 프레임 수
):
    """
    동영상 압축 품질별 분석
    - 균등하게 샘플링한 프레임들에 대해 압축 분석
    - 평균 PSNR, SSIM 계산
    """
    start_time = time.time()

    # 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        # 동영상 열기
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if total_frames == 0:
            raise HTTPException(status_code=400, detail="동영상을 읽을 수 없습니다")

        # 샘플 프레임 인덱스 계산
        frame_indices = [int(i * total_frames / sample_frame_count) for i in range(sample_frame_count)]

        # 품질 레벨 파싱
        try:
            qualities = [int(q.strip()) for q in quality_levels.split(',')]
        except ValueError:
            raise HTTPException(status_code=400, detail="품질 레벨 형식이 잘못되었습니다")

        # 각 품질 레벨별로 분석
        results = []

        for quality in qualities:
            total_original_size = 0
            total_compressed_size = 0
            psnr_values = []
            ssim_values = []

            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()

                if not ret:
                    continue

                # 원본 프레임 크기
                _, original_encoded = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
                original_size = len(original_encoded.tobytes())

                # 압축
                compressed_bytes, compressed_size = compress_image_jpeg(frame, quality)
                compressed_frame = decompress_image(compressed_bytes)

                # 지표 계산
                psnr = calculate_psnr(frame, compressed_frame)
                ssim = calculate_ssim(frame, compressed_frame)

                total_original_size += original_size
                total_compressed_size += compressed_size
                psnr_values.append(psnr)
                ssim_values.append(ssim)

            # 평균 계산
            avg_psnr = np.mean(psnr_values) if psnr_values else 0
            avg_ssim = np.mean(ssim_values) if ssim_values else 0
            compression_ratio = (1 - total_compressed_size / total_original_size) * 100 if total_original_size > 0 else 0

            results.append(CompressionResult(
                quality=quality,
                original_size=total_original_size,
                compressed_size=total_compressed_size,
                compression_ratio=compression_ratio,
                psnr=float(avg_psnr),
                ssim=float(avg_ssim),
                processing_time=0.0
            ))

            print(f"품질 {quality}: 평균 PSNR={avg_psnr:.2f}dB, 평균 SSIM={avg_ssim:.4f}")

        cap.release()

        total_time = time.time() - start_time
        print(f"동영상 분석 완료: {total_time:.2f}초")

        return CompressionAnalysis(
            original_size=total_original_size,
            results=results,
            image_width=width,
            image_height=height,
            image_format="video/mp4"
        )

    finally:
        # 임시 파일 삭제
        import os
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


class WebcamFrameRequest(BaseModel):
    """웹캠 프레임 압축 요청"""
    frame_base64: str
    quality: int = 80


@router.post("/compress-webcam-frame")
async def compress_webcam_frame(request: WebcamFrameRequest):
    """
    웹캠 프레임 압축 (Base64 입력)
    - 웹캠에서 캡처한 프레임을 압축
    - 압축된 이미지와 품질 지표 반환
    """
    try:
        # Base64 디코딩
        frame_bytes = base64.b64decode(request.frame_base64)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        original_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if original_frame is None:
            raise HTTPException(status_code=400, detail="프레임을 디코딩할 수 없습니다")

        original_size = len(frame_bytes)

        # 압축
        compressed_bytes, compressed_size = compress_image_jpeg(original_frame, request.quality)
        compressed_frame = decompress_image(compressed_bytes)

        # 품질 지표 계산
        psnr = calculate_psnr(original_frame, compressed_frame)
        ssim = calculate_ssim(original_frame, compressed_frame)
        compression_ratio = (1 - compressed_size / original_size) * 100

        # Base64로 재인코딩
        compressed_b64 = base64.b64encode(compressed_bytes).decode('utf-8')

        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": compression_ratio,
            "psnr": psnr,
            "ssim": ssim,
            "compressed_frame_base64": compressed_b64
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"프레임 압축 실패: {str(e)}")


@router.post("/compress-video")
async def compress_video(
    file: UploadFile = File(...),
    quality: int = Form(23),  # CRF 값 (0-51, 낮을수록 고품질, 23이 기본)
    preset: str = Form("medium")  # ultrafast, fast, medium, slow
):
    """
    동영상 압축 (FFmpeg/OpenCV 사용)
    - H.264 코덱으로 재인코딩
    - 압축된 동영상 반환
    """
    import subprocess
    import shutil
    
    # FFmpeg 확인
    ffmpeg_path = shutil.which('ffmpeg')
    if not ffmpeg_path:
        raise HTTPException(status_code=500, detail="FFmpeg가 설치되어 있지 않습니다")
    
    # 임시 파일 생성
    input_suffix = Path(file.filename).suffix or '.mp4'
    output_suffix = '.mp4'
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as input_tmp:
        content = await file.read()
        original_size = len(content)
        input_tmp.write(content)
        input_path = input_tmp.name
    
    output_path = input_path.replace(input_suffix, f'_compressed{output_suffix}')
    
    try:
        # CRF 값 검증 (0-51)
        crf = max(0, min(51, quality))
        
        # FFmpeg 명령어
        cmd = [
            ffmpeg_path,
            '-i', input_path,
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', str(crf),
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            output_path
        ]
        
        # FFmpeg 실행
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"FFmpeg 오류: {result.stderr}")
        
        # 압축된 파일 읽기
        with open(output_path, 'rb') as f:
            compressed_content = f.read()
        
        compressed_size = len(compressed_content)
        compression_ratio = (1 - compressed_size / original_size) * 100
        
        # Base64로 인코딩
        compressed_b64 = base64.b64encode(compressed_content).decode('utf-8')
        
        # 새 파일명
        new_filename = Path(file.filename).stem + '_compressed.mp4'
        
        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": compression_ratio,
            "compressed_file_base64": compressed_b64,
            "filename": new_filename,
            "crf": crf,
            "preset": preset
        }
        
    finally:
        # 임시 파일 삭제
        import os
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)


@router.post("/compress-audio")
async def compress_audio(
    file: UploadFile = File(...),
    bitrate: int = Form(128)  # kbps (64, 128, 192, 256, 320)
):
    """
    오디오 압축 (FFmpeg 사용)
    - AAC/MP3로 재인코딩
    - 압축된 오디오 반환
    """
    import subprocess
    import shutil
    
    # FFmpeg 확인
    ffmpeg_path = shutil.which('ffmpeg')
    if not ffmpeg_path:
        raise HTTPException(status_code=500, detail="FFmpeg가 설치되어 있지 않습니다")
    
    # 임시 파일 생성
    input_suffix = Path(file.filename).suffix or '.mp3'
    output_suffix = '.mp3'
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as input_tmp:
        content = await file.read()
        original_size = len(content)
        input_tmp.write(content)
        input_path = input_tmp.name
    
    output_path = input_path.replace(input_suffix, f'_compressed{output_suffix}')
    
    try:
        # 비트레이트 검증
        valid_bitrates = [64, 96, 128, 192, 256, 320]
        actual_bitrate = min(valid_bitrates, key=lambda x: abs(x - bitrate))
        
        # FFmpeg 명령어
        cmd = [
            ffmpeg_path,
            '-i', input_path,
            '-c:a', 'libmp3lame',
            '-b:a', f'{actual_bitrate}k',
            '-y',
            output_path
        ]
        
        # FFmpeg 실행
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"FFmpeg 오류: {result.stderr}")
        
        # 압축된 파일 읽기
        with open(output_path, 'rb') as f:
            compressed_content = f.read()
        
        compressed_size = len(compressed_content)
        compression_ratio = (1 - compressed_size / original_size) * 100
        
        # Base64로 인코딩
        compressed_b64 = base64.b64encode(compressed_content).decode('utf-8')
        
        # 새 파일명
        new_filename = Path(file.filename).stem + '_compressed.mp3'
        
        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": compression_ratio,
            "compressed_file_base64": compressed_b64,
            "filename": new_filename,
            "bitrate": actual_bitrate
        }
        
    finally:
        # 임시 파일 삭제
        import os
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
