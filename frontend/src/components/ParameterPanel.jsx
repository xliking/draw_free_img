import React, { useState } from 'react';
import { ChevronDown, RefreshCw, HelpCircle, Github, Star } from 'lucide-react';

const ParameterPanel = ({ parameters, onParameterChange }) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    advanced: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 10000000000);
    onParameterChange('seed', randomSeed);
  };

  const imageSizeOptions = [
    { value: '1:1', label: '1:1', icon: '⬜' },
    { value: '1:2', label: '1:2', icon: '📱' },
    { value: '3:2', label: '3:2', icon: '🖼️' },
    { value: '3:4', label: '3:4', icon: '📄' },
    { value: '16:9', label: '16:9', icon: '📺' },
    { value: '9:16', label: '9:16', icon: '📱' }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-medium text-gray-900">参数设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* 基础设置 */}
        <div>
          <button
            onClick={() => toggleSection('basic')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-medium text-gray-900">基础设置</h3>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.basic ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections.basic && (
            <div className="mt-3 space-y-4">
              {/* 模型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                  Kolors
                </div>
              </div>

              {/* 图片尺寸 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图片尺寸
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {imageSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onParameterChange('image_size', option.value)}
                      className={`p-3 border rounded-lg text-xs transition-colors ${
                        parameters.image_size === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-lg mb-1">{option.icon}</div>
                      <div>{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生成数量
                  <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <select
                  value={parameters.batch_size}
                  onChange={(e) => onParameterChange('batch_size', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              {/* 随机种子 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    随机种子
                    <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                  </label>
                  <button
                    onClick={generateRandomSeed}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    随机
                  </button>
                </div>
                <input
                  type="number"
                  value={parameters.seed}
                  onChange={(e) => onParameterChange('seed', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  min="0"
                  max="9999999999"
                />
              </div>
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div>
          <button
            onClick={() => toggleSection('advanced')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-medium text-gray-900">高级设置</h3>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.advanced ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections.advanced && (
            <div className="mt-3 space-y-4">
              {/* 推理步数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  推理步数
                  <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={parameters.num_inference_steps}
                    onChange={(e) => onParameterChange('num_inference_steps', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span className="font-medium text-gray-700">{parameters.num_inference_steps}</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              {/* 引导比例 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  引导比例
                  <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={parameters.guidance_scale}
                    onChange={(e) => onParameterChange('guidance_scale', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span className="font-medium text-gray-700">{parameters.guidance_scale}</span>
                    <span>20</span>
                  </div>
                </div>
              </div>

              {/* 反向提示词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  反向提示词
                  <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <textarea
                  value={parameters.negative_prompt}
                  onChange={(e) => onParameterChange('negative_prompt', e.target.value)}
                  placeholder="不希望出现在图像中的内容..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </div>

              {/* CFG参数 (仅Qwen模型) */}
              {parameters.model.startsWith('Qwen/') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CFG参数
                    <HelpCircle className="inline w-3 h-3 ml-1 text-gray-400" />
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.1"
                      value={parameters.cfg}
                      onChange={(e) => onParameterChange('cfg', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0.1</span>
                      <span className="font-medium text-gray-700">{parameters.cfg}</span>
                      <span>20</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部区域 */}
      <div className="border-t border-gray-200">
        {/* GitHub Stars */}
        <div className="p-4">
          <a
            href="https://github.com/xliking"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Github className="w-4 h-4" />
            <Star className="w-4 h-4" />
            <span>Stars</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ParameterPanel;