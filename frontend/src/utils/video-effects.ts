/**
 * 웹캠 실시간 영상 효과 처리
 * Canvas API를 사용하여 비디오 스트림에 효과 적용
 */

export interface VideoEffectOptions {
  flipH: boolean;           // 좌우 반전
  flipV: boolean;           // 상하 반전
  shear45: boolean;         // 45도 전단 효과
  shear90: boolean;         // 90도 전단 효과
  filter: 'none' | 'grayscale' | 'sepia' | 'blur' | 'edge' | 'cartoon' | 'neon';
  blurAmount?: number;      // 블러 강도 (기본: 5)
}

export class VideoEffectProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private animationFrameId: number | null = null;
  private intervalId: number | null = null;
  private outputStream: MediaStream | null = null;

  private effects: VideoEffectOptions = {
    flipH: false,
    flipV: false,
    shear45: false,
    shear90: false,
    filter: 'none',
    blurAmount: 5,
  };

  constructor() {
    // Canvas 생성
    this.canvas = document.createElement('canvas');
    // 기본 크기 설정 (메타데이터 로드 전 fallback)
    this.canvas.width = 640;
    this.canvas.height = 480;
    
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Canvas 2D context를 생성할 수 없습니다.');
    }
    this.ctx = ctx;

    // 비디오 엘리먼트 생성 (숨김)
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true; // iOS 지원
  }

  /**
   * 입력 스트림에 효과를 적용하여 새로운 스트림 반환 (비동기)
   */
  public async processStream(inputStream: MediaStream): Promise<MediaStream> {
    // 비디오 트랙 확인
    const videoTracks = inputStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn('[VideoEffects] 입력 스트림에 비디오 트랙이 없습니다.');
      return inputStream;
    }

    // 기존 처리 중지
    this.stop();

    // 비디오 엘리먼트에 스트림 연결
    this.videoElement.srcObject = inputStream;

    // 비디오 메타데이터 로드 대기 (Promise)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('[VideoEffects] 메타데이터 로드 타임아웃, 기본 크기 사용');
        resolve();
      }, 3000);

      this.videoElement.onloadedmetadata = () => {
        clearTimeout(timeout);
        // Canvas 크기 설정
        const width = this.videoElement.videoWidth || 640;
        const height = this.videoElement.videoHeight || 480;
        this.canvas.width = width;
        this.canvas.height = height;
        console.log(`[VideoEffects] Canvas 크기 설정: ${width}x${height}`);
        resolve();
      };

      this.videoElement.onerror = (e) => {
        clearTimeout(timeout);
        console.error('[VideoEffects] 비디오 로드 에러:', e);
        reject(e);
      };
    });

    // 비디오 재생 시작
    try {
      await this.videoElement.play();
      console.log('[VideoEffects] 비디오 재생 시작');
    } catch (err) {
      console.error('[VideoEffects] 비디오 재생 실패:', err);
    }

    // Canvas에서 스트림 생성 (30fps)
    this.outputStream = this.canvas.captureStream(30);

    // 오디오 트랙 복사 (효과 없이)
    const audioTracks = inputStream.getAudioTracks();
    audioTracks.forEach(track => {
      this.outputStream?.addTrack(track.clone());
    });

    // 애니메이션 프레임 시작
    this.startProcessing();

    console.log('[VideoEffects] 스트림 처리 시작 완료');
    return this.outputStream;
  }

  /**
   * 프레임 처리 시작
   */
  private startProcessing(): void {
  // 혹시 남아 있는 rAF / interval 정리
  if (this.animationFrameId !== null) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  if (this.intervalId !== null) {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  const fps = 30;
  const interval = 1000 / fps;

  this.intervalId = window.setInterval(() => {
    if (!this.videoElement.paused && !this.videoElement.ended) {
      this.processVideoFrame();
    }
  }, interval);
}

  /**
   * 비디오 프레임 처리 및 효과 적용
   */
  private processVideoFrame(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Context 초기화
    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);

    // Transform 적용
    this.applyTransforms(width, height);

    // 비디오 프레임 그리기
    this.ctx.drawImage(this.videoElement, 0, 0, width, height);

    // Context 복원
    this.ctx.restore();

    // 필터 효과 적용 (픽셀 조작)
    if (this.effects.filter !== 'none') {
      this.applyFilter();
    }
  }

  /**
   * Transform 효과 적용 (반전, 전단)
   */
  private applyTransforms(width: number, height: number): void {
    let translateX = 0;
    let translateY = 0;

    // 좌우 반전
    if (this.effects.flipH) {
      this.ctx.scale(-1, 1);
      translateX = -width;
    }

    // 상하 반전
    if (this.effects.flipV) {
      this.ctx.scale(1, -1);
      translateY = -height;
    }

    // 전단 효과 (Shear Transform)
    if (this.effects.shear45) {
      // 45도 전단 (X축)
      this.ctx.transform(1, Math.tan(Math.PI / 4), 0, 1, 0, 0);
    }

    if (this.effects.shear90) {
      // 90도 전단 (Y축)
      this.ctx.transform(1, 0, Math.tan(Math.PI / 2 * 0.5), 1, 0, 0);
    }

    // Translate 적용
    if (translateX !== 0 || translateY !== 0) {
      this.ctx.translate(translateX, translateY);
    }
  }

  /**
   * 필터 효과 적용 (픽셀 조작)
   */
  private applyFilter(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (this.effects.filter) {
      case 'grayscale':
        this.applyGrayscale(data);
        break;
      case 'sepia':
        this.applySepia(data);
        break;
      case 'blur':
        this.applyBlur(imageData);
        return; // blur는 별도 처리
      case 'edge':
        this.applyEdgeDetection(imageData);
        return; // edge는 별도 처리
      case 'cartoon':
        this.applyCartoon(data);
        break;
      case 'neon':
        this.applyNeon(data);
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 흑백 필터
   */
  private applyGrayscale(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;     // R
      data[i + 1] = avg; // G
      data[i + 2] = avg; // B
    }
  }

  /**
   * 세피아 필터
   */
  private applySepia(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);     // R
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168); // G
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131); // B
    }
  }

  /**
   * 블러 필터 (간단한 box blur)
   */
  private applyBlur(imageData: ImageData): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const blurRadius = this.effects.blurAmount || 5;

    // 임시 Canvas 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);

    // CSS blur 필터 사용 (성능 최적화)
    this.ctx.filter = `blur(${blurRadius}px)`;
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.filter = 'none';
  }

  /**
   * 엣지 감지 필터 (Sobel operator)
   */
  private applyEdgeDetection(imageData: ImageData): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Sobel 커널
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        // 3x3 커널 적용
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);

            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * width + x) * 4;

        output[idx] = magnitude;     // R
        output[idx + 1] = magnitude; // G
        output[idx + 2] = magnitude; // B
        output[idx + 3] = 255;       // A
      }
    }

    // 결과 적용
    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 카툰 효과 (Posterize)
   */
  private applyCartoon(data: Uint8ClampedArray): void {
    const levels = 4; // 색상 레벨 수
    const step = 255 / levels;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / step) * step;         // R
      data[i + 1] = Math.floor(data[i + 1] / step) * step; // G
      data[i + 2] = Math.floor(data[i + 2] / step) * step; // B
    }
  }

  /**
   * 네온 효과 (고대비 + 엣지 강조)
   */
  private applyNeon(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 고대비 적용
      const contrast = 2.0;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      data[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));

      // 색상 반전
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  /**
   * 효과 옵션 업데이트
   */
  public updateEffects(options: Partial<VideoEffectOptions>): void {
    this.effects = { ...this.effects, ...options };
  }

  /**
   * 현재 효과 옵션 가져오기
   */
  public getEffects(): VideoEffectOptions {
    return { ...this.effects };
  }

  /**
   * 모든 효과 초기화
   */
  public resetEffects(): void {
    this.effects = {
      flipH: false,
      flipV: false,
      shear45: false,
      shear90: false,
      filter: 'none',
      blurAmount: 5,
    };
  }

  /**
   * 처리 중지 및 리소스 정리
   */
  public stop(): void {
    // 애니메이션 프레임 취소
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // ★ interval 취소
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
  }

    // 비디오 정리 (트랙은 중지하지 않음 - 원본 스트림 유지)
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject = null;
    }

    // 출력 스트림의 비디오 트랙만 정리 (오디오는 원본이므로 유지)
    if (this.outputStream) {
      this.outputStream.getVideoTracks().forEach(track => track.stop());
      this.outputStream = null;
    }
    
    console.log('[VideoEffects] 리소스 정리 완료');
  }

  /**
   * 효과 적용 여부 확인
   */
  public hasActiveEffects(): boolean {
    return (
      this.effects.flipH ||
      this.effects.flipV ||
      this.effects.shear45 ||
      this.effects.shear90 ||
      this.effects.filter !== 'none'
    );
  }
}
