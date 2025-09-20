import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Download, Wand, Upload, X } from 'lucide-react';

const ImageGenerator = ({ onImageGenerated, isGenerating, setIsGenerating }) => {
  const [formData, setFormData] = useState({
    prompt: '',
    negative_prompt: '',
    model: 'Kwai-Kolors/Kolors',
    image_size: '1024x1024',
    batch_size: 1,
    seed: '',
    num_inference_steps: 20,
    guidance_scale: 7.5,
    cfg: 4.0,
    image: null
  });

  const [models, setModels] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const imageSizes = [
    '1024x1024', '1328x1328', '1664x928', '928x1664',
    '1280x720', '720x1280', '1536x640', '640x1536'
  ];

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get('/api/v1/models');
      setModels(response.data.models);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setModels([
        {
          id: 'Kwai-Kolors/Kolors',
          name: 'Kolors',
          description: 'High-quality image generation model'
        },
        {
          id: 'Qwen/Qwen-Image',
          name: 'Qwen Image',
          description: 'Advanced image generation with CFG support',
          supports_cfg: true
        }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        setFormData(prev => ({ ...prev, image: base64 }));
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 10000000000);
    setFormData(prev => ({ ...prev, seed: randomSeed.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);

    try {
      const requestData = {
        prompt: formData.prompt,
        model: formData.model,
        image_size: formData.image_size,
        batch_size: parseInt(formData.batch_size),
        num_inference_steps: parseInt(formData.num_inference_steps),
        guidance_scale: parseFloat(formData.guidance_scale)
      };

      if (formData.negative_prompt) {
        requestData.negative_prompt = formData.negative_prompt;
      }

      if (formData.seed) {
        requestData.seed = parseInt(formData.seed);
      }

      if (formData.model.startsWith('Qwen/') && formData.cfg) {
        requestData.cfg = parseFloat(formData.cfg);
      }

      if (formData.image) {
        requestData.image = formData.image;
      }

      const response = await axios.post('/api/v1/generate', requestData);
      onImageGenerated(response.data);
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to generate image';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedModel = models.find(m => m.id === formData.model);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wand className="w-6 h-6 text-primary-600" />
          AI Image Generator
        </h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn-secondary flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt *
          </label>
          <textarea
            name="prompt"
            value={formData.prompt}
            onChange={handleInputChange}
            placeholder="Describe the image you want to generate..."
            rows={3}
            required
            className="input-field resize-none"
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Negative Prompt
          </label>
          <textarea
            name="negative_prompt"
            value={formData.negative_prompt}
            onChange={handleInputChange}
            placeholder="What you don't want to see in the image..."
            rows={2}
            className="input-field resize-none"
          />
        </div>

        {/* Reference Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reference Image (Optional)
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Reference"
                  className="max-h-32 rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  Drag and drop an image, or{' '}
                  <label className="text-primary-600 cursor-pointer hover:text-primary-700">
                    click to browse
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="input-field"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Size
            </label>
            <select
              name="image_size"
              value={formData.image_size}
              onChange={handleInputChange}
              className="input-field"
            >
              {imageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <select
              name="batch_size"
              value={formData.batch_size}
              onChange={handleInputChange}
              className="input-field"
            >
              {[1, 2, 3, 4].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seed
                  <button
                    type="button"
                    onClick={generateRandomSeed}
                    className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                  >
                    Random
                  </button>
                </label>
                <input
                  type="number"
                  name="seed"
                  value={formData.seed}
                  onChange={handleInputChange}
                  placeholder="Random"
                  min="0"
                  max="9999999999"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inference Steps ({formData.num_inference_steps})
                </label>
                <input
                  type="range"
                  name="num_inference_steps"
                  value={formData.num_inference_steps}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guidance Scale ({formData.guidance_scale})
                </label>
                <input
                  type="range"
                  name="guidance_scale"
                  value={formData.guidance_scale}
                  onChange={handleInputChange}
                  min="0"
                  max="20"
                  step="0.1"
                  className="w-full"
                />
              </div>

              {selectedModel?.supports_cfg && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CFG ({formData.cfg})
                  </label>
                  <input
                    type="range"
                    name="cfg"
                    value={formData.cfg}
                    onChange={handleInputChange}
                    min="0.1"
                    max="20"
                    step="0.1"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating || !formData.prompt.trim()}
          className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="loading-spinner w-5 h-5"></div>
              Generating...
            </>
          ) : (
            <>
              <Wand className="w-5 h-5" />
              Generate Image
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ImageGenerator;