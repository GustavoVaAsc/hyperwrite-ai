# Backend Development Guide

## Adding a New Endpoint

### 1. Create a Router File

Create a new file in the appropriate directory (e.g., `auth/`, `users/`, or create a new one):

```python
# example/router.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/example", tags=["example"])


class ExampleResponse(BaseModel):
    message: str


@router.get("/", response_model=ExampleResponse)
async def get_example():
    return ExampleResponse(message="Hello World")


@router.post("/", response_model=ExampleResponse)
async def create_example(data: dict):
    return ExampleResponse(message="Created")
```

### 2. Register the Router in main.py

```python
from example.router import router as example_router

app.include_router(example_router)
```

### 3. Rebuild the Container

```bash
cd backend
sudo docker compose up -d --build
```

---

## Rebuilding the Backend

### Full Rebuild (after code or dependency changes)

```bash
cd backend
sudo docker compose up -d --build
```

### Force Clean Rebuild

```bash
cd backend
sudo docker compose down -v --rmi all
sudo docker system prune -af
sudo docker volume prune -f
sudo docker compose up -d --build
```

### Restart Without Rebuilding

```bash
cd backend
sudo docker compose restart backend
```

### View Logs

```bash
sudo docker logs -f hyperwrite-api
```

---

## Database Migrations

### Create a New Migration

```bash
cd backend
python3 -m alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
python3 -m alembic upgrade head
```

### Rollback

```bash
python3 -m alembic downgrade -1
```

### Inside Docker

```bash
sudo docker compose exec backend python3 -m alembic upgrade head
```

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens (min 32 chars)
- `JWT_LIFETIME` - Token lifetime in seconds

---

## Inference Server (LLM)

The backend uses **two separate inference providers** — one for chat completions and one for embeddings. Both are `llama.cpp` servers with CUDA by default, but you can swap providers freely.

### Default: Dual llama.cpp (Docker + CUDA)

The `docker-compose.yml` runs two services:

| Service | Port | Model | Purpose |
|---------|------|-------|---------|
| `inference-embeddings` | 8080 | `nomic-embed-text-v1.5.Q8_0.gguf` | Text embeddings for RAG |
| `inference-chat` | 8081 | `gemma-4-E2B-RotorQuant-Q8_0.gguf` | Chat completions |

**Setup:**
1. Place GGUF model files in `backend/llms/models/`
2. Update the `-m` arguments in `docker-compose.yml` to match your model filenames
3. In `backend/.env`, set:
   ```env
   LLM_BASE_URL=http://host.docker.internal:8081/v1
   LLM_MODEL=your-chat-model
   LLM_EMBEDDING_URL=http://host.docker.internal:8080/v1
   LLM_EMBEDDING_MODEL=nomic-embed-text-v1.5.Q8_0.gguf
   ```

**Run:**
```bash
cd backend
sudo docker compose up -d
```

**View logs:**
```bash
# Embeddings server
docker logs -f inference-embeddings
# Chat server
docker logs -f inference-chat
```

---

### Single Provider (Ollama, LM Studio, etc.)

If using a single inference provider for both chat and embeddings:

```env
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.2
LLM_EMBEDDING_URL=http://localhost:11434/v1
LLM_EMBEDDING_MODEL=nomic-embed-text
```

---

### Ollama

If you prefer Ollama for local development (no GPU required):

1. Install Ollama: [https://ollama.com](https://ollama.com)
2. Pull models:
   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```
3. Start Ollama (runs on port 11434 by default):
   ```bash
   ollama serve
   ```
4. In `backend/.env`:
   ```env
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_MODEL=llama3.2
   LLM_EMBEDDING_URL=http://localhost:11434/v1
   LLM_EMBEDDING_MODEL=nomic-embed-text
   ```

---

### LM Studio

1. Download LM Studio from [https://lmstudio.ai](https://lmstudio.ai)
2. Download models through the UI
3. Start a local server (Server tab → Start server)
4. Default port: `1234`
5. In `backend/.env`:
   ```env
   LLM_BASE_URL=http://localhost:1234/v1
   LLM_MODEL=your-model
   LLM_EMBEDDING_URL=http://localhost:1234/v1
   LLM_EMBEDDING_MODEL=your-embedding-model
   ```

---

### OpenAI (or compatible: Groq, Grok, etc.)

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-real-api-key
LLM_MODEL=gpt-4
LLM_EMBEDDING_URL=https://api.openai.com/v1
LLM_EMBEDDING_MODEL=text-embedding-3-small
```

---

### Provider Comparison

| Provider | GPU | Setup Complexity | Notes |
|----------|-----|------------------|-------|
| **llama.cpp (Docker, dual)** | ✅ CUDA | Medium | Default setup, both services |
| **Ollama** | Optional | Low | Easiest for local dev |
| **LM Studio** | Optional | Low | GUI-based, good for experimentation |
| **OpenAI / Groq** | N/A | Lowest | Cloud, costs money |

---

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BASE_URL` | `http://host.docker.internal:8081/v1` | Chat completions endpoint |
| `LLM_MODEL` | `gemma-4-E2B-RotorQuant-Q8_0` | Chat model identifier |
| `LLM_EMBEDDING_URL` | `http://host.docker.internal:8080/v1` | Embeddings endpoint |
| `LLM_EMBEDDING_MODEL` | `nomic-embed-text-v1.5.Q8_0.gguf` | Embedding model identifier |
| `LLM_API_KEY` | `local-no-key` | API key (use `local-no-key` for local providers) |
| `LLM_TIMEOUT` | `60` | Request timeout in seconds |

---

## Knowledge Base (RAG)

The backend includes a RAG (Retrieval-Augmented Generation) module for document ingestion and context retrieval.

### Models

- **KnowledgeFolder** — User-created folders (e.g., `/master-thesis`, `/microcomputers`)
- **KnowledgeFile** — Uploaded documents with metadata
- **KnowledgeChunk** — Text chunks + embeddings stored as JSONB vectors

### Endpoints

All knowledge endpoints require authentication via `Authorization: Bearer <token>`.

#### List all folders
```bash
curl http://localhost:8000/knowledge/ \
  -H "Authorization: Bearer $TOKEN"
```

#### Create a folder
```bash
curl -X POST http://localhost:8000/knowledge/folder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "master-thesis"}'
```

#### Get folder details
```bash
curl http://localhost:8000/knowledge/folder/{folder_id} \
  -H "Authorization: Bearer $TOKEN"
```

#### Upload a document (extracts text, chunks, generates embeddings)
```bash
curl -X POST http://localhost:8000/knowledge/folder/{folder_id}/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf"
```
Supported formats: `pdf`, `txt`, `md`

#### Delete folder (cascades to files and chunks)
```bash
curl -X DELETE http://localhost:8000/knowledge/folder/{folder_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing Endpoints

### Register User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"username","password":"secret123","display_name":"User Name"}'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=secret123"
```

### Get Current User

```bash
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer <token>"
```