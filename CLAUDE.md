# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an open-source AI-powered drawing website that integrates with SiliconFlow's image generation API to create images from text prompts. The project consists of a React frontend with Tailwind CSS styling and a Python FastAPI backend.

## Project Architecture

### Frontend (React + Tailwind CSS)
- **Framework**: React (JSX via CDN)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Key Components**:
  - `ImageGenerator.jsx` - Form component for image generation parameters
  - `ImageGallery.jsx` - Gallery component for displaying generated images
  - `App.jsx` - Main application component

### Backend (Python + FastAPI)
- **Framework**: FastAPI
- **HTTP Client**: httpx for async API requests
- **Load Balancing**: Custom implementation for API key rotation
- **Optional Caching**: Redis for storing generation records
- **Key Modules**:
  - `app/api/image.py` - Image generation API routes
  - `app/utils/load_balancer.py` - Load balancing and key rotation logic
  - `app/main.py` - FastAPI main application

## API Integration

### SiliconFlow API
- **Endpoint**: `POST https://api.siliconflow.cn/v1/images/generations`
- **Rate Limits**: IPM=2, IPD=400 per key
- **API Keys**: Located in `keys.txt` (400+ keys for load balancing)
- **Models Supported**:
  - `Kwai-Kolors/Kolors`
  - `Qwen/Qwen-Image`

### Key Parameters
- `prompt` - Text description for image generation
- `negative_prompt` - What to avoid in the image
- `model` - AI model to use
- `image_size` - Resolution (e.g., "1328x1328", "1664x928")
- `batch_size` - Number of images (1-4)
- `seed` - Random seed (0-9999999999)
- `num_inference_steps` - Inference steps (1-100, default 20)
- `guidance_scale` - Guidance scale (0-20, default 7.5)
- `cfg` - CFG parameter for Qwen models only (0.1-20, default 4.0)
- `image` - Reference image in base64 format (optional)

## Development Commands

Since this is an early-stage project, standard commands will be:

### Frontend Development
```bash
# Install dependencies
cd frontend
npm install

# Option 1: Standard npm command
npm run dev

# Option 2: Use batch file (Windows)
start.bat

# Option 3: Use shell script (Linux/Mac)
./start.sh

# Build for production
npm run build
```

### Backend Development
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Option 1: Use the Python script (recommended)
python run.py

# Option 2: Use the batch file (Windows)
start.bat

# Option 3: Use the shell script (Linux/Mac)
./start.sh

# Option 4: Direct uvicorn command
set PYTHONPATH=%CD% && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d
```

## Important Implementation Details

### Load Balancing Strategy
- Implement round-robin or weighted rotation across 400+ API keys
- Track usage per key to respect rate limits (IPM=2, IPD=400)
- Implement exponential backoff retry on failures
- Handle 429 (Too Many Requests) errors gracefully

### Security Considerations
- Never expose API keys to frontend
- All SiliconFlow API calls must go through backend proxy
- Validate and sanitize all user inputs
- Use HTTPS in production

### Image URL Handling
- Generated image URLs expire after 1 hour
- Consider implementing local caching/download of generated images
- Provide clear download instructions to users

### Error Handling
- Handle API failures (401, 400, 429, timeout)
- Provide user-friendly error messages
- Implement proper logging for debugging

### Performance Requirements
- Frontend load time < 2 seconds
- Backend response time < 500ms (excluding inference)
- Support 100+ concurrent users

## File Structure
```
painting-website/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageGenerator.jsx
│   │   │   ├── ImageGallery.jsx
│   │   │   └── ...
│   │   ├── App.jsx
│   │   └── index.html
│   ├── public/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── image.py
│   │   ├── utils/
│   │   │   └── load_balancer.py
│   │   └── main.py
│   └── requirements.txt
├── keys.txt
├── docker-compose.yml
├── README.md
└── LICENSE
```

## Internationalization
- Support Chinese and English languages
- Implement language switching functionality
- Localize error messages and UI text