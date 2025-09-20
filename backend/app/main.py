from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os
from pathlib import Path
from app.api import image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Drawing Website API",
    description="Backend API for AI-powered image generation using SiliconFlow",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        # Add production domains here
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(image.router)

# Health check endpoint
@app.get("/health")
async def root_health():
    """Root health check"""
    return {"status": "healthy", "message": "AI Drawing Website API is running"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Drawing Website API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

# Serve static files in production
frontend_dist_path = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist_path / "assets")), name="static")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        """Serve frontend files"""
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        file_path = frontend_dist_path / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        else:
            # Return index.html for client-side routing
            return FileResponse(frontend_dist_path / "index.html")

# Note: For development, use run.py in the backend directory
# For production, use: uvicorn app.main:app --host 0.0.0.0 --port 8000