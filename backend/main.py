from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Hyperwrite AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=os.getenv("CORS_CREDENTIALS", "true").lower() == "true",
    allow_methods=os.getenv("CORS_METHODS", "*").split(","),
    allow_headers=os.getenv("CORS_HEADERS", "*").split(","),
)

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
