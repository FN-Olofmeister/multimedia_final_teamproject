/**
 * 웹캠 실시간 오디오 효과 처리
 * Web Audio API를 사용하여 오디오 스트림에 효과 적용
 */

export interface AudioEffectOptions {
  lowpass: boolean;           // Low Pass Filter 활성화
  lowpassFrequency: number;   // 주파수 (100Hz ~ 10kHz)
  pitchShift: boolean;        // Pitch Shift 활성화
  pitchSemitones: number;     // 반음 (-12 ~ +12)
  echo: boolean;              // Echo 활성화
  echoDelay: number;          // 딜레이 시간 (0.1 ~ 1.0 초)
  echoFeedback: number;       // 피드백 (0.0 ~ 0.9)
  reverb: boolean;            // Reverb 활성화
  reverbDecay: number;        // 감쇠 시간 (0.5 ~ 5.0 초)
}

export class AudioEffectProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // 필터 노드들
  private lowpassFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private echoGain: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  private outputStream: MediaStream | null = null;
  private originalStream: MediaStream | null = null;

  private effects: AudioEffectOptions = {
    lowpass: false,
    lowpassFrequency: 1000,
    pitchShift: false,
    pitchSemitones: 0,
    echo: false,
    echoDelay: 0.3,
    echoFeedback: 0.5,
    reverb: false,
    reverbDecay: 2.0,
  };

  /**
   * 입력 스트림에 효과를 적용하여 새로운 스트림 반환
   */
  public async processStream(inputStream: MediaStream): Promise<MediaStream> {
    // 오디오 트랙 확인
    const audioTracks = inputStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('입력 스트림에 오디오 트랙이 없습니다.');
      return inputStream;
    }

    this.originalStream = inputStream;

    // AudioContext 생성
    this.audioContext = new AudioContext();

    // Source 노드 생성
    this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);

    // Destination 노드 생성
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // 필터 노드 초기화
    this.initializeNodes();

    // 노드 연결
    this.connectNodes();

    // 출력 스트림 생성
    this.outputStream = this.destinationNode.stream;

    // 비디오 트랙 복사 (효과 없이)
    const videoTracks = inputStream.getVideoTracks();
    videoTracks.forEach(track => {
      this.outputStream?.addTrack(track);
    });

    return this.outputStream;
  }

  /**
   * 필터 노드 초기화
   */
  private initializeNodes(): void {
    if (!this.audioContext) return;

    // Low Pass Filter
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = this.effects.lowpassFrequency;
    this.lowpassFilter.Q.value = 1.0;

    // Echo (Delay + Feedback)
    this.delayNode = this.audioContext.createDelay(1.0);
    this.delayNode.delayTime.value = this.effects.echoDelay;

    this.feedbackGain = this.audioContext.createGain();
    this.feedbackGain.gain.value = this.effects.echoFeedback;

    this.echoGain = this.audioContext.createGain();
    this.echoGain.gain.value = 0.5;

    // Reverb (Convolver)
    this.convolverNode = this.audioContext.createConvolver();
    this.generateReverbImpulse(this.effects.reverbDecay);

    this.reverbGain = this.audioContext.createGain();
    this.reverbGain.gain.value = 0.4;

    // Dry/Wet Mix
    this.dryGain = this.audioContext.createGain();
    this.dryGain.gain.value = 1.0;

    this.wetGain = this.audioContext.createGain();
    this.wetGain.gain.value = 0.0;
  }

  /**
   * 노드 연결
   */
  private connectNodes(): void {
    if (!this.sourceNode || !this.destinationNode) return;

    let currentNode: AudioNode = this.sourceNode;

    // Low Pass Filter 연결
    if (this.effects.lowpass && this.lowpassFilter) {
      currentNode.connect(this.lowpassFilter);
      currentNode = this.lowpassFilter;
    }

    // Echo 연결
    if (this.effects.echo && this.delayNode && this.feedbackGain && this.echoGain) {
      // Dry signal
      currentNode.connect(this.dryGain!);

      // Wet signal (echo)
      currentNode.connect(this.delayNode);
      this.delayNode.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode); // Feedback loop
      this.delayNode.connect(this.echoGain);
      this.echoGain.connect(this.wetGain!);

      // Mix
      this.dryGain!.connect(this.destinationNode);
      this.wetGain!.connect(this.destinationNode);
    }
    // Reverb 연결
    else if (this.effects.reverb && this.convolverNode && this.reverbGain) {
      // Dry signal
      currentNode.connect(this.dryGain!);

      // Wet signal (reverb)
      currentNode.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbGain);
      this.reverbGain.connect(this.wetGain!);

      // Mix
      this.dryGain!.connect(this.destinationNode);
      this.wetGain!.connect(this.destinationNode);
    }
    // 효과 없음 또는 필터만
    else {
      currentNode.connect(this.destinationNode);
    }

    console.log('[AudioEffectProcessor] 노드 연결 완료');
  }

  /**
   * 노드 연결 해제
   */
  private disconnectNodes(): void {
    try {
      this.sourceNode?.disconnect();
      this.lowpassFilter?.disconnect();
      this.delayNode?.disconnect();
      this.feedbackGain?.disconnect();
      this.echoGain?.disconnect();
      this.convolverNode?.disconnect();
      this.reverbGain?.disconnect();
      this.dryGain?.disconnect();
      this.wetGain?.disconnect();
    } catch (error) {
      // disconnect 에러는 무시 (이미 연결 해제된 경우)
    }
  }

  /**
   * Reverb Impulse Response 생성
   */
  private generateReverbImpulse(decay: number): void {
    if (!this.audioContext || !this.convolverNode) return;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * decay;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      // 감쇠하는 노이즈 생성
      const n = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      leftChannel[i] = n;
      rightChannel[i] = n;
    }

    this.convolverNode.buffer = impulse;
  }

  /**
   * 효과 옵션 업데이트
   */
  public async updateEffects(options: Partial<AudioEffectOptions>): Promise<void> {
    const oldEffects = { ...this.effects };
    this.effects = { ...this.effects, ...options };

    // 효과 구조가 변경된 경우 재연결 필요
    const needsReconnect =
      (oldEffects.lowpass !== this.effects.lowpass) ||
      (oldEffects.echo !== this.effects.echo) ||
      (oldEffects.reverb !== this.effects.reverb);

    if (needsReconnect && this.originalStream) {
      // 기존 연결 해제
      this.disconnectNodes();

      // 노드 재연결
      this.connectNodes();
    } else {
      // 파라미터만 업데이트
      if (this.lowpassFilter && this.effects.lowpass) {
        this.lowpassFilter.frequency.value = this.effects.lowpassFrequency;
      }

      if (this.delayNode && this.effects.echo) {
        this.delayNode.delayTime.value = this.effects.echoDelay;
        if (this.feedbackGain) {
          this.feedbackGain.gain.value = this.effects.echoFeedback;
        }
      }

      if (this.convolverNode && this.effects.reverb) {
        // Reverb decay가 변경된 경우 impulse 재생성
        if (oldEffects.reverbDecay !== this.effects.reverbDecay) {
          this.generateReverbImpulse(this.effects.reverbDecay);
        }
      }
    }
  }

  /**
   * 현재 효과 옵션 가져오기
   */
  public getEffects(): AudioEffectOptions {
    return { ...this.effects };
  }

  /**
   * 모든 효과 초기화
   */
  public async resetEffects(): Promise<void> {
    await this.updateEffects({
      lowpass: false,
      lowpassFrequency: 1000,
      pitchShift: false,
      pitchSemitones: 0,
      echo: false,
      echoDelay: 0.3,
      echoFeedback: 0.5,
      reverb: false,
      reverbDecay: 2.0,
    });
  }

  /**
   * 처리 중지 및 리소스 정리
   */
  public stop(): void {
    // 노드 연결 해제
    this.disconnectNodes();

    // AudioContext 닫기
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.error('[AudioEffectProcessor] AudioContext 종료 실패:', err);
      });
    }

    // 출력 스트림 정리
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }

    // 참조 해제
    this.audioContext = null;
    this.sourceNode = null;
    this.destinationNode = null;
    this.lowpassFilter = null;
    this.delayNode = null;
    this.feedbackGain = null;
    this.echoGain = null;
    this.convolverNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.wetGain = null;
    this.originalStream = null;

    console.log('[AudioEffectProcessor] 리소스 정리 완료');
  }

  /**
   * 효과 적용 여부 확인
   */
  public hasActiveEffects(): boolean {
    return (
      this.effects.lowpass ||
      this.effects.pitchShift ||
      this.effects.echo ||
      this.effects.reverb
    );
  }

  /**
   * AudioContext 상태 확인
   */
  public getContextState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }
}
