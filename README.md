# RAG Chunking Comparison

A Next.js application for comparing different text chunking strategies using RAGAS metrics. This tool helps evaluate and visualize the performance of Naive vs Semantic chunking approaches for Retrieval-Augmented Generation (RAG) systems.

## Features

- 📄 **PDF Upload**: Client-side PDF text extraction using WebPDFLoader
- 🔀 **Chunking Strategies**: Compare Naive and Semantic chunking approaches
- 📊 **RAGAS Metrics**: Evaluate chunks using industry-standard metrics
- 📈 **Visualizations**: Interactive charts and side-by-side comparisons
- 🔑 **OpenAI Integration**: Optional API key for enhanced functionality
- 🎯 **Demo Mode**: Works without backend for demonstration purposes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/FluffBaal/rag-chunking-comparison.git
cd rag-chunking-comparison

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:4042](http://localhost:4042) to see the application.

## Deployment

### Vercel (Recommended)

This application is optimized for deployment on Vercel:

```bash
# Deploy to Vercel
vercel

# Force deploy (clears cache)
vercel --force
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Usage

1. **Upload a Document**: Drag and drop or select a PDF, TXT, or MD file
2. **Configure Parameters**: Adjust chunk size, overlap, and other settings
3. **Run Comparison**: Click "Run Comparison" to see results
4. **View Results**: Explore metrics, visualizations, and chunk comparisons

## API Endpoints

The application includes demo API endpoints that return sample data:

- `/api/chunking` - Returns demo chunking results
- `/api/evaluation` - Returns demo RAGAS metrics
- `/api/analysis` - Returns demo statistical analysis

For full functionality with real processing, see [PYTHON_BACKEND.md](./PYTHON_BACKEND.md).

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Charts**: Recharts
- **PDF Processing**: LangChain.js WebPDFLoader
- **API**: OpenAI (optional)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT