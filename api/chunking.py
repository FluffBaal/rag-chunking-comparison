import json
import sys
import os
import time
import traceback
from typing import List, Dict, Any, Tuple
import re

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(__file__))

try:
    import nltk
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import tiktoken
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback imports for basic functionality
    pass

class EnhancedSemanticChunker:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        try:
            self.model = SentenceTransformer(model_name)
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
            
            # Download required NLTK data
            try:
                nltk.data.find('tokenizers/punkt')
            except:
                nltk.download('punkt', quiet=True)
        except Exception as e:
            print(f"Error initializing semantic chunker: {e}")
            self.model = None
            self.tokenizer = None
    
    def chunk(self, text: str, similarity_threshold: float = 0.60, 
              max_tokens: int = 400, min_tokens: int = 50) -> List[Dict[str, Any]]:
        if not self.model:
            # Fallback to simple chunking
            return self._simple_chunk(text, max_tokens)
        
        try:
            # Split into sentences
            sentences = nltk.sent_tokenize(text)
            if not sentences:
                return []
            
            # Get embeddings for all sentences
            embeddings = self.model.encode(sentences)
            
            # Calculate similarity between consecutive sentences
            similarities = []
            for i in range(len(embeddings) - 1):
                sim = cosine_similarity([embeddings[i]], [embeddings[i + 1]])[0][0]
                similarities.append(sim)
            
            # Apply smoothing
            smoothed_similarities = self._smooth_similarities(similarities)
            
            # Find breakpoints
            breakpoints = self._find_breakpoints(smoothed_similarities, similarity_threshold)
            
            # Create chunks
            chunks = []
            start_idx = 0
            
            for breakpoint in breakpoints + [len(sentences)]:
                chunk_sentences = sentences[start_idx:breakpoint]
                chunk_text = ' '.join(chunk_sentences)
                
                # Check token limits
                if self.tokenizer:
                    tokens = len(self.tokenizer.encode(chunk_text))
                    
                    # If chunk is too large, split it
                    if tokens > max_tokens:
                        sub_chunks = self._split_large_chunk(chunk_sentences, max_tokens)
                        chunks.extend(sub_chunks)
                    elif tokens >= min_tokens:
                        chunks.append({
                            'text': chunk_text,
                            'token_count': tokens,
                            'sentence_count': len(chunk_sentences),
                            'start_idx': start_idx,
                            'end_idx': breakpoint
                        })
                else:
                    # Fallback token estimation
                    estimated_tokens = len(chunk_text.split()) * 1.3
                    if estimated_tokens >= min_tokens:
                        chunks.append({
                            'text': chunk_text,
                            'token_count': int(estimated_tokens),
                            'sentence_count': len(chunk_sentences),
                            'start_idx': start_idx,
                            'end_idx': breakpoint
                        })
                
                start_idx = breakpoint
            
            return chunks
            
        except Exception as e:
            print(f"Error in semantic chunking: {e}")
            return self._simple_chunk(text, max_tokens)
    
    def _smooth_similarities(self, similarities: List[float], window_size: int = 3) -> List[float]:
        """Apply moving average smoothing"""
        if len(similarities) < window_size:
            return similarities
        
        smoothed = []
        for i in range(len(similarities)):
            start = max(0, i - window_size // 2)
            end = min(len(similarities), i + window_size // 2 + 1)
            smoothed.append(np.mean(similarities[start:end]))
        
        return smoothed
    
    def _find_breakpoints(self, similarities: List[float], threshold: float) -> List[int]:
        """Find semantic breakpoints based on similarity threshold"""
        breakpoints = []
        for i, sim in enumerate(similarities):
            if sim < threshold:
                breakpoints.append(i + 1)
        return breakpoints
    
    def _split_large_chunk(self, sentences: List[str], max_tokens: int) -> List[Dict[str, Any]]:
        """Split a large chunk into smaller ones"""
        chunks = []
        current_sentences = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = len(self.tokenizer.encode(sentence)) if self.tokenizer else len(sentence.split())
            
            if current_tokens + sentence_tokens > max_tokens and current_sentences:
                chunk_text = ' '.join(current_sentences)
                chunks.append({
                    'text': chunk_text,
                    'token_count': current_tokens,
                    'sentence_count': len(current_sentences)
                })
                current_sentences = [sentence]
                current_tokens = sentence_tokens
            else:
                current_sentences.append(sentence)
                current_tokens += sentence_tokens
        
        if current_sentences:
            chunk_text = ' '.join(current_sentences)
            chunks.append({
                'text': chunk_text,
                'token_count': current_tokens,
                'sentence_count': len(current_sentences)
            })
        
        return chunks
    
    def _simple_chunk(self, text: str, max_tokens: int) -> List[Dict[str, Any]]:
        """Simple fallback chunking"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), max_tokens):
            chunk_words = words[i:i + max_tokens]
            chunk_text = ' '.join(chunk_words)
            chunks.append({
                'text': chunk_text,
                'token_count': len(chunk_words),
                'sentence_count': chunk_text.count('.') + chunk_text.count('!') + chunk_text.count('?')
            })
        
        return chunks

class NaiveChunker:
    def __init__(self):
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except:
            self.tokenizer = None
    
    def chunk(self, text: str, chunk_size: int = 400, overlap: int = 50) -> List[Dict[str, Any]]:
        if self.tokenizer:
            return self._token_based_chunk(text, chunk_size, overlap)
        else:
            return self._word_based_chunk(text, chunk_size, overlap)
    
    def _token_based_chunk(self, text: str, chunk_size: int, overlap: int) -> List[Dict[str, Any]]:
        """Token-based chunking with overlap"""
        tokens = self.tokenizer.encode(text)
        chunks = []
        
        i = 0
        while i < len(tokens):
            chunk_tokens = tokens[i:i + chunk_size]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            
            chunks.append({
                'text': chunk_text,
                'token_count': len(chunk_tokens),
                'start_token': i,
                'end_token': min(i + chunk_size, len(tokens))
            })
            
            i += chunk_size - overlap
        
        return chunks
    
    def _word_based_chunk(self, text: str, chunk_size: int, overlap: int) -> List[Dict[str, Any]]:
        """Word-based chunking fallback"""
        words = text.split()
        chunks = []
        
        # Approximate tokens as words * 1.3
        word_chunk_size = int(chunk_size / 1.3)
        word_overlap = int(overlap / 1.3)
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i + word_chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            chunks.append({
                'text': chunk_text,
                'token_count': int(len(chunk_words) * 1.3),
                'word_count': len(chunk_words)
            })
            
            i += word_chunk_size - word_overlap
        
        return chunks

class DocumentProcessor:
    def __init__(self):
        self.semantic_chunker = EnhancedSemanticChunker()
        self.naive_chunker = NaiveChunker()
    
    def process_document(self, document: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Process document with both chunking strategies"""
        
        start_time = time.time()
        
        # Extract configuration
        similarity_threshold = config.get('similarity_threshold', 0.60)
        max_tokens = config.get('max_tokens', 400)
        min_tokens = config.get('min_tokens', 50)
        chunk_size = config.get('chunk_size', 400)
        overlap = config.get('overlap', 50)
        
        # Naive chunking
        naive_chunks = self.naive_chunker.chunk(
            document['content'],
            chunk_size=chunk_size,
            overlap=overlap
        )
        
        # Semantic chunking
        semantic_chunks = self.semantic_chunker.chunk(
            document['content'],
            similarity_threshold=similarity_threshold,
            max_tokens=max_tokens,
            min_tokens=min_tokens
        )
        
        processing_time = time.time() - start_time
        
        return {
            'naive': {
                'chunks': naive_chunks,
                'total_chunks': len(naive_chunks),
                'avg_chunk_size': np.mean([c['token_count'] for c in naive_chunks]) if naive_chunks else 0
            },
            'semantic': {
                'chunks': semantic_chunks,
                'total_chunks': len(semantic_chunks),
                'avg_chunk_size': np.mean([c['token_count'] for c in semantic_chunks]) if semantic_chunks else 0
            },
            'metadata': {
                'document_id': document.get('id', 'unknown'),
                'config': config,
                'processing_time': processing_time,
                'timestamp': time.time()
            }
        }

def get_sample_document() -> Dict[str, Any]:
    """Return comprehensive sample document for testing"""
    return {
        'id': 'ml_fundamentals_doc',
        'title': 'Machine Learning Fundamentals',
        'content': """
Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data. These algorithms build mathematical models based on training data to make predictions or decisions without being explicitly programmed for every scenario.

The field of machine learning has evolved significantly since its inception in the 1950s. Early pioneers like Arthur Samuel and Frank Rosenblatt laid the groundwork for what would become one of the most transformative technologies of the 21st century. Today, machine learning powers everything from search engines to autonomous vehicles.

Supervised learning is one of the main types of machine learning. In supervised learning, algorithms learn from labeled training data, where both input features and correct outputs are provided. The goal is to learn a mapping from inputs to outputs that can generalize to new, unseen data. Common supervised learning tasks include classification, where the output is a category, and regression, where the output is a continuous value.

Classification algorithms are designed to predict discrete categories or classes. For example, an email spam filter uses classification to determine whether an incoming email is spam or legitimate. Popular classification algorithms include logistic regression, decision trees, random forests, and support vector machines. Each algorithm has its strengths and is suitable for different types of problems.

Regression algorithms, on the other hand, predict continuous numerical values. A classic example is predicting house prices based on features like location, size, and age. Linear regression is the simplest form, but more complex algorithms like polynomial regression and neural networks can capture non-linear relationships in the data.

Unsupervised learning deals with unlabeled data, where the algorithm tries to find hidden patterns or structures without any guidance about what the output should be. This type of learning is particularly useful for exploratory data analysis and discovering insights that might not be immediately obvious.

Clustering is a common unsupervised learning task that groups similar data points together. K-means clustering is one of the most popular algorithms, which partitions data into k clusters based on similarity. Hierarchical clustering creates a tree-like structure of clusters, allowing for analysis at different levels of granularity.

Dimensionality reduction is another important unsupervised learning technique. As datasets grow larger and more complex, they often contain many features that may be redundant or irrelevant. Principal Component Analysis (PCA) is a widely used technique that reduces the number of dimensions while preserving the most important information in the data.

Deep learning is a specialized subset of machine learning that uses neural networks with multiple layers, hence the term "deep." These deep neural networks can automatically learn hierarchical representations of data, making them particularly effective for tasks like image recognition, natural language processing, and speech recognition.

Convolutional Neural Networks (CNNs) are specifically designed for processing grid-like data such as images. They use convolutional layers that apply filters to detect features like edges, textures, and patterns. CNNs have revolutionized computer vision and are the backbone of many modern image recognition systems.

Recurrent Neural Networks (RNNs) are designed to work with sequential data, such as time series or natural language. Unlike traditional neural networks, RNNs have memory that allows them to use information from previous inputs when processing current inputs. Long Short-Term Memory (LSTM) networks are a special type of RNN that can learn long-term dependencies.

The training process in machine learning involves several key concepts. The loss function measures how well the model's predictions match the actual outcomes. Optimization algorithms like gradient descent are used to minimize this loss by adjusting the model's parameters. Regularization techniques help prevent overfitting, where a model performs well on training data but poorly on new data.

Cross-validation is a crucial technique for evaluating model performance. It involves splitting the data into multiple folds and training the model on some folds while testing on others. This provides a more robust estimate of how the model will perform on unseen data and helps in selecting the best model parameters.

Feature engineering is often considered an art in machine learning. It involves selecting, modifying, or creating new features from raw data to improve model performance. Good features can make the difference between a mediocre model and an excellent one. Domain expertise is often crucial in this process.

The bias-variance tradeoff is a fundamental concept in machine learning. Bias refers to errors due to overly simplistic assumptions, while variance refers to errors due to sensitivity to small fluctuations in the training data. The goal is to find the right balance that minimizes total error.

Ensemble methods combine multiple models to create a stronger predictor than any individual model. Random forests combine many decision trees, while boosting algorithms like AdaBoost and Gradient Boosting sequentially build models that correct the errors of previous ones. These methods often achieve superior performance in practice.

Model interpretability has become increasingly important as machine learning is applied to critical decisions in healthcare, finance, and criminal justice. Techniques like LIME (Local Interpretable Model-agnostic Explanations) and SHAP (SHapley Additive exPlanations) help explain individual predictions, making models more transparent and trustworthy.

The future of machine learning continues to evolve with advances in quantum computing, federated learning, and automated machine learning (AutoML). As computational power increases and new algorithms are developed, we can expect machine learning to become even more powerful and accessible to a broader range of applications and users.
        """
    }

def extract_api_key(headers):
    """Extract API key from Authorization header"""
    auth_header = headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    return None

# Async handler for compatibility with the dev server
async def handler(request, response):
    """Async handler for the dev server"""
    try:
        # Get request data
        request_data = await request.json()
        config = request_data.get('config', {})
        
        # Extract API key if provided
        api_key = request.headers.get('x-api-key')
        if api_key:
            os.environ['OPENAI_API_KEY'] = api_key
        
        # Initialize processor
        processor = DocumentProcessor()
        
        # Get document - either from request or use sample
        document_data = request_data.get('document')
        if document_data and document_data.get('content'):
            # Use uploaded document
            doc = {
                'id': 'user_document',
                'title': document_data.get('title', 'Uploaded Document'),
                'content': document_data.get('content'),
                'type': document_data.get('type', 'text/plain')
            }
        else:
            # Use sample document
            doc = get_sample_document()
        
        # Process with both strategies
        results = processor.process_document(doc, config)
        
        # Prepare response
        response_data = {
            'success': True,
            'results': results,
            'config': config,
            'document_info': {
                'title': doc['title'],
                'length': len(doc['content']),
                'word_count': len(doc['content'].split()),
                'content': doc['content']  # Include content for evaluation
            }
        }
        
        return response.json(response_data)
        
    except Exception as e:
        print(f"Error in chunking handler: {e}")
        traceback.print_exc()
        
        error_response = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        
        return response.json(error_response, status=500)

# Remove the class-based handler since we're using the async handler with Flask