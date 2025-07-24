# RAG Chunking Comparison Tool

A comprehensive Next.js application for evaluating and comparing text chunking strategies using RAGAS (Retrieval-Augmented Generation Assessment) metrics. This tool provides deep insights into how different chunking approaches affect RAG system performance.

## Overview

This application implements a complete pipeline for comparing Naive (fixed-size) and Semantic (meaning-based) chunking strategies. It evaluates both approaches using industry-standard RAGAS metrics and provides statistical analysis to help users make informed decisions about their RAG implementations.

## Key Features

### 📄 Document Processing
- **Multi-format Support**: Upload PDF, TXT, or Markdown files
- **Client-side PDF Extraction**: Uses WebPDFLoader for privacy-preserving PDF processing
- **Drag-and-Drop Interface**: Intuitive file upload with visual feedback
- **Text Statistics**: Real-time character and word count display

### 🔀 Chunking Strategies

#### Naive Chunking
- Fixed-size token-based chunks (default: 400 tokens)
- Configurable overlap (default: 50 tokens)
- Smart boundary detection (prefers sentence and word boundaries)
- Uses GPT tokenizer for accurate token counting

#### Semantic Chunking
- Groups semantically related sentences using embeddings
- Configurable similarity threshold (default: 0.7)
- Respects min/max token limits (75-400 tokens)
- Falls back to sentence-based chunking without API key

### 📊 Evaluation Metrics (RAGAS)
- **Faithfulness**: How well answers are grounded in retrieved context
- **Answer Relevancy**: Relevance of answers to questions
- **Context Precision**: Fraction of retrieved chunks that are relevant
- **Context Recall**: Fraction of expected context that was retrieved
- **Answer Correctness**: Similarity to ground truth answers

### 🔍 Retrieval Methods
1. **Naive Retrieval**: Simple keyword matching
2. **TF-IDF**: Term frequency-inverse document frequency
3. **Hybrid**: Combines TF-IDF with keyword matching
4. **Embedding-based**: Semantic search using OpenAI embeddings
5. **Hybrid-Embedding**: Best of both embedding and TF-IDF approaches

### 📈 Visualizations & Analysis
- **Interactive Charts**: Bar and radar charts for metric comparison
- **Statistical Analysis**: T-tests, effect sizes, and confidence intervals
- **Chunk Visualization**: Side-by-side comparison with detailed statistics
- **Test Validation**: View generated questions and retrieved contexts

### 💾 Advanced Features
- **Browser Caching**: IndexedDB-based caching with 1-hour expiry
- **Embedding Storage**: Pre-computed embeddings for better performance
- **Progressive Enhancement**: Full functionality with API key, demo mode without
- **Real-time Configuration**: Dynamic model selection and parameter adjustment

## Architecture

### Frontend Components
- **ComparisonDashboard**: Main orchestrator managing the entire workflow
- **ApiKeyInput**: Secure API key management with validation
- **DocumentUpload**: File handling with format validation
- **ConfigurationPanel**: Parameter configuration with presets
- **ChunkVisualizer**: Side-by-side chunk comparison
- **MetricsChart**: RAGAS metrics visualization
- **StatisticalSummary**: Statistical test results and recommendations
- **TestValidation**: Question-answer validation interface

### API Routes
- `/api/chunking`: Processes documents with both chunking strategies
- `/api/evaluation`: Evaluates chunks using RAGAS metrics
- `/api/analysis`: Performs statistical comparison
- `/api/models`: Lists available OpenAI models
- `/api/test-api-key`: Validates OpenAI API keys

### Core Libraries
- **Chunking**: Custom implementations with token counting
- **Evaluation**: RAGAS metric calculation with multiple retrieval methods
- **Analysis**: Statistical tests using simple-statistics
- **Caching**: IndexedDB wrapper for persistent storage
- **PDF Processing**: Client-side extraction with PDF.js

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- (Optional) OpenAI API key for full functionality

### Installation

```bash
# Clone the repository
git clone https://github.com/FluffBaal/rag-chunking-comparison.git
cd rag-chunking-comparison

# Install dependencies
npm install

# Run development server (port 4042)
npm run dev
```

### Development Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Start production server
npm run start
```

## Usage Guide

### Basic Workflow
1. **Provide API Key** (optional): Enter your OpenAI API key for enhanced features
2. **Upload Document**: Drag and drop or select a PDF/TXT/MD file
3. **Configure Parameters**: 
   - Choose a preset (Focused, Balanced, Contextual)
   - Or manually adjust chunk size, overlap, and similarity threshold
4. **Run Comparison**: Click "Run Comparison" to process
5. **Analyze Results**: 
   - Overview tab: Summary and recommendations
   - Metrics tab: RAGAS scores visualization
   - Chunks tab: Side-by-side chunk comparison
   - Statistics tab: Statistical significance tests
   - Validation tab: Test questions and answers

### Configuration Options

#### Naive Chunking
- **Chunk Size**: Target tokens per chunk (200-800)
- **Overlap**: Overlapping tokens between chunks (0-200)

#### Semantic Chunking
- **Similarity Threshold**: Semantic similarity cutoff (0.5-0.9)
- **Min Tokens**: Minimum chunk size (50-200)
- **Max Tokens**: Maximum chunk size (200-800)

### API Key Features
With an OpenAI API key, you get:
- Embedding-based semantic chunking
- Advanced retrieval using embeddings
- LLM-powered question generation
- Comprehensive RAGAS evaluation
- Dynamic model selection

Without an API key:
- Sentence-based semantic chunking
- TF-IDF and keyword retrieval
- Simple question generation
- Context-based metrics only
- Demo mode with simulated results

## Deployment

### Vercel Deployment (Recommended)

```bash
# Deploy to Vercel
vercel

# Force deploy with cache clearing
vercel --force

# Deploy to production
vercel --prod
```

### Environment Variables
- `CACHE_VERSION`: Cache versioning for Vercel deployments
- No other environment variables required (API key stored client-side)

### Build Configuration
The project includes:
- TypeScript with strict mode
- Turbopack for faster development
- Custom webpack configuration for PDF.js
- Automatic cache busting on deployment

## Technical Details

### Performance Optimizations
- Client-side PDF processing (no server upload)
- Batch embedding computation
- IndexedDB caching for results
- Lazy loading of heavy dependencies
- Efficient token counting with fallbacks

### Security Features
- API keys stored in browser localStorage only
- No server-side API key storage
- Client-side PDF processing for privacy
- Type-safe implementations throughout

### Browser Compatibility
- Modern browsers with ES2017+ support
- IndexedDB for caching (with fallbacks)
- WebWorker support for PDF.js
- Responsive design for all screen sizes

## Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain the existing code style
- Add tests for new features
- Update documentation as needed

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4 with App Router
- **UI Library**: React 19
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4 with custom animations
- **Components**: Radix UI primitives

### Data Processing
- **NLP**: natural.js for TF-IDF
- **Tokenization**: gpt-tokenizer for accurate counts
- **Statistics**: simple-statistics for analysis
- **PDF**: PDF.js via LangChain WebPDFLoader

### Visualization
- **Charts**: Recharts 2.12
- **Icons**: Lucide React
- **Animations**: Tailwind CSS animations

### Development Tools
- **Build**: Turbopack (development)
- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript strict mode
- **Package Manager**: npm/yarn

## License

MIT License - feel free to use this tool for your RAG implementations!

## Acknowledgments

This tool implements the RAGAS evaluation framework and leverages excellent open-source libraries including Next.js, Radix UI, and LangChain.js.