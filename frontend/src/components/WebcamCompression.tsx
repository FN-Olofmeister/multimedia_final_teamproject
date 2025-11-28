/**
 * 웹캠 압축 품질 조절 및 실시간 지표 표시 컴포넌트
 * - 웹캠 프레임 실시간 압축
 * - PSNR/SSIM 실시간 계산
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CompressionQualitySlider from './CompressionQualitySlider';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface WebcamCompressionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isOpen: boolean;
  onClose: () => void;
}

export default function WebcamCompression({ videoRef, isOpen, onClose }: WebcamCompressionProps) {
  const [compressionQuality, setCompressionQuality] = useState(70);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<{
    originalSize: number;
    compressedSize: number;
    psnr: number;
    ssim: number;
  } | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 웹캠 프레임 캡처 및 압축 분석
  const analyzeFrame = async () => {
    if (!videoRef.current) {
      toast.error('웹캠이 활성화되지 않았습니다');
      return;
    }

    setIsAnalyzing(true);

    try {
      const video = videoRef.current;

      // Canvas로 현재 프레임 캡처
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Canvas를 Base64로 변환
      const frameDataUrl = canvas.toDataURL('image/jpeg', 1.0); // 원본 품질
      const frameBase64 = frameDataUrl.split(',')[1]; // data:image/jpeg;base64, 제거

      // 백엔드 API 호출 (JSON으로 전송)
      const response = await api.post('/compression/compress-webcam-frame', {
        frame_base64: frameBase64,
        quality: compressionQuality
      });

      setMetrics({
        originalSize: response.data.original_size,
        compressedSize: response.data.compressed_size,
        psnr: response.data.psnr,
        ssim: response.data.ssim,
      });

      // toast.success('프레임 분석 완료!');
    } catch (error: any) {
      console.error('프레임 분석 실패:', error);
      toast.error(error.response?.data?.detail || '프레임 분석에 실패했습니다');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 자동 업데이트 토글
  useEffect(() => {
    if (autoUpdate) {
      // 2초마다 자동 분석
      intervalRef.current = setInterval(() => {
        analyzeFrame();
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoUpdate, compressionQuality]);

  // 품질 변경 시 자동 업데이트가 켜져있으면 즉시 분석
  useEffect(() => {
    if (autoUpdate && !isAnalyzing) {
      analyzeFrame();
    }
  }, [compressionQuality]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
        >
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-purple-400" />
              웹캠 압축 품질 분석
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* 압축 품질 슬라이더 */}
          <div className="mb-4">
            <CompressionQualitySlider
              quality={compressionQuality}
              onChange={setCompressionQuality}
              showMetrics={true}
              estimatedSize={metrics?.compressedSize}
              estimatedPSNR={metrics?.psnr}
              estimatedSSIM={metrics?.ssim}
              disabled={isAnalyzing}
            />
          </div>

          {/* 분석 버튼 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={analyzeFrame}
              disabled={isAnalyzing}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '분석 중...' : '현재 프레임 분석'}
            </button>
            <button
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoUpdate
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {autoUpdate ? '자동 업데이트 중지' : '자동 업데이트 시작'}
            </button>
          </div>

          {/* 실시간 지표 */}
          {metrics && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-4"
            >
              <h3 className="text-white font-semibold mb-3">실시간 압축 지표</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">원본 크기</p>
                  <p className="text-lg font-semibold text-white">
                    {(metrics.originalSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">압축 크기</p>
                  <p className="text-lg font-semibold text-white">
                    {(metrics.compressedSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">압축률</p>
                  <p className="text-lg font-semibold text-green-400">
                    {((1 - metrics.compressedSize / metrics.originalSize) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">PSNR</p>
                  <p
                    className={`text-lg font-semibold ${
                      metrics.psnr >= 35
                        ? 'text-green-400'
                        : metrics.psnr >= 30
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {metrics.psnr.toFixed(1)} dB
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-400 mb-1">SSIM (구조적 유사성)</p>
                  <p
                    className={`text-lg font-semibold ${
                      metrics.ssim >= 0.95
                        ? 'text-green-400'
                        : metrics.ssim >= 0.90
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {(metrics.ssim * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 도움말 */}
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
            <p className="text-xs text-blue-300">
              <strong>팁:</strong> 자동 업데이트를 켜면 2초마다 실시간으로 웹캠 프레임을 분석합니다.
              슬라이더를 조절하여 압축품질에 따른 지표 변화를 확인할 수 있습니다.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
