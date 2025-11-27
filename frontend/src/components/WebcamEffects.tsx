/**
 * 웹캠 실시간 효과 모달 컴포넌트
 * 영상 및 오디오 효과를 제어하는 UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function WebcamEffects({
  isOpen,
  onClose,
  localStream,
  onStreamUpdate,
}: WebcamEffectsProps) {
  // 프로세서 인스턴스
  const videoProcessorRef = useRef<VideoEffectProcessor | null>(null);
  const audioProcessorRef = useRef<AudioEffectProcessor | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);

  // 영상 효과 상태
  const [videoEffects, setVideoEffects] = useState<VideoEffectOptions>({
    flipH: false,
    flipV: false,
    shear45: false,
    shear90: false,
    filter: 'none',
    blurAmount: 5,
  });

  // 오디오 효과 상태
  const [audioEffects, setAudioEffects] = useState<AudioEffectOptions>({
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

  const [isProcessing, setIsProcessing] = useState(false);

  // 초기화 시 원본 스트림 저장
  useEffect(() => {
    if (localStream && !originalStreamRef.current) {
      originalStreamRef.current = localStream;
    }
  }, [localStream]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  /**
   * 리소스 정리
   */
  const cleanup = () => {
    if (videoProcessorRef.current) {
      videoProcessorRef.current.stop();
      videoProcessorRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
  };

  /**
   * 영상 효과 적용
   */
  const applyVideoEffects = async () => {
    if (!localStream) return;

    setIsProcessing(true);

    try {
      // 기존 프로세서가 있으면 정리
      if (videoProcessorRef.current) {
        videoProcessorRef.current.stop();
      }

      // 원본 스트림 저장 (아직 저장 안됐으면)
      if (!originalStreamRef.current) {
        originalStreamRef.current = localStream;
      }

      // 새 프로세서 생성
      const processor = new VideoEffectProcessor();
      videoProcessorRef.current = processor;

      // 효과 설정
      processor.updateEffects(videoEffects);

      // 스트림 처리 (비동기 - 메타데이터 로딩 대기)
      const processedStream = await processor.processStream(localStream);

      // 스트림 업데이트
      onStreamUpdate(processedStream);

      console.log('[WebcamEffects] 영상 효과 적용 완료');
    } catch (error) {
      console.error('[WebcamEffects] 영상 효과 적용 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 오디오 효과 적용
   */
  const applyAudioEffects = async () => {
    if (!localStream) return;

    setIsProcessing(true);

    try {
      // 기존 프로세서가 있으면 정리
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop();
      }

      // 원본 스트림 저장 (아직 저장 안됐으면)
      if (!originalStreamRef.current) {
        originalStreamRef.current = localStream;
      }

      // 새 프로세서 생성
      const processor = new AudioEffectProcessor();
      audioProcessorRef.current = processor;

      // 스트림 처리
      const processedStream = await processor.processStream(localStream);

      // 효과 설정
      await processor.updateEffects(audioEffects);

      // 스트림 업데이트
      onStreamUpdate(processedStream);

      console.log('[WebcamEffects] 오디오 효과 적용 완료');
    } catch (error) {
      console.error('[WebcamEffects] 오디오 효과 적용 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 모든 효과 초기화
   */
  const resetAllEffects = () => {
    // 영상 효과 초기화
    setVideoEffects({
      flipH: false,
      flipV: false,
      shear45: false,
      shear90: false,
      filter: 'none',
      blurAmount: 5,
    });

    // 오디오 효과 초기화
    setAudioEffects({
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

    // 프로세서 정리
    cleanup();

    // 원본 스트림 복원
    if (originalStreamRef.current) {
      onStreamUpdate(originalStreamRef.current);
    }

    console.log('[WebcamEffects] 모든 효과 초기화');
  };

  /**
   * 영상 효과 변경 핸들러
   */
  const handleVideoEffectChange = (key: keyof VideoEffectOptions, value: any) => {
    setVideoEffects(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 오디오 효과 변경 핸들러
   */
  const handleAudioEffectChange = (key: keyof AudioEffectOptions, value: any) => {
    setAudioEffects(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 영상 효과 실시간 업데이트
   */
  useEffect(() => {
    if (videoProcessorRef.current) {
      videoProcessorRef.current.updateEffects(videoEffects);
    }
  }, [videoEffects]);

  /**
   * 오디오 효과 실시간 업데이트
   */
  useEffect(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.updateEffects(audioEffects);
    }
  }, [audioEffects]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-[#252839] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">실시간 영상/오디오 효과</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2f3349] rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* 영상 효과 섹션 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <VideoCameraIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">영상 효과</h3>
            </div>

            <div className="space-y-3 bg-[#1e1f2e] p-4 rounded-lg">
              {/* 반전 효과 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoEffects.flipH}
                  onChange={(e) => handleVideoEffectChange('flipH', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">좌우 반전</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoEffects.flipV}
                  onChange={(e) => handleVideoEffectChange('flipV', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">상하 반전</span>
              </label>

              {/* 전단 효과 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoEffects.shear45}
                  onChange={(e) => handleVideoEffectChange('shear45', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">45도 전단 효과</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoEffects.shear90}
                  onChange={(e) => handleVideoEffectChange('shear90', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300">90도 전단 효과</span>
              </label>

              {/* 필터 효과 */}
              <div className="pt-3 border-t border-gray-700">
                <label className="block text-gray-300 mb-2">필터 효과</label>
                <select
                  value={videoEffects.filter}
                  onChange={(e) => handleVideoEffectChange('filter', e.target.value as any)}
                  className="w-full bg-[#252839] text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* 블러 강도 슬라이더 */}
              {videoEffects.filter === 'blur' && (
                <div className="pt-2">
                  <label className="block text-gray-300 mb-2">
                    블러 강도: {videoEffects.blurAmount}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={videoEffects.blurAmount}
                    onChange={(e) => handleVideoEffectChange('blurAmount', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}

              {/* 적용 버튼 */}
              <button
                onClick={applyVideoEffects}
                disabled={isProcessing}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '처리 중...' : '영상 효과 적용'}
              </button>
            </div>
          </div>

          {/* 오디오 효과 섹션 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MusicalNoteIcon className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">오디오 효과</h3>
            </div>

            <div className="space-y-3 bg-[#1e1f2e] p-4 rounded-lg">
              {/* Low Pass Filter */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioEffects.lowpass}
                  onChange={(e) => handleAudioEffectChange('lowpass', e.target.checked)}
                  className="w-4 h-4 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">Low Pass Filter</span>
              </label>

              {audioEffects.lowpass && (
                <div className="pl-7">
                  <label className="block text-gray-300 mb-2">
                    주파수: {audioEffects.lowpassFrequency} Hz
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={audioEffects.lowpassFrequency}
                    onChange={(e) => handleAudioEffectChange('lowpassFrequency', Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              {/* Echo 효과 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioEffects.echo}
                  onChange={(e) => handleAudioEffectChange('echo', e.target.checked)}
                  className="w-4 h-4 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">에코 효과</span>
              </label>

              {audioEffects.echo && (
                <div className="pl-7 space-y-3">
                  <div>
                    <label className="block text-gray-300 mb-2">
                      딜레이: {audioEffects.echoDelay.toFixed(1)} 초
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={audioEffects.echoDelay}
                      onChange={(e) => handleAudioEffectChange('echoDelay', Number(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">
                      피드백: {(audioEffects.echoFeedback * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="0.9"
                      step="0.1"
                      value={audioEffects.echoFeedback}
                      onChange={(e) => handleAudioEffectChange('echoFeedback', Number(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>
                </div>
              )}

              {/* Reverb 효과 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioEffects.reverb}
                  onChange={(e) => handleAudioEffectChange('reverb', e.target.checked)}
                  className="w-4 h-4 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300">리버브 효과</span>
              </label>

              {audioEffects.reverb && (
                <div className="pl-7">
                  <label className="block text-gray-300 mb-2">
                    감쇠 시간: {audioEffects.reverbDecay.toFixed(1)} 초
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.5"
                    value={audioEffects.reverbDecay}
                    onChange={(e) => handleAudioEffectChange('reverbDecay', Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              {/* 적용 버튼 */}
              <button
                onClick={applyAudioEffects}
                disabled={isProcessing}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '처리 중...' : '오디오 효과 적용'}
              </button>
            </div>
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetAllEffects}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            모든 효과 초기화
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
