// src/components/WebcamEffects.tsx

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  XMarkIcon,
  SparklesIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import {
  VideoEffectProcessor,
  VideoEffectOptions,
} from '@/utils/video-effects';
import {
  AudioEffectProcessor,
  AudioEffectOptions,
} from '@/utils/audio-effects';

interface WebcamEffectsProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  onStreamUpdate: (newStream: MediaStream) => void;
}

const defaultVideoEffects: VideoEffectOptions = {
  flipH: false,
  flipV: false,
  shear45: false,
  shear90: false,
  filter: 'none',
  blurAmount: 5,
};

const defaultAudioEffects: AudioEffectOptions = {
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

export default function WebcamEffects({
  isOpen,
  onClose,
  localStream,
  onStreamUpdate,
}: WebcamEffectsProps) {
  const videoProcessorRef = useRef<VideoEffectProcessor | null>(null);
  const audioProcessorRef = useRef<AudioEffectProcessor | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);

  const [videoEffects, setVideoEffects] =
    useState<VideoEffectOptions>(defaultVideoEffects);
  const [audioEffects, setAudioEffects] =
    useState<AudioEffectOptions>(defaultAudioEffects);

  const [isProcessing, setIsProcessing] = useState(false);

  // 최초 한 번 원본 스트림 기억
  useEffect(() => {
    if (localStream && !originalStreamRef.current) {
      originalStreamRef.current = localStream;
    }
  }, [localStream]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupProcessors();
    };
  }, []);

  const cleanupProcessors = () => {
    videoProcessorRef.current?.stop();
    audioProcessorRef.current?.stop();
    videoProcessorRef.current = null;
    audioProcessorRef.current = null;
  };

  /** -------------------- 영상 효과 적용 -------------------- */
  const applyVideoEffects = async () => {
    if (!localStream) return;

    setIsProcessing(true);
    try {
      // 기존 프로세서 정리
      videoProcessorRef.current?.stop();

      const processor = new VideoEffectProcessor();
      videoProcessorRef.current = processor;

      processor.updateEffects(videoEffects);

      const baseStream = originalStreamRef.current || localStream;

      const processedStream = await processor.processStream(baseStream);

      // 원본은 계속 보존
      originalStreamRef.current = baseStream;

      // 부모에게 전달 → RoomPage에서 replaceTrack
      onStreamUpdate(processedStream);

      console.log('[WebcamEffects] 영상 효과 적용 완료');
    } catch (err) {
      console.error('[WebcamEffects] 영상 효과 적용 실패:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** -------------------- 오디오 효과 적용 -------------------- */
  const applyAudioEffects = async () => {
    if (!localStream) return;

    setIsProcessing(true);
    try {
      audioProcessorRef.current?.stop();

      const processor = new AudioEffectProcessor();
      audioProcessorRef.current = processor;

      const baseStream = originalStreamRef.current || localStream;

      const processedStream = await processor.processStream(baseStream);
      await processor.updateEffects(audioEffects);

      originalStreamRef.current = baseStream;

      onStreamUpdate(processedStream);

      console.log('[WebcamEffects] 오디오 효과 적용 완료');
    } catch (err) {
      console.error('[WebcamEffects] 오디오 효과 적용 실패:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** -------------------- 모든 효과 초기화 -------------------- */
  const resetAllEffects = () => {
    setVideoEffects(defaultVideoEffects);
    setAudioEffects(defaultAudioEffects);

    cleanupProcessors();

    if (originalStreamRef.current) {
      onStreamUpdate(originalStreamRef.current);
    }

    console.log('[WebcamEffects] 모든 효과 초기화');
  };

  const handleVideoEffectChange = (
    key: keyof VideoEffectOptions,
    value: any,
  ) => {
    setVideoEffects((prev) => ({ ...prev, [key]: value }));
  };

  const handleAudioEffectChange = (
    key: keyof AudioEffectOptions,
    value: any,
  ) => {
    setAudioEffects((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#252839] p-6 shadow-2xl"
        >
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">
                실시간 영상/오디오 효과
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-[#2f3349]"
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          {/* ===== 영상 효과 섹션 ===== */}
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <VideoCameraIcon className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">영상 효과</h3>
            </div>

            <div className="space-y-3 rounded-lg bg-[#1e1f2e] p-4">
              {/* 체크박스들 */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoEffects.flipH}
                  onChange={(e) =>
                    handleVideoEffectChange('flipH', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">좌우 반전</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoEffects.flipV}
                  onChange={(e) =>
                    handleVideoEffectChange('flipV', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">상하 반전</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoEffects.shear45}
                  onChange={(e) =>
                    handleVideoEffectChange('shear45', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">45도 전단 효과</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoEffects.shear90}
                  onChange={(e) =>
                    handleVideoEffectChange('shear90', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">90도 전단 효과</span>
              </label>

              {/* 필터 선택 */}
              <div className="mt-3 border-t border-gray-700 pt-3">
                <label className="mb-2 block text-gray-300">필터 효과</label>
                <select
                  value={videoEffects.filter}
                  onChange={(e) =>
                    handleVideoEffectChange(
                      'filter',
                      e.target.value as VideoEffectOptions['filter'],
                    )
                  }
                  className="w-full rounded-lg border border-gray-600 bg-[#252839] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">없음</option>
                  <option value="grayscale">흑백</option>
                  <option value="sepia">세피아</option>
                  <option value="blur">블러</option>
                  <option value="edge">엣지 감지</option>
                  <option value="cartoon">카툰</option>
                  <option value="neon">네온</option>
                </select>
              </div>

              {videoEffects.filter === 'blur' && (
                <div className="pt-2">
                  <label className="mb-2 block text-gray-300">
                    블러 강도: {videoEffects.blurAmount}px
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={videoEffects.blurAmount}
                    onChange={(e) =>
                      handleVideoEffectChange(
                        'blurAmount',
                        Number(e.target.value),
                      )
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              )}

              <button
                onClick={applyVideoEffects}
                disabled={isProcessing}
                className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '영상 효과 적용'}
              </button>
            </div>
          </div>

          {/* ===== 오디오 효과 섹션 ===== */}
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <MusicalNoteIcon className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">오디오 효과</h3>
            </div>

            <div className="space-y-3 rounded-lg bg-[#1e1f2e] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={audioEffects.lowpass}
                  onChange={(e) =>
                    handleAudioEffectChange('lowpass', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">Low Pass Filter</span>
              </label>

              {audioEffects.lowpass && (
                <div className="pl-7">
                  <label className="mb-2 block text-gray-300">
                    주파수: {audioEffects.lowpassFrequency} Hz
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={10000}
                    step={100}
                    value={audioEffects.lowpassFrequency}
                    onChange={(e) =>
                      handleAudioEffectChange(
                        'lowpassFrequency',
                        Number(e.target.value),
                      )
                    }
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={audioEffects.echo}
                  onChange={(e) =>
                    handleAudioEffectChange('echo', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">에코 효과</span>
              </label>

              {audioEffects.echo && (
                <div className="space-y-3 pl-7">
                  <div>
                    <label className="mb-2 block text-gray-300">
                      딜레이: {audioEffects.echoDelay.toFixed(1)} 초
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={audioEffects.echoDelay}
                      onChange={(e) =>
                        handleAudioEffectChange(
                          'echoDelay',
                          Number(e.target.value),
                        )
                      }
                      className="w-full accent-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-gray-300">
                      피드백:{' '}
                      {(audioEffects.echoFeedback * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min={0.0}
                      max={0.9}
                      step={0.1}
                      value={audioEffects.echoFeedback}
                      onChange={(e) =>
                        handleAudioEffectChange(
                          'echoFeedback',
                          Number(e.target.value),
                        )
                      }
                      className="w-full accent-green-500"
                    />
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={audioEffects.reverb}
                  onChange={(e) =>
                    handleAudioEffectChange('reverb', e.target.checked)
                  }
                  className="h-4 w-4 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">리버브 효과</span>
              </label>

              {audioEffects.reverb && (
                <div className="pl-7">
                  <label className="mb-2 block text-gray-300">
                    감쇠 시간: {audioEffects.reverbDecay.toFixed(1)} 초
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    value={audioEffects.reverbDecay}
                    onChange={(e) =>
                      handleAudioEffectChange(
                        'reverbDecay',
                        Number(e.target.value),
                      )
                    }
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              <button
                onClick={applyAudioEffects}
                disabled={isProcessing}
                className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '오디오 효과 적용'}
              </button>
            </div>
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetAllEffects}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white transition-colors hover:bg-red-700"
          >
            <ArrowPathIcon className="h-5 w-5" />
            모든 효과 초기화
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}