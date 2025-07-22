import json
import sys
import os
import time
import traceback
import random
from typing import List, Dict, Any, Tuple, Optional
import math

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(__file__))

# Import test generators
try:
    from test_generator import generate_domain_specific_test_set
except ImportError:
    print("Warning: Could not import test_generator module")
    generate_domain_specific_test_set = None

try:
    from advanced_test_generator import generate_advanced_test_set
except ImportError:
    print("Warning: Could not import advanced_test_generator module")
    generate_advanced_test_set = None

# Import improved RAGAS metrics
try:
    from ragas_metrics import RAGASMetrics
except ImportError:
    print("Warning: Could not import ragas_metrics module")
    RAGASMetrics = None

try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import openai
    from openai import OpenAI
except ImportError as e:
    print(f"Import error: {e}")

def extract_api_key(headers):
    """Extract API key from Authorization header"""
    auth_header = headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    return None

class RAGASEvaluator:
    def __init__(self, api_key=None):
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            # Initialize OpenAI client if API key is available
            if api_key:
                self.openai_client = OpenAI(api_key=api_key)
                print(f"Using provided OpenAI API key (length: {len(api_key)})")
            else:
                api_key = os.getenv('OPENAI_API_KEY')
                if api_key:
                    self.openai_client = OpenAI(api_key=api_key)
                    print(f"Using environment OpenAI API key (length: {len(api_key)})")
                else:
                    self.openai_client = None
                    print("Warning: OpenAI API key not found. Using simulated evaluations.")
            
            # Initialize improved RAGAS metrics if available
            if RAGASMetrics:
                self.ragas_metrics = RAGASMetrics()
            else:
                self.ragas_metrics = None
                print("Warning: Using fallback RAGAS implementation")
                
        except Exception as e:
            print(f"Error initializing evaluator: {e}")
            self.embedding_model = None
            self.openai_client = None
            self.ragas_metrics = None
    
    def evaluate_strategy(self, chunks: List[str], test_dataset: List[Dict], strategy_name: str) -> Dict[str, Any]:
        """Evaluate a single chunking strategy"""
        
        start_time = time.time()
        
        # Log chunk statistics
        chunk_lengths = [len(chunk) for chunk in chunks]
        avg_length = sum(chunk_lengths) / len(chunk_lengths) if chunk_lengths else 0
        print(f"\n{strategy_name.upper()} CHUNKING STATS:")
        print(f"  - Number of chunks: {len(chunks)}")
        print(f"  - Average chunk length: {avg_length:.0f} chars")
        print(f"  - Min/Max length: {min(chunk_lengths)}/{max(chunk_lengths) if chunk_lengths else 0} chars")
        
        # Simulate RAG pipeline
        rag_results = self._simulate_rag_pipeline(chunks, test_dataset)
        
        # Calculate RAGAS metrics
        ragas_scores = self._calculate_ragas_metrics(rag_results)
        
        # Calculate chunking quality metrics
        chunking_metrics = self._calculate_chunking_quality(chunks)
        
        evaluation_time = time.time() - start_time
        
        # Get per-question metrics if available
        per_question_metrics = None
        if self.ragas_metrics and hasattr(self.ragas_metrics, 'compute_per_question_metrics'):
            try:
                per_question_metrics = self.ragas_metrics.compute_per_question_metrics(
                    questions=rag_results['questions'],
                    answers=rag_results['answers'],
                    contexts=rag_results['contexts'],
                    ground_truths=rag_results['ground_truths']
                )
            except Exception as e:
                print(f"Error computing per-question metrics: {e}")
        
        return {
            'ragas': ragas_scores,
            'chunking_quality': chunking_metrics,
            'performance': {
                'processing_time': evaluation_time,
                'memory_usage': self._estimate_memory_usage(chunks)
            },
            'strategy': strategy_name,
            'timestamp': time.time(),
            'chunks': chunks,  # Include chunks in the results
            'rag_details': rag_results,  # Include questions, answers, contexts for validation
            'per_question_metrics': per_question_metrics  # Include individual question metrics
        }
    
    def _simulate_rag_pipeline(self, chunks: List[str], test_dataset: List[Dict]) -> Dict[str, List]:
        """Simulate RAG pipeline for evaluation purposes"""
        
        questions = [item['question'] for item in test_dataset]
        ground_truths = [item['ground_truth'] for item in test_dataset]
        
        answers = []
        contexts = []
        
        for question in questions:
            # Simulate retrieval: find most relevant chunks
            relevant_chunks = self._retrieve_relevant_chunks(question, chunks, top_k=3)
            contexts.append(relevant_chunks)
            
            # Simulate answer generation
            answer = self._generate_answer(question, relevant_chunks)
            answers.append(answer)
        
        return {
            'questions': questions,
            'answers': answers,
            'contexts': contexts,
            'ground_truths': ground_truths
        }
    
    def _retrieve_relevant_chunks(self, question: str, chunks: List[str], top_k: int = 3) -> List[str]:
        """Simulate retrieval using semantic similarity"""
        
        if not self.embedding_model or not chunks:
            # Fallback: return first few chunks
            return chunks[:top_k]
        
        try:
            # Encode question and chunks
            question_embedding = self.embedding_model.encode([question])
            chunk_embeddings = self.embedding_model.encode(chunks)
            
            # Calculate similarities
            similarities = np.dot(question_embedding, chunk_embeddings.T)[0]
            
            # Get top-k most similar chunks
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            relevant_chunks = [chunks[i] for i in top_indices if i < len(chunks)]
            
            return relevant_chunks
            
        except Exception as e:
            print(f"Error in retrieval: {e}")
            return chunks[:top_k]
    
    def _generate_answer(self, question: str, contexts: List[str]) -> str:
        """Generate answer using contexts"""
        
        if self.openai_client:
            try:
                # Use OpenAI for real answer generation
                context_text = "\n\n".join(contexts)
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant. Answer the question based on the provided context."},
                        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {question}\n\nAnswer:"}
                    ],
                    max_tokens=200,
                    temperature=0.1
                )
                
                return response.choices[0].message.content.strip()
                
            except Exception as e:
                print(f"Error generating answer with OpenAI: {e}")
        
        # Fallback: simulate answer generation
        return self._simulate_answer_generation(question, contexts)
    
    def _simulate_answer_generation(self, question: str, contexts: List[str]) -> str:
        """Simulate answer generation using actual context"""
        
        if not contexts:
            return "No relevant context found to answer this question."
        
        # Combine context text
        context_text = " ".join(contexts)
        question_lower = question.lower()
        
        # Extract sentences from context that are most relevant to the question
        context_sentences = [s.strip() for s in context_text.split('.') if s.strip()]
        
        # Find sentences that contain key words from the question
        question_words = set([w.lower() for w in question.split() if len(w) > 3 and w.lower() not in {'what', 'which', 'where', 'when', 'how', 'does', 'this', 'that', 'the'}])
        
        relevant_sentences = []
        for sentence in context_sentences:
            sentence_lower = sentence.lower()
            # Count how many question keywords appear in this sentence
            relevance_score = sum(1 for word in question_words if word in sentence_lower)
            if relevance_score > 0:
                relevant_sentences.append((relevance_score, sentence))
        
        # Sort by relevance and take top sentences
        relevant_sentences.sort(key=lambda x: x[0], reverse=True)
        
        if relevant_sentences:
            # Combine the most relevant sentences into an answer
            # Take up to 3 most relevant sentences
            answer_sentences = [sent[1] for sent in relevant_sentences[:3]]
            
            # Try to make the answer more coherent
            answer = ". ".join(answer_sentences)
            
            # Clean up the answer
            answer = answer.replace("..", ".")
            answer = answer.strip()
            
            # If answer is too short, add more context
            if len(answer) < 50 and len(relevant_sentences) > 3:
                answer += ". " + relevant_sentences[3][1]
            
            return answer
        
        # If no relevant sentences found, return the first sentence of context
        if context_sentences:
            return context_sentences[0]
        
        return "Unable to generate answer from the provided context."
    
    def _calculate_ragas_metrics(self, rag_results: Dict[str, List]) -> Dict[str, float]:
        """Calculate RAGAS-style metrics"""
        
        questions = rag_results['questions']
        answers = rag_results['answers']
        contexts = rag_results['contexts']
        ground_truths = rag_results['ground_truths']
        
        # Use improved RAGAS metrics if available
        if self.ragas_metrics:
            try:
                metrics = self.ragas_metrics.compute_all_metrics(
                    questions=questions,
                    answers=answers,
                    contexts=contexts,
                    ground_truths=ground_truths
                )
                # Remove the aggregate score as we calculate it separately
                if 'ragas_score' in metrics:
                    del metrics['ragas_score']
                return metrics
            except Exception as e:
                print(f"Error using improved RAGAS metrics: {e}")
                # Fall back to original implementation
        
        # Original implementation as fallback
        faithfulness_scores = []
        relevancy_scores = []
        precision_scores = []
        recall_scores = []
        correctness_scores = []
        
        for i in range(len(questions)):
            # Faithfulness: how well the answer is supported by context
            faithfulness = self._calculate_faithfulness(answers[i], contexts[i])
            faithfulness_scores.append(faithfulness)
            
            # Answer Relevancy: how relevant the answer is to the question
            relevancy = self._calculate_answer_relevancy(questions[i], answers[i])
            relevancy_scores.append(relevancy)
            
            # Context Precision: precision of retrieved contexts
            precision = self._calculate_context_precision(questions[i], contexts[i], ground_truths[i])
            precision_scores.append(precision)
            
            # Context Recall: recall of retrieved contexts
            recall = self._calculate_context_recall(contexts[i], ground_truths[i])
            recall_scores.append(recall)
            
            # Answer Correctness: semantic similarity to ground truth
            correctness = self._calculate_answer_correctness(answers[i], ground_truths[i])
            correctness_scores.append(correctness)
        
        return {
            'faithfulness': np.mean(faithfulness_scores),
            'answer_relevancy': np.mean(relevancy_scores),
            'context_precision': np.mean(precision_scores),
            'context_recall': np.mean(recall_scores),
            'answer_correctness': np.mean(correctness_scores)
        }
    
    def _calculate_faithfulness(self, answer: str, contexts: List[str]) -> float:
        """Calculate faithfulness score"""
        if not contexts or not answer:
            return 0.0
        
        # Simple implementation: check if answer concepts appear in contexts
        answer_words = set(answer.lower().split())
        context_words = set(" ".join(contexts).lower().split())
        
        if not answer_words:
            return 0.0
        
        overlap = len(answer_words.intersection(context_words))
        return min(overlap / len(answer_words), 1.0)
    
    def _calculate_answer_relevancy(self, question: str, answer: str) -> float:
        """Calculate answer relevancy score"""
        if not self.embedding_model:
            # Fallback: simple keyword overlap
            question_words = set(question.lower().split())
            answer_words = set(answer.lower().split())
            if not question_words:
                return 0.0
            overlap = len(question_words.intersection(answer_words))
            return min(overlap / len(question_words), 1.0)
        
        try:
            # Use embeddings for semantic similarity
            question_emb = self.embedding_model.encode([question])
            answer_emb = self.embedding_model.encode([answer])
            similarity = np.dot(question_emb, answer_emb.T)[0][0]
            return max(0.0, float(similarity))
        except:
            return 0.5  # Default score
    
    def _calculate_context_precision(self, question: str, contexts: List[str], ground_truth: str) -> float:
        """Calculate context precision score"""
        if not contexts:
            return 0.0
        
        relevant_contexts = 0
        for context in contexts:
            # Simple relevance check: does context contain key concepts?
            if self._is_context_relevant(question, context, ground_truth):
                relevant_contexts += 1
        
        return relevant_contexts / len(contexts)
    
    def _calculate_context_recall(self, contexts: List[str], ground_truth: str) -> float:
        """Calculate context recall score"""
        if not contexts or not ground_truth:
            return 0.0
        
        # Check if contexts cover the ground truth concepts
        context_text = " ".join(contexts).lower()
        ground_truth_words = set(ground_truth.lower().split())
        
        if not ground_truth_words:
            return 0.0
        
        covered_words = 0
        for word in ground_truth_words:
            if len(word) > 3 and word in context_text:  # Skip short words
                covered_words += 1
        
        return covered_words / len(ground_truth_words) if ground_truth_words else 0.0
    
    def _calculate_answer_correctness(self, answer: str, ground_truth: str) -> float:
        """Calculate answer correctness score"""
        if not self.embedding_model:
            # Fallback: simple word overlap
            answer_words = set(answer.lower().split())
            truth_words = set(ground_truth.lower().split())
            if not truth_words:
                return 0.0
            overlap = len(answer_words.intersection(truth_words))
            return min(overlap / len(truth_words), 1.0)
        
        try:
            # Use embeddings for semantic similarity
            answer_emb = self.embedding_model.encode([answer])
            truth_emb = self.embedding_model.encode([ground_truth])
            similarity = np.dot(answer_emb, truth_emb.T)[0][0]
            return max(0.0, float(similarity))
        except:
            return 0.5  # Default score
    
    def _is_context_relevant(self, question: str, context: str, ground_truth: str) -> bool:
        """Check if context is relevant to question and ground truth"""
        question_lower = question.lower()
        context_lower = context.lower()
        truth_lower = ground_truth.lower()
        
        # Extract key terms from question and ground truth
        key_terms = []
        for text in [question_lower, truth_lower]:
            words = text.split()
            key_terms.extend([w for w in words if len(w) > 4])  # Focus on longer words
        
        # Check if context contains key terms
        relevant_terms = sum(1 for term in key_terms if term in context_lower)
        return relevant_terms >= max(1, len(key_terms) // 3)  # At least 1/3 of key terms
    
    def _calculate_chunking_quality(self, chunks: List[str]) -> Dict[str, float]:
        """Calculate chunking quality metrics"""
        
        if not chunks:
            return {
                'chunk_count': 0,
                'avg_length': 0,
                'length_std': 0,
                'avg_coherence': 0,
                'coherence_std': 0,
                'coverage_ratio': 0
            }
        
        # Basic statistics
        chunk_lengths = [len(chunk) for chunk in chunks]
        
        # Calculate coherence scores
        coherence_scores = []
        if self.embedding_model:
            try:
                for chunk in chunks:
                    sentences = self._split_sentences(chunk)
                    if len(sentences) > 1:
                        coherence = self._calculate_intra_chunk_coherence(sentences)
                        coherence_scores.append(coherence)
            except Exception as e:
                print(f"Error calculating coherence: {e}")
        
        # If no coherence scores, use length-based proxy
        if not coherence_scores:
            coherence_scores = [min(1.0, 500 / max(len(chunk), 1)) for chunk in chunks]
        
        return {
            'chunk_count': len(chunks),
            'avg_length': np.mean(chunk_lengths),
            'length_std': np.std(chunk_lengths),
            'avg_coherence': np.mean(coherence_scores) if coherence_scores else 0.0,
            'coherence_std': np.std(coherence_scores) if coherence_scores else 0.0,
            'coverage_ratio': 1.0  # Assume full coverage for now
        }
    
    def _split_sentences(self, text: str) -> List[str]:
        """Simple sentence splitting"""
        import re
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _calculate_intra_chunk_coherence(self, sentences: List[str]) -> float:
        """Calculate coherence within a chunk"""
        if len(sentences) < 2 or not self.embedding_model:
            return 0.5  # Default coherence
        
        try:
            embeddings = self.embedding_model.encode(sentences)
            similarities = []
            
            for i in range(len(embeddings)):
                for j in range(i + 1, len(embeddings)):
                    sim = np.dot(embeddings[i], embeddings[j])
                    similarities.append(float(sim))
            
            return np.mean(similarities) if similarities else 0.5
            
        except Exception as e:
            print(f"Error calculating coherence: {e}")
            return 0.5
    
    def _estimate_memory_usage(self, chunks: List[str]) -> float:
        """Estimate memory usage in MB"""
        total_chars = sum(len(chunk) for chunk in chunks)
        # Rough estimate: 1 char ≈ 1 byte, plus overhead
        return (total_chars * 1.5) / (1024 * 1024)  # Convert to MB

def create_test_dataset(document_content: Optional[str] = None, document_title: Optional[str] = None, 
                       api_key: Optional[str] = None, custom_questions: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
    """
    Create test questions and ground truth answers
    
    Args:
        document_content: Optional document text to generate domain-specific questions
        document_title: Optional document title
        api_key: Optional API key for advanced generation
        custom_questions: Optional list of custom questions from user
        
    Returns:
        List of test questions with ground truth answers
    """
    # Use custom questions if provided
    if custom_questions and len(custom_questions) >= 4:
        print(f"Using {len(custom_questions)} custom test questions")
        return custom_questions
    # Try advanced generator first if API key is available
    if document_content and api_key and generate_advanced_test_set:
        try:
            print("Generating advanced test questions using LLM...")
            advanced_test_set = generate_advanced_test_set(
                document_content, document_title, num_questions=8, api_key=api_key
            )
            if advanced_test_set and len(advanced_test_set) >= 4:
                print(f"Generated {len(advanced_test_set)} advanced test questions")
                return advanced_test_set
        except Exception as e:
            print(f"Error generating advanced questions: {e}")
            # Fall back to basic generator
    
    # If we have document content and the test generator is available, use it
    if document_content and generate_domain_specific_test_set:
        try:
            print("Generating domain-specific test questions from document...")
            domain_test_set = generate_domain_specific_test_set(document_content, document_title)
            if domain_test_set and len(domain_test_set) >= 4:
                print(f"Generated {len(domain_test_set)} domain-specific questions")
                return domain_test_set
        except Exception as e:
            print(f"Error generating domain-specific questions: {e}")
            # Fall back to default questions
    
    # Default ML-focused questions
    print("Using default machine learning test questions")
    return [
        {
            'question': 'What is machine learning?',
            'ground_truth': 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data to make predictions or decisions without being explicitly programmed.'
        },
        {
            'question': 'What is supervised learning?',
            'ground_truth': 'Supervised learning is a type of machine learning where algorithms learn from labeled training data, with both input features and correct outputs provided, to make predictions on new data.'
        },
        {
            'question': 'How does unsupervised learning differ from supervised learning?',
            'ground_truth': 'Unsupervised learning deals with unlabeled data and tries to find hidden patterns without guidance about outputs, while supervised learning uses labeled data with known correct answers.'
        },
        {
            'question': 'What is deep learning?',
            'ground_truth': 'Deep learning is a specialized subset of machine learning that uses neural networks with multiple layers to automatically learn hierarchical representations of data.'
        },
        {
            'question': 'What are the main types of machine learning?',
            'ground_truth': 'The main types of machine learning are supervised learning (with labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through interaction).'
        },
        {
            'question': 'What is the purpose of cross-validation?',
            'ground_truth': 'Cross-validation is used to evaluate model performance by splitting data into multiple folds, training on some and testing on others, providing a robust estimate of generalization performance.'
        },
        {
            'question': 'What is the bias-variance tradeoff?',
            'ground_truth': 'The bias-variance tradeoff refers to the balance between bias (errors from overly simple assumptions) and variance (errors from sensitivity to training data fluctuations) to minimize total error.'
        },
        {
            'question': 'What are ensemble methods?',
            'ground_truth': 'Ensemble methods combine multiple models to create a stronger predictor than individual models, including techniques like random forests and boosting algorithms.'
        }
    ]

# Async handler for compatibility with the dev server
async def handler(request, response):
    """Async handler for the dev server"""
    try:
        # Get request data
        request_data = await request.json()
        
        chunking_results = request_data['results']
        config = request_data.get('config', {})
        
        # Extract API key if provided
        api_key = request.headers.get('x-api-key')
        if api_key:
            os.environ['OPENAI_API_KEY'] = api_key
        
        # Initialize evaluator with API key
        evaluator = RAGASEvaluator(api_key)
        
        # Extract document content if available
        document_content = None
        document_title = None
        
        # Check if document info was passed from chunking API
        document_info = request_data.get('document_info')
        if document_info:
            document_content = document_info.get('content')
            document_title = document_info.get('title')
        
        # Fallback: Try to reconstruct document from chunks (combine all unique chunk texts)
        if not document_content and chunking_results and 'semantic' in chunking_results:
            semantic_chunks_data = chunking_results['semantic']['chunks']
            if semantic_chunks_data:
                # Get unique chunk texts to avoid duplication
                chunk_texts = []
                seen_texts = set()
                for chunk in semantic_chunks_data:
                    text = chunk.get('text', '')
                    if text and text not in seen_texts:
                        chunk_texts.append(text)
                        seen_texts.add(text)
                
                # Combine chunks to approximate the document
                document_content = ' '.join(chunk_texts)
                
                # Try to get document info from metadata if available
                metadata = chunking_results.get('metadata', {})
                document_title = metadata.get('document_id', 'Document')
        
        # Get custom questions if provided
        custom_questions = request_data.get('custom_questions')
        
        # Create test dataset - will use custom questions if provided, then advanced if API key available
        test_dataset = create_test_dataset(document_content, document_title, api_key, custom_questions)
        
        # Evaluate both strategies
        naive_chunks = chunking_results['naive']['chunks']
        semantic_chunks = chunking_results['semantic']['chunks']
        
        # Extract text from chunk objects
        naive_chunk_texts = [chunk['text'] for chunk in naive_chunks]
        semantic_chunk_texts = [chunk['text'] for chunk in semantic_chunks]
        
        naive_evaluation = evaluator.evaluate_strategy(naive_chunk_texts, test_dataset, 'naive')
        semantic_evaluation = evaluator.evaluate_strategy(semantic_chunk_texts, test_dataset, 'semantic')
        
        response_data = {
            'success': True,
            'results': {
                'naive': naive_evaluation,
                'semantic': semantic_evaluation,
                'test_dataset_size': len(test_dataset),
                'test_dataset': test_dataset  # Include test dataset for display
            },
            'config': config
        }
        
        return response.json(response_data)
        
    except Exception as e:
        error_response = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        
        return response.json(error_response, status=500)

# Remove the class-based handler since we're using the async handler with Flask

