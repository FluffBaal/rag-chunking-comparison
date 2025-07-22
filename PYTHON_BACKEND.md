# Python Backend (Optional)

This document describes how to deploy the Python backend separately for full RAG chunking comparison functionality.

## Overview

The Python backend provides:
- Real text chunking with Semantic and Naive strategies
- RAGAS metric evaluation using OpenAI API
- Statistical analysis and comparison
- Support for large language models and embeddings

## Deployment Options

### 1. Railway
```bash
# Create a new Railway project
railway login
railway init

# Deploy
railway up
```

### 2. Render
Create a `render.yaml`:
```yaml
services:
  - type: web
    name: rag-chunking-api
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "gunicorn app:app"
```

### 3. AWS Lambda with Containers
Use Docker to package the large dependencies:
```dockerfile
FROM public.ecr.aws/lambda/python:3.11
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["lambda_function.handler"]
```

### 4. Google Cloud Run
```bash
gcloud run deploy rag-chunking-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Required Files

To deploy the Python backend, you'll need:
1. The `api/` directory with Python handlers
2. `requirements.txt` or `pyproject.toml`
3. A web server entry point (Flask, FastAPI, etc.)

## Environment Variables

- `OPENAI_API_KEY`: Optional, for real evaluations
- `PORT`: Server port (default: 8001)

## API Endpoints

Once deployed, update your Next.js API routes to point to your Python backend URL instead of returning demo data.