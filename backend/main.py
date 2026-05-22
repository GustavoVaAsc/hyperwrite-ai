from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

from auth.router import auth_router, users_router

load_dotenv()

app = FastAPI(title="Hyperwrite AI API", version="0.1.0")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=os.getenv("CORS_CREDENTIALS", "true").lower() == "true",
    allow_methods=os.getenv("CORS_METHODS", "*").split(","),
    allow_headers=os.getenv("CORS_HEADERS", "*").split(","),
)

app.include_router(auth_router)
app.include_router(users_router)

@app.get("/")
def read_root():
    return {
        "message":"Hello World!"
    }

@app.get("/api/health")
def health_check():
    return {
        "status":"ok",
        "db":"pending"
    }
