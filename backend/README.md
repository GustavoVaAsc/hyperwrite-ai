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