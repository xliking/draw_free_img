@echo off
echo Starting AI Drawing Studio with Docker...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy ".env.example" ".env"
)

REM Check if keys.txt exists
if not exist "keys.txt" (
    echo Creating empty keys.txt file...
    echo # Add your SiliconFlow API keys here, one per line > keys.txt
    echo # Example: sk-your-api-key-1 >> keys.txt
    echo WARNING: Please add your SiliconFlow API keys to keys.txt
    echo.
)

echo Building and starting services...
docker-compose up --build -d

echo.
echo Services started successfully!
echo.
echo Access the application:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - API Documentation: http://localhost:8000/docs
echo.
echo To stop services, run: docker-compose down
echo To view logs, run: docker-compose logs -f

pause