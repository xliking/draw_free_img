import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ImageCanvas = ({ currentImage, isGenerating, onImageClick }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };


  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">正在生成图片...</h3>
          <p className="text-sm text-gray-500">
            请稍候，AI正在根据您的描述创建独特的艺术作品
          </p>
        </div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="text-4xl text-gray-400">🎨</div>
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">暂无图片</h3>
          <p className="text-gray-500 max-w-md">
            在左侧调整参数，输入提示词，开始创作您的AI艺术作品
          </p>
        </div>
      </div>
    );
  }

  const currentDisplayImage = currentImage?.images && currentImage.images[selectedImageIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            种子: {currentImage.seed}
          </span>
          <span className="text-xs text-gray-400">
            • {currentImage.model}
          </span>
          <span className="text-xs text-gray-400">
            • {currentImage.inference_time?.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="重置视图"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* 图片显示区域 */}
      <div
        className="flex-1 overflow-hidden relative cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: '400px' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {currentDisplayImage && (
            <img
              src={currentDisplayImage.url}
              alt={`Generated image ${currentImage.seed}`}
              className="transition-transform duration-150 object-contain"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                maxHeight: '100%',
                maxWidth: '100%',
                height: 'auto',
                width: 'auto'
              }}
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none';
                // 显示错误消息
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-center text-gray-500';
                errorDiv.innerHTML = `
                  <div class="text-red-500 mb-2">图片加载失败</div>
                  <div class="text-sm">图片可能已过期（1小时有效期）</div>
                `;
                e.target.parentNode.appendChild(errorDiv);
              }}
            />
          )}
        </div>
      </div>

      {/* 多图选择器 */}
      {currentImage.images && currentImage.images.length > 1 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {currentImage.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  selectedImageIndex === index
                    ? 'border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={image.url}
                  alt={`Generated ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            第 {selectedImageIndex + 1} 张，共 {currentImage.images.length} 张
          </div>
        </div>
      )}

      {/* 图片信息 */}
      {currentImage.parameters && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-1">提示词:</div>
            <div className="text-gray-600 bg-gray-50 p-2 rounded text-xs">
              {currentImage.parameters.prompt}
            </div>
            {currentImage.parameters.negative_prompt && (
              <>
                <div className="font-medium text-gray-700 mb-1 mt-2">反向提示词:</div>
                <div className="text-gray-600 bg-gray-50 p-2 rounded text-xs">
                  {currentImage.parameters.negative_prompt}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;