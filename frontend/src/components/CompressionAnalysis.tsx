/**
 * 압축품질 분석 및 시각화 컴포넌트
 * - 압축품질 슬라이더
 * - 파일크기/PSNR/SSIM 그래프
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface CompressionResult {
  quality: number;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  psnr: number;
  ssim: number;
  processing_time: number;
}

interface CompressionAnalysisData {
  original_size: number;
  results: CompressionResult[];
  image_width: number;
  image_height: number;
  image_format: string;
}

interface CompressionAnalysisProps {
  file: File | null;
  onClose?: () => void;
  fileType?: 'image' | 'video';
}

export default function CompressionAnalysis({
  file,
  onClose,
  fileType = 'image',
}: CompressionAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<CompressionAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(70);
  const [showModal, setShowModal] = useState(false);

  // 파일이 변경되면 자동 분석
  useEffect(() => {
    if (file) {
      analyzeCompression();
    }
  }, [file]);

  const analyzeCompression = async () => {
    if (!file) {
      toast.error('파일을 선택해주세요');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', 'jpeg');
      formData.append('quality_levels', '10,30,50,70,90');

      let endpoint = '/compression/analyze-image';
      if (fileType === 'video') {
        endpoint = '/compression/analyze-video';
        formData.append('sample_frame_count', '5');
      }

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysisData(response.data);
      setShowModal(true);
      toast.success('압축 분석 완료!');
    } catch (error: any) {
      console.error('압축 분석 실패:', error);
      toast.error(error.response?.data?.detail || '압축 분석에 실패했습니다');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  // 그래프 데이터 준비
  const getChartData = () => {
    if (!analysisData) return [];

    return analysisData.results.map((result) => ({
      quality: result.quality,
      '파일 크기 (KB)': (result.compressed_size / 1024).toFixed(2),
      'PSNR (dB)': result.psnr.toFixed(2),
      'SSIM': (result.ssim * 100).toFixed(2), // 0-100 스케일로 변환
      '압축률 (%)': result.compression_ratio.toFixed(2),
    }));
  };

  // 품질별 파일 크기 차트
  const renderFileSizeChart = () => {
    const data = getChartData();

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-blue-400" />
          압축품질별 파일 크기
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="quality"
              stroke="#9CA3AF"
              label={{ value: '압축 품질', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{ value: '파일 크기 (KB)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Bar dataKey="파일 크기 (KB)" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // PSNR/SSIM 라인 차트
  const renderQualityMetricsChart = () => {
    const data = getChartData();

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
          품질 지표 (PSNR / SSIM)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="quality"
              stroke="#9CA3AF"
              label={{ value: '압축 품질', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9CA3AF"
              label={{ value: 'PSNR (dB)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              label={{ value: 'SSIM (%)', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <ReferenceLine yAxisId="left" y={30} stroke="#EF4444" strokeDasharray="3 3" label="PSNR 기준 (30dB)" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="PSNR (dB)"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="SSIM"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 압축률 차트
  const renderCompressionRatioChart = () => {
    const data = getChartData();

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowTrendingDownIcon className="w-5 h-5 text-purple-400" />
          압축률
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="quality"
              stroke="#9CA3AF"
              label={{ value: '압축 품질', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{ value: '압축률 (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Bar dataKey="압축률 (%)" fill="#A855F7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 품질 추천
  const getQualityRecommendation = () => {
    if (!analysisData) return null;

    const bestQuality = analysisData.results.find((r) => r.psnr >= 35 && r.ssim >= 0.95);
    const balancedQuality = analysisData.results.find((r) => r.quality === 70);
    const minQuality = analysisData.results.find((r) => r.psnr >= 30);

    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-4">
        <h3 className="text-white font-semibold mb-3">품질 추천</h3>
        <div className="space-y-2 text-sm">
          {bestQuality && (
            <div className="flex justify-between items-center bg-green-900/20 p-2 rounded">
              <span className="text-green-400">최고 품질</span>
              <span className="text-white">
                품질 {bestQuality.quality} (PSNR: {bestQuality.psnr.toFixed(1)}dB, SSIM:{' '}
                {bestQuality.ssim.toFixed(3)})
              </span>
            </div>
          )}
          {balancedQuality && (
            <div className="flex justify-between items-center bg-blue-900/20 p-2 rounded">
              <span className="text-blue-400">균형잡힌 품질</span>
              <span className="text-white">
                품질 {balancedQuality.quality} (PSNR: {balancedQuality.psnr.toFixed(1)}dB, SSIM:{' '}
                {balancedQuality.ssim.toFixed(3)})
              </span>
            </div>
          )}
          {minQuality && (
            <div className="flex justify-between items-center bg-yellow-900/20 p-2 rounded">
              <span className="text-yellow-400">최소 품질 (용량 우선)</span>
              <span className="text-white">
                품질 {minQuality.quality} (PSNR: {minQuality.psnr.toFixed(1)}dB, SSIM:{' '}
                {minQuality.ssim.toFixed(3)})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 분석 버튼 */}
      {file && !showModal && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={analyzeCompression}
          disabled={isAnalyzing}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChartBarIcon className="w-5 h-5" />
          {isAnalyzing ? '분석 중...' : '압축 품질 분석'}
        </motion.button>
      )}

      {/* 분석 결과 모달 */}
      <AnimatePresence>
        {showModal && analysisData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* 헤더 */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">압축 품질 분석 결과</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    원본 크기: {(analysisData.original_size / 1024).toFixed(2)} KB | 해상도:{' '}
                    {analysisData.image_width}x{analysisData.image_height}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* 그래프들 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {renderFileSizeChart()}
                {renderQualityMetricsChart()}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {renderCompressionRatioChart()}
              </div>

              {/* 품질 추천 */}
              {getQualityRecommendation()}

              {/* 상세 데이터 테이블 */}
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <h3 className="text-white font-semibold mb-3">상세 데이터</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 border-b border-gray-700">
                      <tr>
                        <th className="py-2 px-3">품질</th>
                        <th className="py-2 px-3">파일 크기</th>
                        <th className="py-2 px-3">압축률</th>
                        <th className="py-2 px-3">PSNR</th>
                        <th className="py-2 px-3">SSIM</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {analysisData.results.map((result, idx) => (
                        <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-2 px-3 font-medium">{result.quality}</td>
                          <td className="py-2 px-3">
                            {(result.compressed_size / 1024).toFixed(2)} KB
                          </td>
                          <td className="py-2 px-3">{result.compression_ratio.toFixed(1)}%</td>
                          <td className="py-2 px-3">
                            <span
                              className={`${
                                result.psnr >= 35
                                  ? 'text-green-400'
                                  : result.psnr >= 30
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {result.psnr.toFixed(2)} dB
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`${
                                result.ssim >= 0.95
                                  ? 'text-green-400'
                                  : result.ssim >= 0.90
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {result.ssim.toFixed(4)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 닫기 버튼 */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
