import asyncio
import httpx
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, validator
import time
from app.utils.load_balancer import get_load_balancer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["image"])

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="Text prompt for image generation")
    negative_prompt: Optional[str] = Field(None, max_length=2000, description="Negative prompt")
    model: str = Field(default="Kwai-Kolors/Kolors", description="Model to use for generation")
    image_size: str = Field(default="1024x1024", description="Image size")
    batch_size: int = Field(default=1, ge=1, le=10, description="Number of images to generate")
    seed: Optional[int] = Field(None, ge=0, le=9999999999, description="Random seed")
    num_inference_steps: int = Field(default=20, ge=1, le=100, description="Number of inference steps")
    guidance_scale: float = Field(default=7.5, ge=0, le=20, description="Guidance scale")
    cfg: Optional[float] = Field(None, ge=0.1, le=20, description="CFG parameter for Qwen models")
    image: Optional[str] = Field(None, description="Reference image in base64 format")

    @validator('model')
    def validate_model(cls, v):
        allowed_models = ["Kwai-Kolors/Kolors", "Qwen/Qwen-Image"]
        if v not in allowed_models:
            raise ValueError(f"Model must be one of {allowed_models}")
        return v

    @validator('image_size')
    def validate_image_size(cls, v):
        # Allow both ratio format (1:1) and pixel format (1024x1024)
        allowed_ratios = ["1:1", "1:2", "3:2", "3:4", "16:9", "9:16"]
        allowed_sizes = [
            "1024x1024", "1328x1328", "1664x928", "928x1664",
            "1280x720", "720x1280", "1536x640", "640x1536"
        ]
        if v not in allowed_ratios and v not in allowed_sizes:
            raise ValueError(f"Image size must be one of {allowed_ratios} or {allowed_sizes}")
        return v

    @validator('cfg')
    def validate_cfg(cls, v, values):
        if v is not None and 'model' in values:
            if not values['model'].startswith('Qwen/'):
                raise ValueError("CFG parameter is only available for Qwen models")
        return v

class ImageGenerationResponse(BaseModel):
    images: List[Dict[str, Any]]
    seed: int
    inference_time: float
    model: str
    parameters: Dict[str, Any]

class GenerationStatus(BaseModel):
    status: str
    message: str
    generation_id: Optional[str] = None

async def generate_image_with_retry(
    request_data: Dict[str, Any],
    max_retries: int = 3,
    base_delay: float = 1.0
) -> Dict[str, Any]:
    """Generate image with exponential backoff retry"""
    load_balancer = get_load_balancer()

    for attempt in range(max_retries):
        api_key = load_balancer.get_available_key()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="No available API keys. Please try again later."
            )

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }

                start_time = time.time()
                response = await client.post(
                    "https://api.siliconflow.cn/v1/images/generations",
                    headers=headers,
                    json=request_data
                )
                inference_time = time.time() - start_time

                if response.status_code == 200:
                    load_balancer.record_success(api_key)
                    result = response.json()

                    # Standardize response format
                    standardized_result = {
                        "images": result.get("images", []),
                        "seed": result.get("seed", 0),
                        "inference_time": result.get("timings", {}).get("inference", inference_time),
                        "model": request_data.get("model", "Kwai-Kolors/Kolors")
                    }

                    return standardized_result
                elif response.status_code == 429:
                    # Rate limit exceeded
                    load_balancer.record_failure(api_key)
                    logger.warning(f"Rate limit exceeded for key {api_key[:10]}...")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(base_delay * (2 ** attempt))
                        continue
                elif response.status_code == 401:
                    # Unauthorized - mark key as failed
                    load_balancer.record_failure(api_key)
                    logger.error(f"Unauthorized API key: {api_key[:10]}...")
                    continue
                else:
                    # Other errors
                    load_balancer.record_failure(api_key)
                    error_detail = response.text
                    logger.error(f"API error {response.status_code}: {error_detail}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"API error: {error_detail}"
                    )

        except httpx.TimeoutException:
            load_balancer.record_failure(api_key)
            logger.error(f"Timeout for API key: {api_key[:10]}...")
            if attempt < max_retries - 1:
                await asyncio.sleep(base_delay * (2 ** attempt))
                continue
        except Exception as e:
            load_balancer.record_failure(api_key)
            logger.error(f"Unexpected error: {str(e)}")
            if attempt < max_retries - 1:
                await asyncio.sleep(base_delay * (2 ** attempt))
                continue

    raise HTTPException(
        status_code=503,
        detail="Failed to generate image after multiple retries"
    )

@router.post("/generate-parallel")
async def generate_parallel_images(request: ImageGenerationRequest):
    """Generate multiple images using parallel API calls with different keys"""
    try:
        if request.batch_size > 10:
            raise HTTPException(status_code=400, detail="Maximum batch size is 10")

        load_balancer = get_load_balancer()

        # Get multiple API keys for parallel requests
        api_keys = load_balancer.get_multiple_available_keys(request.batch_size)

        if len(api_keys) < request.batch_size:
            # Fall back to using available keys with some repetition
            available_count = len(api_keys)
            if available_count == 0:
                raise HTTPException(status_code=503, detail="No API keys available")

            # Cycle through available keys
            while len(api_keys) < request.batch_size:
                api_keys.extend(api_keys[:min(available_count, request.batch_size - len(api_keys))])

        # Convert ratio format to pixel format if needed
        def convert_image_size(size_str):
            size_map = {
                '1:1': '1024x1024',    # 正方形
                '1:2': '640x1536',     # 竖屏 1:2
                '3:2': '1664x928',     # 横屏 3:2
                '3:4': '928x1664',     # 竖屏 3:4
                '16:9': '1280x720',    # 横屏 16:9
                '9:16': '720x1280'     # 竖屏 9:16
            }
            return size_map.get(size_str, size_str)

        # Create individual requests
        tasks = []
        for i in range(request.batch_size):
            # Prepare individual request data
            individual_request = request.dict()
            individual_request['batch_size'] = 1  # Each request generates 1 image
            individual_request['seed'] = (request.seed or 0) + i  # Different seed for each
            individual_request['image_size'] = convert_image_size(individual_request['image_size'])  # Convert ratio to pixels

            # Create the generation task
            task = generate_single_image_with_key(individual_request, api_keys[i % len(api_keys)])
            tasks.append(task)

        # Execute all requests in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        successful_results = []
        failed_count = 0

        for result in results:
            if isinstance(result, Exception):
                failed_count += 1
                logger.error(f"Parallel generation failed: {result}")
            else:
                successful_results.append(result)

        if not successful_results:
            raise HTTPException(status_code=500, detail="All parallel requests failed")

        # Combine successful results
        all_images = []
        total_inference_time = 0

        for result in successful_results:
            if result.get('images'):
                all_images.extend(result['images'])
                total_inference_time += result.get('inference_time', 0)

        return ImageGenerationResponse(
            images=all_images,
            seed=request.seed or 0,
            inference_time=total_inference_time / len(successful_results) if successful_results else 0,
            model=request.model,
            parameters=request.dict()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in parallel generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during parallel generation")

async def generate_single_image_with_key(request_data: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    """Generate a single image using a specific API key"""
    load_balancer = get_load_balancer()

    try:
        # Prepare simplified request format based on official docs
        simplified_request = {
            "model": request_data.get("model", "Kwai-Kolors/Kolors"),
            "prompt": request_data.get("prompt")
        }

        # Add optional parameters only if they exist and are valid
        if request_data.get("size"):
            simplified_request["size"] = request_data["size"]
        elif request_data.get("image_size"):
            simplified_request["size"] = request_data["image_size"]

        # For Kolors model, use 'step' instead of 'num_inference_steps'
        if request_data.get("num_inference_steps"):
            simplified_request["step"] = request_data["num_inference_steps"]

        # Add batch size (n parameter)
        if request_data.get("batch_size", 1) > 1:
            simplified_request["n"] = request_data["batch_size"]

        # Add seed if provided
        if request_data.get("seed"):
            simplified_request["seed"] = request_data["seed"]

        # Add negative prompt if provided
        if request_data.get("negative_prompt"):
            simplified_request["negative_prompt"] = request_data["negative_prompt"]

        logger.info(f"Sending request: {simplified_request}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            start_time = time.time()
            response = await client.post(
                "https://api.siliconflow.cn/v1/images/generations",
                headers=headers,
                json=simplified_request
            )
            inference_time = time.time() - start_time

            if response.status_code == 200:
                load_balancer.record_success(api_key)
                result = response.json()

                # Standardize response format
                standardized_result = {
                    "images": result.get("images", []),
                    "seed": result.get("seed", 0),
                    "inference_time": result.get("timings", {}).get("inference", inference_time),
                    "model": simplified_request["model"]
                }

                return standardized_result
            else:
                load_balancer.record_failure(api_key)
                error_detail = response.text
                logger.error(f"API error {response.status_code}: {error_detail}")
                raise Exception(f"API error: {error_detail}")

    except Exception as e:
        load_balancer.record_failure(api_key)
        raise e

@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """Generate images using SiliconFlow API"""
    try:
        # Convert ratio format to pixel format if needed
        def convert_image_size(size_str):
            size_map = {
                '1:1': '1024x1024',    # 正方形
                '1:2': '640x1536',     # 竖屏 1:2
                '3:2': '1664x928',     # 横屏 3:2
                '3:4': '928x1664',     # 竖屏 3:4
                '16:9': '1280x720',    # 横屏 16:9
                '9:16': '720x1280'     # 竖屏 9:16
            }
            return size_map.get(size_str, size_str)

        # Prepare simplified request format for SiliconFlow API
        request_data = {
            "model": request.model,
            "prompt": request.prompt,
            "size": convert_image_size(request.image_size)
        }

        # Add step parameter (instead of num_inference_steps)
        if request.num_inference_steps:
            request_data["step"] = request.num_inference_steps

        # Add batch size if > 1
        if request.batch_size > 1:
            request_data["n"] = request.batch_size

        # Add optional parameters
        if request.negative_prompt:
            request_data["negative_prompt"] = request.negative_prompt

        if request.seed is not None:
            request_data["seed"] = request.seed

        # Note: guidance_scale and cfg may not be supported in the simplified format
        # We'll focus on the basic parameters that work

        # Generate image
        result = await generate_image_with_retry(request_data)

        # Extract response data
        images = result.get("images", [])
        seed = result.get("seed", request.seed or 0)
        inference_time = result.get("inference_time", 0)

        return ImageGenerationResponse(
            images=images,
            seed=seed,
            inference_time=inference_time,
            model=request.model,
            parameters=request_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during image generation"
        )

@router.get("/models")
async def get_available_models():
    """Get list of available models"""
    return {
        "models": [
            {
                "id": "Kwai-Kolors/Kolors",
                "name": "Kolors",
                "description": "High-quality image generation model",
                "supported_sizes": ["1024x1024", "1328x1328", "1664x928", "928x1664"]
            },
            {
                "id": "Qwen/Qwen-Image",
                "name": "Qwen Image",
                "description": "Advanced image generation with CFG support",
                "supported_sizes": ["1328x1328", "1664x928", "928x1664", "1280x720", "720x1280"],
                "supports_cfg": True
            }
        ]
    }

@router.get("/stats")
async def get_api_stats():
    """Get API usage statistics"""
    try:
        load_balancer = get_load_balancer()
        stats = load_balancer.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

@router.post("/test-request")
async def test_request(request: ImageGenerationRequest):
    """Test endpoint to validate request data"""
    return {
        "status": "success",
        "message": "Request data is valid",
        "received_data": request.dict()
    }

@router.post("/test-single-api")
async def test_single_api():
    """Test single API call to SiliconFlow"""
    load_balancer = get_load_balancer()
    api_key = load_balancer.get_available_key()

    if not api_key:
        return {"status": "error", "message": "No API keys available"}

    try:
        # Simple test request
        test_request = {
            "model": "Kwai-Kolors/Kolors",
            "prompt": "a simple test image",
            "size": "1024x1024"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            logger.info(f"Testing API with request: {test_request}")

            response = await client.post(
                "https://api.siliconflow.cn/v1/images/generations",
                headers=headers,
                json=test_request
            )

            return {
                "status": "success" if response.status_code == 200 else "error",
                "status_code": response.status_code,
                "response": response.json() if response.status_code == 200 else response.text,
                "request_sent": test_request
            }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "request_sent": test_request
        }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        load_balancer = get_load_balancer()
        stats = load_balancer.get_stats()

        is_healthy = stats["active_keys"] > 0

        return {
            "status": "healthy" if is_healthy else "degraded",
            "active_keys": stats["active_keys"],
            "total_keys": stats["total_keys"],
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }