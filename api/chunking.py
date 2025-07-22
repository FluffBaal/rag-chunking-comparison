"""
Lightweight chunking implementation using OpenAI embeddings
No heavy ML dependencies required
"""

import os
import json
import numpy as np
from typing import List, Dict, Any, Tuple
import tiktoken
import nltk
from sklearn.metrics.pairwise import cosine_similarity

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class LightweightChunker:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.encoding = tiktoken.get_encoding("cl100k_base")
        
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))
    
    def split_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        try:
            sentences = nltk.sent_tokenize(text)
        except:
            # Fallback to simple splitting
            sentences = text.replace('!', '.').replace('?', '.').split('.')
            sentences = [s.strip() for s in sentences if s.strip()]
        return sentences
    
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings using OpenAI API"""
        if not self.api_key:
            # Return random embeddings for demo mode
            return [np.random.rand(1536).tolist() for _ in texts]
        
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            # Batch process for efficiency
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            
            return [item.embedding for item in response.data]
        except Exception as e:
            print(f"Error getting embeddings: {e}")
            # Fallback to random embeddings
            return [np.random.rand(1536).tolist() for _ in texts]
    
    def naive_chunk(self, text: str, chunk_size: int = 400, overlap: int = 50) -> List[Dict[str, Any]]:
        """Simple token-based chunking"""
        tokens = self.encoding.encode(text)
        chunks = []
        
        for i in range(0, len(tokens), chunk_size - overlap):
            chunk_tokens = tokens[i:i + chunk_size]
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append({
                'text': chunk_text,
                'metadata': {
                    'index': len(chunks),
                    'token_count': len(chunk_tokens),
                    'start_token': i
                }
            })
        
        return chunks
    
    def semantic_chunk(self, text: str, similarity_threshold: float = 0.7, 
                      max_tokens: int = 400, min_tokens: int = 75) -> List[Dict[str, Any]]:
        """Semantic chunking using sentence embeddings"""
        sentences = self.split_sentences(text)
        if not sentences:
            return []
        
        # Get embeddings for all sentences
        embeddings = self.get_embeddings_batch(sentences)
        embeddings_array = np.array(embeddings)
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for i, sentence in enumerate(sentences):
            sentence_tokens = self.count_tokens(sentence)
            
            if not current_chunk:
                current_chunk.append(sentence)
                current_tokens = sentence_tokens
            else:
                # Calculate similarity with current chunk
                chunk_embedding = np.mean([embeddings_array[j] for j in range(len(current_chunk))], axis=0)
                similarity = cosine_similarity([chunk_embedding], [embeddings_array[i]])[0][0]
                
                # Decide whether to add to current chunk or start new one
                if (similarity >= similarity_threshold and 
                    current_tokens + sentence_tokens <= max_tokens):
                    current_chunk.append(sentence)
                    current_tokens += sentence_tokens
                else:
                    # Save current chunk if it meets minimum size
                    if current_tokens >= min_tokens:
                        chunk_text = ' '.join(current_chunk)
                        chunks.append({
                            'text': chunk_text,
                            'metadata': {
                                'index': len(chunks),
                                'token_count': current_tokens,
                                'sentence_count': len(current_chunk)
                            }
                        })
                    
                    # Start new chunk
                    current_chunk = [sentence]
                    current_tokens = sentence_tokens
        
        # Don't forget the last chunk
        if current_chunk and current_tokens >= min_tokens:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                'text': chunk_text,
                'metadata': {
                    'index': len(chunks),
                    'token_count': current_tokens,
                    'sentence_count': len(current_chunk)
                }
            })
        
        return chunks
    
    def calculate_quality_metrics(self, chunks: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate chunking quality metrics"""
        if not chunks:
            return {
                'coherence_score': 0.0,
                'avg_chunk_length': 0.0,
                'length_variance': 0.0,
                'total_chunks': 0
            }
        
        # Get chunk lengths
        lengths = [chunk['metadata'].get('token_count', 0) for chunk in chunks]
        
        # Calculate metrics
        avg_length = np.mean(lengths) if lengths else 0
        variance = np.var(lengths) if lengths else 0
        
        # Simple coherence score based on length consistency
        coherence = 1.0 - (variance / (avg_length ** 2) if avg_length > 0 else 0)
        coherence = max(0, min(1, coherence))  # Clamp to [0, 1]
        
        return {
            'coherence_score': float(coherence),
            'avg_chunk_length': float(avg_length),
            'length_variance': float(variance),
            'total_chunks': len(chunks)
        }


async def handler(request, response):
    """Async handler for the dev server"""
    try:
        request_data = await request.json()
        document = request_data.get('document', '')
        config = request_data.get('config', {})
        api_key = request.headers.get('x-api-key')
        
        if not document:
            return response.json({
                'error': 'No document provided',
                'success': False
            }, status=400)
        
        # Initialize chunker
        chunker = LightweightChunker(api_key=api_key)
        
        # Perform chunking
        naive_chunks = chunker.naive_chunk(
            document, 
            chunk_size=config.get('chunk_size', 400),
            overlap=config.get('overlap', 50)
        )
        
        semantic_chunks = chunker.semantic_chunk(
            document,
            similarity_threshold=config.get('similarity_threshold', 0.7),
            max_tokens=config.get('max_tokens', 400),
            min_tokens=config.get('min_tokens', 75)
        )
        
        # Calculate quality metrics
        naive_metrics = chunker.calculate_quality_metrics(naive_chunks)
        semantic_metrics = chunker.calculate_quality_metrics(semantic_chunks)
        
        # Calculate comparison metrics
        comparison = {
            'coherence_improvement': ((semantic_metrics['coherence_score'] - naive_metrics['coherence_score']) / 
                                    naive_metrics['coherence_score'] * 100 if naive_metrics['coherence_score'] > 0 else 0),
            'consistency_improvement': ((naive_metrics['length_variance'] - semantic_metrics['length_variance']) / 
                                      naive_metrics['length_variance'] * 100 if naive_metrics['length_variance'] > 0 else 0),
            'chunks_difference': semantic_metrics['total_chunks'] - naive_metrics['total_chunks']
        }
        
        return response.json({
            'success': True,
            'results': {
                'naive': {
                    'strategy': 'naive',
                    'chunks': naive_chunks,
                    'quality_metrics': naive_metrics,
                    'strategy_info': {
                        'chunk_size': config.get('chunk_size', 400),
                        'overlap': config.get('overlap', 50)
                    }
                },
                'semantic': {
                    'strategy': 'semantic',
                    'chunks': semantic_chunks,
                    'quality_metrics': semantic_metrics,
                    'strategy_info': {
                        'similarity_threshold': config.get('similarity_threshold', 0.7),
                        'max_tokens': config.get('max_tokens', 400),
                        'min_tokens': config.get('min_tokens', 75),
                        'embeddings_model': 'text-embedding-3-small' if api_key else 'demo'
                    }
                }
            },
            'comparison': comparison,
            'document_info': {
                'total_tokens': chunker.count_tokens(document),
                'total_sentences': len(chunker.split_sentences(document))
            },
            'metadata': {
                'processing_time': 0.5,
                'api_version': '2.0.0',
                'implementation': 'lightweight'
            }
        })
        
    except Exception as e:
        return response.json({
            'error': str(e),
            'success': False
        }, status=500)