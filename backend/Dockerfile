FROM python:3.12-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV ALEMBIC_CONFIG=/app/alembic.ini

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

ENTRYPOINT ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]
