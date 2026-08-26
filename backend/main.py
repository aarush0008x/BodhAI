import sys
import os

# Ensure backend root directory is in python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import init_db
from app.services.llm import llm_service, OllamaException
from app.routers import chat_router, conversations_router, share_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bodhai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing Bodh AI backend...")
    logger.info(f"Ollama Target URL: {settings.OLLAMA_BASE_URL} (Model: {settings.OLLAMA_MODEL})")
    await init_db()
    logger.info("Bodh AI backend startup completed.")
    yield
    logger.info("Shutting down Bodh AI backend.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Bodh AI - High-Performance AI Assistant Backend powered by Qwen3-8B and Ollama",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(OllamaException)
async def ollama_exception_handler(request: Request, exc: OllamaException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": exc.code,
            "message": exc.message
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": f"HTTP_{exc.status_code}",
            "message": exc.detail
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "code": "VALIDATION_ERROR",
            "message": "Invalid request payload.",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred. Please try again later."
        }
    )


# Register API Routers
app.include_router(chat_router)
app.include_router(conversations_router)
app.include_router(share_router)


@app.get("/", tags=["Status"])
async def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "version": settings.VERSION,
        "model": settings.OLLAMA_MODEL
    }


@app.get("/health", tags=["Status"])
async def health_check():
    ollama_status = await llm_service.check_health()
    return {
        "status": "healthy" if ollama_status.get("online") else "degraded",
        "version": settings.VERSION,
        "model": settings.OLLAMA_MODEL,
        "engine": "Ollama",
        "ollama": ollama_status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
