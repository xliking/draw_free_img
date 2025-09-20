import React, { useState, useEffect } from 'react';
import { Download, Eye, Clock, Hash, Zap, Copy, Check } from 'lucide-react';

const ImageGallery = ({ generatedImages, addGeneratedImage }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [copiedSeed, setCopiedSeed] = useState(null);
  const [savedImages, setSavedImages] = useState([]);

  useEffect(() => {
    // Load saved images from localStorage
    const saved = localStorage.getItem('ai_generated_images');
    if (saved) {
      try {
        setSavedImages(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save images to localStorage whenever generatedImages changes
    if (generatedImages.length > 0) {
      const allImages = [...savedImages, ...generatedImages];
      const uniqueImages = allImages.filter((image, index, self) =>
        index === self.findIndex(img => img.seed === image.seed && img.images[0]?.url === image.images[0]?.url)
      );
      setSavedImages(uniqueImages);
      localStorage.setItem('ai_generated_images', JSON.stringify(uniqueImages));
    }
  }, [generatedImages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const formatInferenceTime = (time) => {
    return `${time.toFixed(2)}s`;
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
      alert('Failed to download image. The URL might have expired.');
    }
  };

  const copySeed = (seed) => {
    navigator.clipboard.writeText(seed.toString());
    setCopiedSeed(seed);
    setTimeout(() => setCopiedSeed(null), 2000);
  };

  const openImageModal = (image, imageIndex = 0) => {
    setSelectedImage({ ...image, selectedImageIndex: imageIndex });
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const getTimeRemaining = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const generated = new Date(timestamp);
    const expiry = new Date(generated.getTime() + 60 * 60 * 1000); // 1 hour later
    const now = new Date();
    const remaining = expiry - now;

    if (remaining <= 0) {
      return 'Expired';
    }

    const minutes = Math.floor(remaining / (1000 * 60));
    return `${minutes}m remaining`;
  };

  const allImages = [...savedImages, ...generatedImages];
  const uniqueImages = allImages.filter((image, index, self) =>
    index === self.findIndex(img => img.seed === image.seed && img.images[0]?.url === image.images[0]?.url)
  );

  if (uniqueImages.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-gray-400 mb-4">
          <Eye className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-medium text-gray-600 mb-2">No images generated yet</h3>
        <p className="text-gray-500">
          Generated images will appear here. Start by creating your first AI artwork!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary-600" />
          Generated Images ({uniqueImages.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {uniqueImages.map((imageData, index) => (
            <div key={`${imageData.seed}-${index}`} className="space-y-3">
              {imageData.images.map((image, imageIndex) => (
                <div
                  key={`${imageData.seed}-${imageIndex}`}
                  className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Image */}
                  <div className="aspect-square relative">
                    <img
                      src={image.url}
                      alt={`Generated image ${imageData.seed}-${imageIndex}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openImageModal(imageData, imageIndex)}
                      loading="lazy"
                    />

                    {/* Overlay controls */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openImageModal(imageData, imageIndex)}
                          className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                          title="View full size"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadImage(image.url, imageData.seed)}
                          className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                          title="Download image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* URL expiry indicator */}
                    <div className="absolute top-2 right-2">
                      <span className={`text-xs px-2 py-1 rounded-full text-white ${
                        getTimeRemaining(imageData.timestamp) === 'Expired'
                          ? 'bg-red-500'
                          : 'bg-orange-500'
                      }`}>
                        {getTimeRemaining(imageData.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {imageData.seed}
                      </span>
                      <button
                        onClick={() => copySeed(imageData.seed)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy seed"
                      >
                        {copiedSeed === imageData.seed ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {formatInferenceTime(imageData.inference_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(imageData.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <p className="truncate" title={imageData.parameters?.prompt}>
                        {imageData.parameters?.prompt || 'No prompt'}
                      </p>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{imageData.model}</span>
                      <span>{imageData.parameters?.image_size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedImage.images[selectedImage.selectedImageIndex]?.url}
                alt={`Generated image ${selectedImage.seed}`}
                className="max-w-full max-h-[80vh] object-contain"
              />

              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Download button */}
              <button
                onClick={() => downloadImage(
                  selectedImage.images[selectedImage.selectedImageIndex]?.url,
                  selectedImage.seed
                )}
                className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Image details */}
            <div className="p-6 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Seed</span>
                  <p className="text-lg font-mono">{selectedImage.seed}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Model</span>
                  <p className="text-sm">{selectedImage.model}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Size</span>
                  <p className="text-sm">{selectedImage.parameters?.image_size}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Inference Time</span>
                  <p className="text-sm">{formatInferenceTime(selectedImage.inference_time)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Prompt</span>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                    {selectedImage.parameters?.prompt || 'No prompt'}
                  </p>
                </div>

                {selectedImage.parameters?.negative_prompt && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Negative Prompt</span>
                    <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                      {selectedImage.parameters.negative_prompt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;