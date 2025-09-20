import React, { useState, useEffect } from 'react';
import ParameterPanel from './components/ParameterPanel';
import ImageCanvas from './components/ImageCanvas';
import ImageHistory from './components/ImageHistory';
import { Trash2 } from 'lucide-react';
import axios from 'axios';

function App() {
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedParameters, setSelectedParameters] = useState({
    prompt: '',
    negative_prompt: '',
    model: 'Kwai-Kolors/Kolors', // Fixed model
    image_size: '1:1',
    batch_size: 1,
    seed: 127001,
    num_inference_steps: 25,
    guidance_scale: 4.5,
    cfg: 4.0
  });

  const handleImageGenerated = (imageData) => {
    const newImageData = {
      ...imageData,
      timestamp: Date.now()
    };
    setGeneratedImages(prev => [newImageData, ...prev]);
    setCurrentImage(newImageData);
  };

  const handleParameterChange = (key, value) => {
    setSelectedParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleImageDelete = (deletedImageId) => {
    // Force refresh of history list
    setRefreshTrigger(prev => prev + 1);

    // 删除历史记录不应该影响当前显示的图片
    // 只有当前显示的图片确实是被删除的图片时才清除显示
    // 但由于历史记录删除不影响当前会话，所以这里不做任何处理
  };

  const handleClearAllHistory = () => {
    if (confirm('确定要清除所有历史记录吗？此操作不可恢复。')) {
      // 清除 localStorage
      localStorage.removeItem('ai_generated_images');
      localStorage.removeItem('ai_favorite_images');

      // 清除当前会话的历史记录
      setGeneratedImages([]);

      // 强制刷新历史记录组件
      setRefreshTrigger(prev => prev + 1);

      // 不清除当前显示的图片 - 保持当前展示不受影响
      // setCurrentImage(null); // 注释掉这行
    }
  };

  const handleGenerate = async () => {
    if (!selectedParameters.prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setIsGenerating(true);

    try {
      // Convert image size format - 映射到后端允许的尺寸
      const sizeMap = {
        '1:1': '1024x1024',    // 正方形
        '1:2': '640x1536',     // 竖屏 1:2
        '3:2': '1664x928',     // 横屏 3:2
        '3:4': '928x1664',     // 竖屏 3:4
        '16:9': '1280x720',    // 横屏 16:9
        '9:16': '720x1280'     // 竖屏 9:16
      };

      // Use the new parallel generation endpoint for better performance
      const requestData = {
        prompt: selectedParameters.prompt,
        model: 'Kwai-Kolors/Kolors',
        image_size: sizeMap[selectedParameters.image_size] || '1024x1024',
        batch_size: parseInt(selectedParameters.batch_size),
        num_inference_steps: parseInt(selectedParameters.num_inference_steps),
        guidance_scale: parseFloat(selectedParameters.guidance_scale),
        seed: parseInt(selectedParameters.seed)
      };

      if (selectedParameters.negative_prompt) {
        requestData.negative_prompt = selectedParameters.negative_prompt;
      }

      const response = await axios.post('/api/v1/generate-parallel', requestData);
      handleImageGenerated(response.data);

      // Clear the prompt input after successful generation
      setSelectedParameters(prev => ({
        ...prev,
        prompt: ''
      }));
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to generate image';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Left Panel - Parameters */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <ParameterPanel
          parameters={selectedParameters}
          onParameterChange={handleParameterChange}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas area with fixed height to prevent overflow */}
        <div className="flex-1 min-h-0">
          <ImageCanvas
            currentImage={currentImage}
            isGenerating={isGenerating}
            onImageClick={setCurrentImage}
          />
        </div>

        {/* Bottom prompt area - Fixed height */}
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200" style={{ height: '88px' }}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={selectedParameters.prompt}
              onChange={(e) => handleParameterChange('prompt', e.target.value)}
              placeholder="描述您想创建的图片，例如：一个宁静的湖泊，今晚黄昏，远处是雾山"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedParameters.prompt.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {isGenerating ? '生成中...' : '生成'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - History */}
      <div className="w-80 bg-white border-l border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">历史记录</h3>
          <button
            onClick={handleClearAllHistory}
            className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md border border-red-200 hover:border-red-300 transition-colors"
            title="清除所有历史记录"
          >
            <div className="flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              清除全部
            </div>
          </button>
        </div>
        <ImageHistory
          images={generatedImages}
          onImageSelect={setCurrentImage}
          selectedImage={currentImage}
          onImageDelete={handleImageDelete}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}

export default App;