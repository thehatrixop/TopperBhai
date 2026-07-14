from dotenv import load_dotenv
from pathlib import Path
import os
# Load env file at the very start
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.subjects import router as subjects_router
from routers.topics import router as topics_router
from routers.generate import router as generate_router
from routers.chat import router as chat_router
from routers.grammar import router as grammar_router
from routers.video import router as video_router
from routers.scribe import router as scribe_router
from routers.manga import router as manga_router
from routers.community import router as community_router
from routers.study_plan import router as study_plan_router

# Parse allowed origins from environment variable
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://topper-bhai.vercel.app")
allowed_origins = [origin.strip().rstrip("/") for origin in allowed_origins_str.split(",") if origin.strip()]

from fastapi.responses import JSONResponse
import traceback

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print("=== GLOBAL EXCEPTION HANDLED ===")
    traceback.print_exc()
    headers = {
        "Access-Control-Allow-Origin": "https://topper-bhai.vercel.app",
        "Access-Control-Allow-Credentials": "true"
    }
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": str(exc),
            "traceback": traceback.format_exc()
        },
        headers=headers
    )

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    print("=== HTTP EXCEPTION HANDLED ===")
    headers = {
        "Access-Control-Allow-Origin": "https://topper-bhai.vercel.app",
        "Access-Control-Allow-Credentials": "true"
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "traceback": ""
        },
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("=== VALIDATION EXCEPTION HANDLED ===")
    headers = {
        "Access-Control-Allow-Origin": "https://topper-bhai.vercel.app",
        "Access-Control-Allow-Credentials": "true"
    }
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": str(exc.errors()),
            "traceback": ""
        },
        headers=headers
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    subjects_router,
    prefix="/api/v1"
)

app.include_router(
    topics_router,
    prefix="/api/v1"
)

app.include_router(
    generate_router,
    prefix="/api/v1"
)

app.include_router(
    chat_router,
    prefix="/api/v1"
)

app.include_router(
    grammar_router,
    prefix="/api/v1"
)

app.include_router(
    video_router,
    prefix="/api/v1"
)

app.include_router(
    scribe_router,
    prefix="/api/v1"
)

app.include_router(
    manga_router,
    prefix="/api/v1"
)

app.include_router(
    community_router,
    prefix="/api/v1"
)

app.include_router(
    study_plan_router,
    prefix="/api/v1"
)