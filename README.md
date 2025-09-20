# 🎨 AI Drawing Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

一个开源的人工智能绘画网站，集成 SiliconFlow 的图像生成 API，通过文本提示创建令人惊艳的艺术作品。

## ✨ 核心特性

- 🤖 **AI 图像生成**: 使用先进的 AI 模型生成高质量图像
- 🎨 **多模型支持**: 支持 Kolors 和 Qwen-Image 模型  
- ⚡ **批量生成**: 一次生成多达 10 张图像
- 🖼️ **参考图像**: 上传参考图像指导生成过程
- 🎛️ **高级参数**: 精细调节种子、步数、引导比例和 CFG
- ⚖️ **智能负载均衡**: 400+ API 密钥智能轮换，自动重试
- 📊 **实时监控**: API 使用情况和密钥状态监控
- 📱 **响应式设计**: 支持桌面、平板和移动设备

## 🛠️ 技术栈

### 前端
- **React 18** - 现代 React 与 Hooks
- **Vite** - 快速构建工具和开发服务器
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Axios** - API 请求的 HTTP 客户端
- **Lucide React** - 精美图标库

### 后端
- **FastAPI** - 高性能 Python Web 框架
- **httpx** - 异步 HTTP 客户端
- **Pydantic** - 数据验证和设置管理
- **uvicorn** - 生产环境 ASGI 服务器


## 🚀 快速开始

### 环境要求
- Python 3.11+
- Node.js 18+
- Docker 和 Docker Compose（容器化部署）

### Docker 部署（推荐）

```text
  复制 .env.example 到 .env
  修改里面的地址为 你的服务器地址 (REACT_APP_BACKEND_URL=http://localhost:8000)
  也就是 http://你的服务器地址:后端端口
  
  执行对应的 docker-compose.yml , docker compose up -d 
```


## 📋 API 文档

### 主要接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/generate-parallel` | POST | 并行生成多张图片 |


### 请求示例

```json
{
  "prompt": "一幅美丽的山水画，湖光山色",
  "negative_prompt": "模糊，低质量",
  "model": "Kwai-Kolors/Kolors",
  "image_size": "1024x1024",
  "batch_size": 2,
  "seed": 12345,
  "num_inference_steps": 25,
  "guidance_scale": 7.5
}
```

## 📁 项目结构

```
ai-drawing-studio/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── utils/          # 工具类
│   │   └── main.py         # 应用入口
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── App.jsx        # 主应用组件
│   │   └── main.jsx       # 应用入口
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker 编排文件
├── keys.txt               # API 密钥文件
└── README.md              # 项目文档
```
