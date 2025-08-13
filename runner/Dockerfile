FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir docker requests

WORKDIR /app
COPY runner.py /app/runner.py

CMD ["python", "-u", "/app/runner.py"]


