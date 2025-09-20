import React, { useState, useEffect } from 'react';
import { Clock, Hash, Download, Trash2, Star } from 'lucide-react';

const ImageHistory = ({ images, onImageSelect, selectedImage, onImageDelete, refreshTrigger }) => {
  const [savedImages, setSavedImages] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [deletedImages, setDeletedImages] = useState(new Set());

  useEffect(() => {
    // Load saved images and favorites from localStorage
    const saved = localStorage.getItem('ai_generated_images');
    const favs = localStorage.getItem('ai_favorite_images');

    if (saved) {
      try {
        const allSavedImages = JSON.parse(saved);
        // Clean up images older than 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const validImages = allSavedImages.filter(img =>
          img.timestamp && img.timestamp > sevenDaysAgo
        );

        // Update localStorage if any images were removed
        if (validImages.length !== allSavedImages.length) {
          localStorage.setItem('ai_generated_images', JSON.stringify(validImages));
        }

        setSavedImages(validImages);
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }

    if (favs) {
      try {
        setFavorites(new Set(JSON.parse(favs)));
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save new images to localStorage
    if (images.length > 0) {
      const allImages = [...savedImages, ...images];
      const uniqueImages = allImages.filter((image, index, self) =>
        index === self.findIndex(img => img.seed === image.seed && img.timestamp === image.timestamp)
      );
      setSavedImages(uniqueImages);
      localStorage.setItem('ai_generated_images', JSON.stringify(uniqueImages));
    }
  }, [images]);

  useEffect(() => {
    // Refresh saved images when refreshTrigger changes
    if (refreshTrigger > 0) {
      const saved = localStorage.getItem('ai_generated_images');
      if (saved) {
        try {
          const allSavedImages = JSON.parse(saved);
          // Clean up images older than 7 days
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          const validImages = allSavedImages.filter(img =>
            img.timestamp && img.timestamp > sevenDaysAgo
          );
          setSavedImages(validImages);
        } catch (error) {
          console.error('Failed to refresh saved images:', error);
        }
      } else {
        // 如果 localStorage 为空，说明被清除了，需要清空本地状态
        setSavedImages([]);
        setFavorites(new Set());
        setDeletedImages(new Set());
      }
    }
  }, [refreshTrigger]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getTimeRemaining = (timestamp) => {
    if (!timestamp) return '已过期';
    const generated = new Date(timestamp);
    const expiry = new Date(generated.getTime() + 60 * 60 * 1000); // 1 hour later
    const now = new Date();
    const remaining = expiry - now;

    if (remaining <= 0) {
      return '已过期';
    }

    const minutes = Math.floor(remaining / (1000 * 60));
    return `${minutes}分钟后过期`;
  };

  const downloadImage = async (imageUrl, seed) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai_generated_${seed}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('下载失败，图片可能已过期');
    }
  };

  const toggleFavorite = (imageId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(imageId)) {
      newFavorites.delete(imageId);
    } else {
      newFavorites.add(imageId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('ai_favorite_images', JSON.stringify([...newFavorites]));
  };

  const deleteImage = (imageId) => {
    // 立即标记为已删除，从显示中移除
    setDeletedImages(prev => new Set([...prev, imageId]));

    // 更新 localStorage
    const filteredImages = savedImages.filter(img => `${img.seed}-${img.timestamp}` !== imageId);
    localStorage.setItem('ai_generated_images', JSON.stringify(filteredImages));

    // Remove from favorites too
    const newFavorites = new Set(favorites);
    newFavorites.delete(imageId);
    localStorage.setItem('ai_favorite_images', JSON.stringify([...newFavorites]));

    // 更新状态
    setSavedImages(filteredImages);
    setFavorites(newFavorites);

    // 通知父组件删除操作完成（但不影响当前显示）
    if (onImageDelete) {
      onImageDelete(imageId);
    }
  };

  // 合并当前会话图片和已保存图片，过滤掉已删除的图片
  const allImages = [...savedImages, ...images];
  const uniqueImages = allImages.filter((image, index, self) => {
    const imageId = `${image.seed}-${image.timestamp}`;
    // 过滤掉已删除的图片
    if (deletedImages.has(imageId)) {
      return false;
    }
    // 去重
    return index === self.findIndex(img =>
      img.seed === image.seed &&
      (img.timestamp === image.timestamp || Math.abs((img.timestamp || 0) - (image.timestamp || 0)) < 1000)
    );
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (uniqueImages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-sm">暂无历史记录</div>
          <div className="text-xs text-gray-400 mt-1">
            生成的图片将显示在这里
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 space-y-2">
        {uniqueImages.map((imageData) => {
          const imageId = `${imageData.seed}-${imageData.timestamp}`;
          const isSelected = selectedImage && selectedImage.seed === imageData.seed &&
                           selectedImage.timestamp === imageData.timestamp;
          const isFavorite = favorites.has(imageId);
          const displayImage = imageData.images && imageData.images[0];

          return (
            <div
              key={imageId}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
              onClick={() => onImageSelect(imageData)}
            >
              {/* 图片 */}
              <div className="aspect-square relative">
                {displayImage ? (
                  <img
                    src={displayImage.url}
                    alt={`Generated ${imageData.seed}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk3YTNiNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+W3seiL/ua+iTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">无图片</span>
                  </div>
                )}

                {/* 工具按钮 */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(imageId);
                    }}
                    className={`p-1 rounded-full backdrop-blur-sm transition-colors ${
                      isFavorite
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/80 text-gray-600 hover:bg-white'
                    }`}
                    title={isFavorite ? '取消收藏' : '收藏'}
                  >
                    <Star className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (displayImage) downloadImage(displayImage.url, imageData.seed);
                    }}
                    className="p-1 bg-white/80 backdrop-blur-sm rounded-full text-gray-600 hover:bg-white transition-colors"
                    title="下载"
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定要删除这张图片吗？')) {
                        deleteImage(imageId);
                      }
                    }}
                    className="p-1 bg-white/80 backdrop-blur-sm rounded-full text-red-600 hover:bg-white transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* 过期状态 */}
                <div className="absolute bottom-2 left-2">
                  <span className={`text-xs px-2 py-1 rounded-full text-white backdrop-blur-sm ${
                    getTimeRemaining(imageData.timestamp) === '已过期'
                      ? 'bg-red-500/80'
                      : 'bg-orange-500/80'
                  }`}>
                    {getTimeRemaining(imageData.timestamp)}
                  </span>
                </div>
              </div>

              {/* 信息 */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-600 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {imageData.seed}
                  </span>
                  <span className="text-xs text-gray-500">
                    {imageData.inference_time ? `${imageData.inference_time.toFixed(1)}s` : ''}
                  </span>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2">
                  <div className="line-clamp-3">
                    {imageData.parameters?.prompt || '无提示词'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(imageData.timestamp)}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {imageData.model?.split('/')[1] || '未知模型'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageHistory;