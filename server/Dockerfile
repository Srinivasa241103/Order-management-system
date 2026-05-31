FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell form so ${PORT} expands. Railway sets PORT; locally it falls back to 8000.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}