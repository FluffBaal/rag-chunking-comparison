# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RAG (Retrieval-Augmented Generation) chunking comparison application that evaluates different text chunking strategies using RAGAS metrics. It consists of a Next.js frontend with Python serverless backend functions deployed on Vercel.

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

# Run the Python development server
uv run python dev-server.py
# or
uv run ./dev-server.py
```

2. **Terminal 2 - Next.js Frontend:**
```bash
# Run the Next.js development server
npm run dev
```

The Python server runs on port 8000 and handles the API endpoints locally.
The Next.js server runs on port 4042 and proxies API requests to the Python server.

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

### Core Components Flow

```
ComparisonDashboard (orchestrator)
├── ApiKeyInput (optional OpenAI configuration)
├── ConfigurationPanel (chunking parameters)
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