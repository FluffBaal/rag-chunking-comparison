# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RAG (Retrieval-Augmented Generation) chunking comparison application that evaluates different text chunking strategies using RAGAS metrics. It consists of a Next.js frontend with Python serverless backend functions that can be deployed on Vercel or run locally.

## Development Commands

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Development server with Turbo (runs on port 4042)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Type checking
npm run type-check
```

### Local Development Setup
For local development, you need to run both the Next.js frontend and Python API server:

1. **Terminal 1 - Python API Server:**
```bash
# Make sure Python dependencies are installed
uv sync

# Run the Python development server (Flask-based)
uv run python run-dev-server.py 8001
```

2. **Terminal 2 - Next.js Frontend:**
```bash
# Run the Next.js development server
npm run dev
```

The Python server runs on port 8001 and handles the API endpoints locally.
The Next.js server runs on port 4042 and proxies API requests to the Python server in development mode.

### Python Backend (uv)
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync

# Activate virtual environment (optional, uv handles this automatically)
source .venv/bin/activate  # On Unix/macOS
# or
.venv\Scripts\activate  # On Windows

# Install additional development dependencies
uv sync --all-extras

# Add a new dependency
uv add <package-name>

# Add a development dependency
uv add --dev <package-name>

# Test API key (if using OpenAI features)
uv run python api/test-api-key.py

# Run any Python script with uv
uv run python <script.py>
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with TypeScript, React 19, Tailwind CSS
- **Backend**: Python serverless functions on Vercel
- **UI Components**: Radix UI primitives with custom styling
- **Data Visualization**: Recharts for metrics charts
- **ML/NLP**: Sentence Transformers, NLTK, OpenAI API (optional)
- **Python Package Management**: uv (fast Python package installer and resolver)

### Key Architectural Patterns

1. **Hybrid Architecture**: Next.js frontend communicates with Python backend via REST APIs
2. **Serverless Functions**: Each Python API endpoint runs as an independent Vercel function with specific resource allocations
3. **Progressive Enhancement**: Application works without OpenAI API key using simulation mode

### API Endpoints

1. **`/api/chunking`** (Python)
   - Implements two chunking strategies: Semantic and Naive
   - Returns chunks for comparison
   - Runtime: 60s timeout, 1GB memory

2. **`/api/evaluation`** (Python)
   - Evaluates chunks using RAGAS metrics
   - Simulates RAG pipeline (retrieval + generation)
   - Runtime: 120s timeout, 2GB memory

3. **`/api/analysis`** (Python)
   - Statistical comparison of strategies
   - Provides recommendations and significance testing
   - Runtime: 30s timeout, 512MB memory

4. **`/api/models`** (TypeScript/Next.js)
   - Fetches available OpenAI models when API key is provided
   - Filters for text generation models only
   - Returns sorted list with GPT-4 models prioritized

5. **`/api/test-api-key`** (TypeScript/Next.js)
   - Validates OpenAI API key
   - Used by ApiKeyInput component

### Core Components Flow

```
ComparisonDashboard (orchestrator)
├── ApiKeyInput (optional OpenAI configuration)
│   └── Triggers model fetching via /api/models
├── DocumentUpload (file upload with drag & drop)
│   └── PDF files processed client-side using WebPDFLoader
├── ConfigurationPanel (chunking parameters)
│   └── Dynamic model selection based on API key
├── Process Flow:
│   1. POST /api/chunking → Get chunks
│   2. POST /api/evaluation → Get RAGAS metrics
│   3. POST /api/analysis → Get statistical analysis
└── Display Components:
    ├── MetricsChart (RAGAS visualization)
    ├── ChunkVisualizer (side-by-side chunks)
    └── StatisticalSummary (analysis results)
```

### Chunking Strategies

1. **Semantic Chunking**: Uses sentence embeddings and similarity thresholds
2. **Naive Chunking**: Fixed-size token-based chunks with overlap

### Evaluation Metrics

- **RAGAS Metrics**: Faithfulness, Answer Relevancy, Context Precision/Recall, Answer Correctness
- **Chunking Quality**: Coherence, Length Statistics, Coverage
- **Statistical Analysis**: T-tests, Effect Sizes, Confidence Intervals

## Important Implementation Details

### Python API Configuration
- Each API function has specific memory/timeout in `vercel.json`
- Functions use error boundaries and fallback mechanisms
- API key passed via `x-api-key` header when available

### Frontend State Management
- Uses React hooks and local storage for persistence
- Component-level state for UI interactions
- Server-side data fetching for initial load

### Type Safety
- TypeScript interfaces define all data structures
- Zod schemas for runtime validation where needed
- Consistent error handling patterns

### Performance Considerations
- Turbo mode enabled for faster development builds
- Serverless functions optimized for cold starts
- Client-side caching of expensive computations

## Critical Implementation Notes

### Python API Handler Structure
All Python API handlers use async functions for Flask compatibility:
```python
async def handler(request, response):
    """Async handler for the dev server"""
    try:
        request_data = await request.json()
        # Process data...
        return response.json(response_data)
    except Exception as e:
        return response.json(error_response, status=500)
```

**Important**: Do NOT use BaseHTTPRequestHandler class-based handlers as they conflict with the Flask dev server.

### API Headers
- Frontend sends API key via `x-api-key` header (not Authorization)
- Python handlers access it via `request.headers.get('x-api-key')`

### Data Flow Between APIs
1. Chunking API returns: `{results: {naive: {...}, semantic: {...}}, ...}`
2. Evaluation API expects: `{results: <chunking_results>, config: {...}}`
3. Analysis API expects: `{results: <evaluation_results>}`

### JSON Serialization
When returning numpy/scipy values in Python APIs, always convert to Python types:
```python
'significant': bool(p_value < 0.05),  # Convert numpy bool
'effect_size': float(cohens_d),        # Convert numpy float
'has_scipy': bool(analyzer.has_scipy)  # Ensure boolean
```

### Document Upload Feature
- Supports PDF, TXT, and MD files
- PDF processing uses client-side WebPDFLoader from LangChain.js
- Max file size: 4MB (configurable)
- No server-side dependencies for PDF extraction

### Development Server Notes
- The `run-dev-server.py` creates Flask endpoints that proxy to the Python handlers
- Uses MockRequest/MockResponse classes to adapt between Flask and async handlers
- Auto-reloads on file changes in development

### Common Issues and Solutions
1. **"BaseRequestHandler.__init__() missing 1 required positional argument"**: Remove class-based handlers
2. **"Object of type bool is not JSON serializable"**: Convert numpy booleans to Python bools
3. **Evaluation expects List[str] but gets List[dict]**: Extract text from chunk objects: `[chunk['text'] for chunk in chunks]`