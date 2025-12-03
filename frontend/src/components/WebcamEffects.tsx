/**
 * 웹캠 실시간 효과 모달 컴포넌트
 * 영상 및 오디오 효과를 토글 방식으로 즉시 적용
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

// 기본 영상 효과 옵션
const DEFAULT_VIDEO_EFFECTS: VideoEffectOptions = {
  flipH: false,
  flipV: false,
  shear45: false,
  shear90: false,
  filter: 'none',
  blurAmount: 5,
};

// 기본 오디오 효과 옵션
const DEFAULT_AUDIO_EFFECTS: AudioEffectOptions = {
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
  // 프로세서 인스턴스
  const videoProcessorRef = useRef<VideoEffectProcessor | null>(null);
  const audioProcessorRef = useRef<AudioEffectProcessor | null>(null);
  
  // 원본 스트림 저장 (효과 적용 전)
  const originalStreamRef = useRef<MediaStream | null>(null);
  
  // 현재 처리된 스트림 (비디오/오디오 각각)
  const processedVideoStreamRef = useRef<MediaStream | null>(null);
  const processedAudioStreamRef = useRef<MediaStream | null>(null);

  // 영상 효과 상태
  const [videoEffects, setVideoEffects] = useState<VideoEffectOptions>({ ...DEFAULT_VIDEO_EFFECTS });

  // 오디오 효과 상태
  const [audioEffects, setAudioEffects] = useState<AudioEffectOptions>({ ...DEFAULT_AUDIO_EFFECTS });

  const [isProcessing, setIsProcessing] = useState(false);

  // 원본 스트림 저장 (최초 1회)
  useEffect(() => {
    if (localStream && !originalStreamRef.current) {
      // 원본 스트림의 트랙을 복제하여 저장
      originalStreamRef.current = new MediaStream();
      localStream.getTracks().forEach(track => {
        originalStreamRef.current?.addTrack(track.clone());
      });
      console.log('[WebcamEffects] 원본 스트림 저장 완료');
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
   * 영상 효과 토글 핸들러 - 변경 시 즉시 적용
   */
  const handleVideoEffectToggle = async (key: keyof VideoEffectOptions, value: any) => {
    const newEffects = { ...videoEffects, [key]: value };
    setVideoEffects(newEffects);

    // 즉시 적용
    if (!localStream || !originalStreamRef.current) return;

    setIsProcessing(true);

    try {
      const newStream = new MediaStream();

      // 영상 효과 처리 여부 확인
      const hasVideoEffects = newEffects.flipH || newEffects.flipV || 
        newEffects.shear45 || newEffects.shear90 || newEffects.filter !== 'none';

      // === 비디오 트랙 처리 ===
      if (hasVideoEffects) {
        if (videoProcessorRef.current) {
          videoProcessorRef.current.stop();
        }

        const videoProcessor = new VideoEffectProcessor();
        videoProcessorRef.current = videoProcessor;
        videoProcessor.updateEffects(newEffects);

        const videoOnlyStream = new MediaStream(originalStreamRef.current.getVideoTracks().map(t => t.clone()));
        const processedVideoStream = await videoProcessor.processStream(videoOnlyStream);
        processedVideoStreamRef.current = processedVideoStream;

        processedVideoStream.getVideoTracks().forEach(track => {
          newStream.addTrack(track);
        });
      } else {
        if (videoProcessorRef.current) {
          videoProcessorRef.current.stop();
          videoProcessorRef.current = null;
        }
        processedVideoStreamRef.current = null;
        originalStreamRef.current.getVideoTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      }

      // === 오디오 트랙 - 현재 상태 유지 ===
      const hasAudioEffects = audioEffects.lowpass || audioEffects.echo || audioEffects.reverb;
      if (hasAudioEffects && processedAudioStreamRef.current) {
        processedAudioStreamRef.current.getAudioTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      } else {
        originalStreamRef.current.getAudioTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      }

      onStreamUpdate(newStream);
      console.log(`[WebcamEffects] 비디오 효과 ${key} = ${value} 적용됨`);
    } catch (error) {
      console.error('[WebcamEffects] 비디오 효과 적용 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 오디오 효과 토글 핸들러 - 변경 시 즉시 적용
   */
  const handleAudioEffectToggle = async (key: keyof AudioEffectOptions, value: any) => {
    const newEffects = { ...audioEffects, [key]: value };
    setAudioEffects(newEffects);

    // 즉시 적용
    if (!localStream || !originalStreamRef.current) return;

    setIsProcessing(true);

    try {
      const newStream = new MediaStream();

      // === 비디오 트랙 - 현재 상태 유지 ===
      const hasVideoEffects = videoEffects.flipH || videoEffects.flipV || 
        videoEffects.shear45 || videoEffects.shear90 || videoEffects.filter !== 'none';
      if (hasVideoEffects && processedVideoStreamRef.current) {
        processedVideoStreamRef.current.getVideoTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      } else {
        originalStreamRef.current.getVideoTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      }

      // === 오디오 트랙 처리 ===
      const hasAudioEffects = newEffects.lowpass || newEffects.echo || newEffects.reverb;
      if (hasAudioEffects) {
        if (audioProcessorRef.current) {
          audioProcessorRef.current.stop();
        }

        const audioProcessor = new AudioEffectProcessor();
        audioProcessorRef.current = audioProcessor;

        const audioOnlyStream = new MediaStream(originalStreamRef.current.getAudioTracks().map(t => t.clone()));
        const processedAudioStream = await audioProcessor.processStream(audioOnlyStream);
        await audioProcessor.updateEffects(newEffects);
        processedAudioStreamRef.current = processedAudioStream;

        processedAudioStream.getAudioTracks().forEach(track => {
          newStream.addTrack(track);
        });
      } else {
        if (audioProcessorRef.current) {
          audioProcessorRef.current.stop();
          audioProcessorRef.current = null;
        }
        processedAudioStreamRef.current = null;
        originalStreamRef.current.getAudioTracks().forEach(track => {
          newStream.addTrack(track.clone());
        });
      }

      onStreamUpdate(newStream);
      console.log(`[WebcamEffects] 오디오 효과 ${key} = ${value} 적용됨`);
    } catch (error) {
      console.error('[WebcamEffects] 오디오 효과 적용 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 슬라이더 값 변경 핸들러 (실시간 업데이트)
   */
  const handleVideoSliderChange = (key: keyof VideoEffectOptions, value: number) => {
    setVideoEffects(prev => ({ ...prev, [key]: value }));
    // 프로세서가 있으면 실시간 업데이트
    if (videoProcessorRef.current) {
      videoProcessorRef.current.updateEffects({ [key]: value });
    }
  };

  const handleAudioSliderChange = (key: keyof AudioEffectOptions, value: number) => {
    setAudioEffects(prev => ({ ...prev, [key]: value }));
    // 프로세서가 있으면 실시간 업데이트
    if (audioProcessorRef.current) {
      audioProcessorRef.current.updateEffects({ [key]: value });
    }
  };

  /**
   * 모든 효과 초기화
   */
  const resetAllEffects = async () => {
    setIsProcessing(true);

    // 상태 초기화
    setVideoEffects({ ...DEFAULT_VIDEO_EFFECTS });
    setAudioEffects({ ...DEFAULT_AUDIO_EFFECTS });

    // 프로세서 정리
    cleanup();
    processedVideoStreamRef.current = null;
    processedAudioStreamRef.current = null;

    // 원본 스트림 복원
    if (originalStreamRef.current) {
      const newStream = new MediaStream();
      originalStreamRef.current.getTracks().forEach(track => {
        newStream.addTrack(track.clone());
      });
      onStreamUpdate(newStream);
    }

    setIsProcessing(false);
    console.log('[WebcamEffects] 모든 효과 초기화 완료');
  };

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
              {isProcessing && (
                <span className="text-sm text-yellow-400 animate-pulse">처리 중...</span>
              )}
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
              <span className="text-xs text-gray-400">(토글 시 즉시 적용)</span>
            </div>

            <div className="space-y-3 bg-[#1e1f2e] p-4 rounded-lg">
              {/* 반전 효과 */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={videoEffects.flipH}
                  onChange={(e) => handleVideoEffectToggle('flipH', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300 flex-1">좌우 반전</span>
                {videoEffects.flipH && <span className="text-green-400 text-xs">ON</span>}
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={videoEffects.flipV}
                  onChange={(e) => handleVideoEffectToggle('flipV', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300 flex-1">상하 반전</span>
                {videoEffects.flipV && <span className="text-green-400 text-xs">ON</span>}
              </label>

              {/* 전단 효과 */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={videoEffects.shear45}
                  onChange={(e) => handleVideoEffectToggle('shear45', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300 flex-1">45도 전단 효과</span>
                {videoEffects.shear45 && <span className="text-green-400 text-xs">ON</span>}
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={videoEffects.shear90}
                  onChange={(e) => handleVideoEffectToggle('shear90', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-300 flex-1">90도 전단 효과</span>
                {videoEffects.shear90 && <span className="text-green-400 text-xs">ON</span>}
              </label>

              {/* 필터 효과 */}
              <div className="pt-3 border-t border-gray-700">
                <label className="block text-gray-300 mb-2">필터 효과</label>
                <select
                  value={videoEffects.filter}
                  onChange={(e) => handleVideoEffectToggle('filter', e.target.value as any)}
                  disabled={isProcessing}
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
                    onChange={(e) => handleVideoSliderChange('blurAmount', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 오디오 효과 섹션 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MusicalNoteIcon className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">오디오 효과</h3>
              <span className="text-xs text-gray-400">(토글 시 즉시 적용)</span>
            </div>

            <div className="space-y-3 bg-[#1e1f2e] p-4 rounded-lg">
              {/* Low Pass Filter */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={audioEffects.lowpass}
                  onChange={(e) => handleAudioEffectToggle('lowpass', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300 flex-1">Low Pass Filter</span>
                {audioEffects.lowpass && <span className="text-green-400 text-xs">ON</span>}
              </label>

              {audioEffects.lowpass && (
                <div className="pl-7 pb-2">
                  <label className="block text-gray-300 mb-2">
                    주파수: {audioEffects.lowpassFrequency} Hz
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={audioEffects.lowpassFrequency}
                    onChange={(e) => handleAudioSliderChange('lowpassFrequency', Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              {/* Echo 효과 */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={audioEffects.echo}
                  onChange={(e) => handleAudioEffectToggle('echo', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300 flex-1">에코 효과</span>
                {audioEffects.echo && <span className="text-green-400 text-xs">ON</span>}
              </label>

              {audioEffects.echo && (
                <div className="pl-7 space-y-3 pb-2">
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
                      onChange={(e) => handleAudioSliderChange('echoDelay', Number(e.target.value))}
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
                      onChange={(e) => handleAudioSliderChange('echoFeedback', Number(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>
                </div>
              )}

              {/* Reverb 효과 */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-[#252839] p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={audioEffects.reverb}
                  onChange={(e) => handleAudioEffectToggle('reverb', e.target.checked)}
                  disabled={isProcessing}
                  className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-300 flex-1">리버브 효과</span>
                {audioEffects.reverb && <span className="text-green-400 text-xs">ON</span>}
              </label>

              {audioEffects.reverb && (
                <div className="pl-7 pb-2">
                  <label className="block text-gray-300 mb-2">
                    감쇠 시간: {audioEffects.reverbDecay.toFixed(1)} 초
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.5"
                    value={audioEffects.reverbDecay}
                    onChange={(e) => handleAudioSliderChange('reverbDecay', Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetAllEffects}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="w-5 h-5" />
            모든 효과 초기화 (원본 복원)
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
