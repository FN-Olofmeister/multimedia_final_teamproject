/**
 * 압축품질 조절 슬라이더 컴포넌트
 * - 실시간 품질 조절
 * - 품질별 예상 지표 표시
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface CompressionQualitySliderProps {
  quality: number;
  onChange: (quality: number) => void;
  showMetrics?: boolean;
  estimatedSize?: number; // bytes
  estimatedPSNR?: number;
  estimatedSSIM?: number;
  disabled?: boolean;
}

export default function CompressionQualitySlider({
  quality,
  onChange,
  showMetrics = true,
  estimatedSize,
  estimatedPSNR,
  estimatedSSIM,
  disabled = false,
}: CompressionQualitySliderProps) {
  // 품질 레벨별 색상
  const getQualityColor = (q: number) => {
    if (q >= 80) return 'text-green-400';
    if (q >= 50) return 'text-yellow-400';
    if (q >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  // 품질 레벨별 배경색
  const getQualityBgColor = (q: number) => {
    if (q >= 80) return 'bg-green-600';
    if (q >= 50) return 'bg-yellow-600';
    if (q >= 30) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // 품질 레벨 설명
  const getQualityDescription = (q: number) => {
    if (q >= 90) return '최고 품질 (거의 무손실)';
    if (q >= 70) return '고품질 (권장)';
    if (q >= 50) return '중간 품질';
    if (q >= 30) return '낮은 품질';
    return '최저 품질 (높은 압축)';
  };

  // PSNR 평가
  const getPSNRQuality = (psnr: number) => {
    if (psnr >= 40) return { text: '매우 좋음', color: 'text-green-400' };
    if (psnr >= 35) return { text: '좋음', color: 'text-green-400' };
    if (psnr >= 30) return { text: '양호', color: 'text-yellow-400' };
    if (psnr >= 25) return { text: '보통', color: 'text-orange-400' };
    return { text: '나쁨', color: 'text-red-400' };
  };

  // SSIM 평가
  const getSSIMQuality = (ssim: number) => {
    if (ssim >= 0.98) return { text: '매우 좋음', color: 'text-green-400' };
    if (ssim >= 0.95) return { text: '좋음', color: 'text-green-400' };
    if (ssim >= 0.90) return { text: '양호', color: 'text-yellow-400' };
    if (ssim >= 0.85) return { text: '보통', color: 'text-orange-400' };
    return { text: '나쁨', color: 'text-red-400' };
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-semibold">압축 품질 조절</h3>
      </div>

      {/* 슬라이더 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">품질 레벨</span>
          <span className={`text-lg font-bold ${getQualityColor(quality)}`}>{quality}</span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={quality}
            onChange={(e) => onChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #EF4444 0%, #F59E0B 33%, #FBBF24 66%, #10B981 100%)`,
            }}
          />
          {/* 품질 눈금 */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10</span>
            <span>30</span>
            <span>50</span>
            <span>70</span>
            <span>90</span>
            <span>100</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-2">{getQualityDescription(quality)}</p>
      </div>

      {/* 예상 지표 */}
      {showMetrics && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-700"
        >
          {/* 파일 크기 */}
          {estimatedSize !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">예상 파일 크기</p>
              <p className="text-lg font-semibold text-white">
                {estimatedSize < 1024
                  ? `${estimatedSize.toFixed(0)} B`
                  : estimatedSize < 1024 * 1024
                  ? `${(estimatedSize / 1024).toFixed(1)} KB`
                  : `${(estimatedSize / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
          )}

          {/* PSNR */}
          {estimatedPSNR !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">PSNR (신호 대 잡음비)</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-lg font-semibold ${getPSNRQuality(estimatedPSNR).color}`}>
                  {estimatedPSNR.toFixed(1)} dB
                </p>
                <span className="text-xs text-gray-500">{getPSNRQuality(estimatedPSNR).text}</span>
              </div>
            </div>
          )}

          {/* SSIM */}
          {estimatedSSIM !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">SSIM (구조적 유사성)</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-lg font-semibold ${getSSIMQuality(estimatedSSIM).color}`}>
                  {(estimatedSSIM * 100).toFixed(1)}%
                </p>
                <span className="text-xs text-gray-500">{getSSIMQuality(estimatedSSIM).text}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 도움말 */}
      <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
        <p className="text-xs text-blue-300 leading-relaxed">
          <strong>PSNR:</strong> 높을수록 원본과 유사 (30dB 이상 권장) |{' '}
          <strong>SSIM:</strong> 1에 가까울수록 원본과 유사 (0.9 이상 권장)
        </p>
      </div>

      {/* CSS for custom slider */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
