#!/usr/bin/env python3
"""
Startup script for the AI Drawing Studio backend.

This script properly configures the Python path and starts the FastAPI application.
"""

import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    import uvicorn

    # Run the application using import string for reload support
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )