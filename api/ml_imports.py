"""
Centralized imports for ML/AI dependencies with graceful fallbacks
"""

import warnings

# Try to import heavy ML dependencies
try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    warnings.warn("PyTorch not available. Some features will be limited.")

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    warnings.warn("Sentence Transformers not available. Using fallback for embeddings.")

try:
    import transformers
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    warnings.warn("Transformers not available. Some NLP features will be limited.")

try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False
    warnings.warn("FAISS not available. Using numpy for similarity search.")

try:
    import chromadb
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False
    warnings.warn("ChromaDB not available. Using in-memory vector store.")

try:
    from langchain import LLMChain
    from langchain_openai import ChatOpenAI
    from langchain_community import embeddings
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    warnings.warn("LangChain not available. Using direct OpenAI API.")

try:
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    )
    HAS_RAGAS = True
except ImportError:
    HAS_RAGAS = False
    warnings.warn("RAGAS not available. Using simulated metrics.")

# Helper function to check if we can use advanced features
def check_ml_dependencies():
    return {
        'torch': HAS_TORCH,
        'sentence_transformers': HAS_SENTENCE_TRANSFORMERS,
        'transformers': HAS_TRANSFORMERS,
        'faiss': HAS_FAISS,
        'chromadb': HAS_CHROMADB,
        'langchain': HAS_LANGCHAIN,
        'ragas': HAS_RAGAS
    }