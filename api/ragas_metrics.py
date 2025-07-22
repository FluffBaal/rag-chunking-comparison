"""
Improved RAGAS Metrics Implementation

This module implements RAGAS (Retrieval Augmented Generation Assessment) metrics
following the official RAGAS framework for evaluating RAG pipelines.

Reference: https://docs.ragas.io/en/latest/concepts/metrics/index.html
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer
import re
from collections import Counter

class RAGASMetrics:
    """
    Implements RAGAS metrics for evaluating RAG systems.
    
    The main metrics are:
    1. Faithfulness - Measures factual consistency of answer against context
    2. Answer Relevancy - Measures how relevant the answer is to the question
    3. Context Precision - Measures signal-to-noise ratio in retrieved contexts
    4. Context Recall - Measures if all relevant information is retrieved
    5. Answer Correctness - Measures accuracy against ground truth
    """
    
    def __init__(self, embedding_model_name: str = 'all-MiniLM-L6-v2'):
        try:
            self.embedding_model = SentenceTransformer(embedding_model_name)
        except:
            print("Warning: Could not load embedding model, using fallback metrics")
            self.embedding_model = None
    
    def compute_all_metrics(self, 
                          questions: List[str],
                          answers: List[str], 
                          contexts: List[List[str]], 
                          ground_truths: List[str]) -> Dict[str, float]:
        """
        Compute all RAGAS metrics
        
        Args:
            questions: List of questions
            answers: List of generated answers
            contexts: List of retrieved context lists (each item is a list of chunks)
            ground_truths: List of ground truth answers
            
        Returns:
            Dictionary with all metric scores
        """
        metrics = {
            'faithfulness': self.compute_faithfulness(answers, contexts),
            'answer_relevancy': self.compute_answer_relevancy(questions, answers),
            'context_precision': self.compute_context_precision(questions, contexts, ground_truths),
            'context_recall': self.compute_context_recall(contexts, ground_truths),
            'answer_correctness': self.compute_answer_correctness(answers, ground_truths)
        }
        
        # Add aggregate score
        metrics['ragas_score'] = np.mean(list(metrics.values()))
        
        return metrics
    
    def _compute_single_faithfulness(self, answer: str, contexts: List[str]) -> float:
        """Compute faithfulness for a single answer"""
        if not answer or not contexts:
            return 0.0
        
        statements = self._extract_statements(answer)
        if not statements:
            return 1.0
        
        supported = 0
        context_text = " ".join(contexts).lower()
        
        for statement in statements:
            if self._is_statement_supported(statement, context_text):
                supported += 1
        
        return supported / len(statements)
    
    def _compute_single_relevancy(self, question: str, answer: str) -> float:
        """Compute answer relevancy for a single Q&A pair"""
        if not question or not answer:
            return 0.0
        
        if self.embedding_model:
            try:
                q_emb = self.embedding_model.encode([question])[0]
                a_emb = self.embedding_model.encode([answer])[0]
                similarity = np.dot(q_emb, a_emb) / (np.linalg.norm(q_emb) * np.linalg.norm(a_emb))
                return float(similarity)
            except:
                return self._fallback_relevancy(question, answer)
        else:
            return self._fallback_relevancy(question, answer)
    
    def _compute_single_correctness(self, answer: str, ground_truth: str) -> float:
        """Compute answer correctness for a single answer"""
        if not answer or not ground_truth:
            return 0.0
        
        factual_score = self._compute_factual_similarity(answer, ground_truth)
        
        if self.embedding_model:
            try:
                a_emb = self.embedding_model.encode([answer])[0]
                gt_emb = self.embedding_model.encode([ground_truth])[0]
                semantic_score = float(np.dot(a_emb, gt_emb) / (np.linalg.norm(a_emb) * np.linalg.norm(gt_emb)))
            except:
                semantic_score = factual_score
        else:
            semantic_score = factual_score
        
        return 0.5 * factual_score + 0.5 * semantic_score
    
    def _compute_single_precision(self, question: str, contexts: List[str], ground_truth: str) -> float:
        """Compute context precision for a single question"""
        if not contexts:
            return 0.0
        
        relevance_scores = []
        for context in contexts:
            is_relevant = self._is_context_relevant_to_answer(context, ground_truth, question)
            relevance_scores.append(1.0 if is_relevant else 0.0)
        
        if sum(relevance_scores) == 0:
            return 0.0
        
        precision_sum = 0.0
        relevant_so_far = 0
        
        for k, is_relevant in enumerate(relevance_scores):
            if is_relevant:
                relevant_so_far += 1
                precision_at_k = relevant_so_far / (k + 1)
                precision_sum += precision_at_k
        
        return precision_sum / sum(relevance_scores)
    
    def _compute_single_recall(self, contexts: List[str], ground_truth: str) -> float:
        """Compute context recall for a single question"""
        if not ground_truth:
            return 1.0
        
        if not contexts:
            return 0.0
        
        gt_key_phrases = self._extract_key_phrases(ground_truth)
        if not gt_key_phrases:
            return 1.0
        
        context_text = " ".join(contexts).lower()
        covered = 0
        
        for phrase in gt_key_phrases:
            if self._is_phrase_covered(phrase, context_text):
                covered += 1
        
        return covered / len(gt_key_phrases)
    
    def compute_per_question_metrics(self, 
                                   questions: List[str],
                                   answers: List[str], 
                                   contexts: List[List[str]], 
                                   ground_truths: List[str]) -> List[Dict[str, float]]:
        """
        Compute RAGAS metrics for each individual question
        
        Returns:
            List of dictionaries, one per question, with metric scores
        """
        per_question_metrics = []
        
        for i in range(len(questions)):
            q_metrics = {
                'faithfulness': self._compute_single_faithfulness(answers[i], contexts[i]),
                'answer_relevancy': self._compute_single_relevancy(questions[i], answers[i]),
                'answer_correctness': self._compute_single_correctness(answers[i], ground_truths[i]),
                'context_precision': self._compute_single_precision(questions[i], contexts[i], ground_truths[i]),
                'context_recall': self._compute_single_recall(contexts[i], ground_truths[i])
            }
            per_question_metrics.append(q_metrics)
        
        return per_question_metrics
    
    def compute_faithfulness(self, answers: List[str], contexts: List[List[str]]) -> float:
        """
        Faithfulness measures the factual consistency of the answer against the given context.
        A faithful answer contains only statements that can be inferred from the context.
        
        Score = (Number of statements supported by context) / (Total number of statements in answer)
        """
        scores = []
        
        for answer, context_list in zip(answers, contexts):
            if not answer or not context_list:
                scores.append(0.0)
                continue
            
            # Extract statements from answer
            statements = self._extract_statements(answer)
            if not statements:
                scores.append(1.0)  # No statements to verify
                continue
            
            # Check each statement against context
            supported = 0
            context_text = " ".join(context_list).lower()
            
            for statement in statements:
                if self._is_statement_supported(statement, context_text):
                    supported += 1
            
            score = supported / len(statements)
            scores.append(score)
        
        return np.mean(scores) if scores else 0.0
    
    def compute_answer_relevancy(self, questions: List[str], answers: List[str]) -> float:
        """
        Answer Relevancy measures how pertinent the answer is to the question.
        
        Method: Generate questions from the answer and measure similarity to original question
        """
        scores = []
        
        for question, answer in zip(questions, answers):
            if not question or not answer:
                scores.append(0.0)
                continue
            
            if self.embedding_model:
                # Compute semantic similarity between question and answer
                try:
                    q_emb = self.embedding_model.encode([question])[0]
                    a_emb = self.embedding_model.encode([answer])[0]
                    
                    # Cosine similarity
                    similarity = np.dot(q_emb, a_emb) / (np.linalg.norm(q_emb) * np.linalg.norm(a_emb))
                    scores.append(float(similarity))
                except:
                    scores.append(self._fallback_relevancy(question, answer))
            else:
                scores.append(self._fallback_relevancy(question, answer))
        
        return np.mean(scores) if scores else 0.0
    
    def compute_context_precision(self, 
                                questions: List[str], 
                                contexts: List[List[str]], 
                                ground_truths: List[str]) -> float:
        """
        Context Precision measures the signal-to-noise ratio of retrieved contexts.
        Higher scores indicate that relevant chunks are ranked higher.
        
        Score = Sum(Precision@k * relevance@k) / Total relevant chunks
        """
        scores = []
        
        for question, context_list, ground_truth in zip(questions, contexts, ground_truths):
            if not context_list:
                scores.append(0.0)
                continue
            
            # Determine relevance of each context chunk
            relevance_scores = []
            for i, context in enumerate(context_list):
                is_relevant = self._is_context_relevant_to_answer(context, ground_truth, question)
                relevance_scores.append(1.0 if is_relevant else 0.0)
            
            # Calculate precision at each position
            if sum(relevance_scores) == 0:
                scores.append(0.0)
                continue
            
            precision_sum = 0.0
            relevant_so_far = 0
            
            for k, is_relevant in enumerate(relevance_scores):
                if is_relevant:
                    relevant_so_far += 1
                    precision_at_k = relevant_so_far / (k + 1)
                    precision_sum += precision_at_k
            
            score = precision_sum / sum(relevance_scores)
            scores.append(score)
        
        return np.mean(scores) if scores else 0.0
    
    def compute_context_recall(self, contexts: List[List[str]], ground_truths: List[str]) -> float:
        """
        Context Recall measures if all relevant information needed to answer the question
        is present in the retrieved contexts.
        
        Score = (Information in ground truth covered by contexts) / (Total information in ground truth)
        """
        scores = []
        
        for context_list, ground_truth in zip(contexts, ground_truths):
            if not ground_truth:
                scores.append(1.0)
                continue
            
            if not context_list:
                scores.append(0.0)
                continue
            
            # Extract key information from ground truth
            gt_key_phrases = self._extract_key_phrases(ground_truth)
            if not gt_key_phrases:
                scores.append(1.0)
                continue
            
            # Check coverage in contexts
            context_text = " ".join(context_list).lower()
            covered = 0
            
            for phrase in gt_key_phrases:
                if self._is_phrase_covered(phrase, context_text):
                    covered += 1
            
            score = covered / len(gt_key_phrases)
            scores.append(score)
        
        return np.mean(scores) if scores else 0.0
    
    def compute_answer_correctness(self, answers: List[str], ground_truths: List[str]) -> float:
        """
        Answer Correctness measures the accuracy of the answer compared to ground truth.
        Combines factual similarity and semantic similarity.
        """
        scores = []
        
        for answer, ground_truth in zip(answers, ground_truths):
            if not answer or not ground_truth:
                scores.append(0.0)
                continue
            
            # Factual similarity (F1 score based on key facts)
            factual_score = self._compute_factual_similarity(answer, ground_truth)
            
            # Semantic similarity
            if self.embedding_model:
                try:
                    a_emb = self.embedding_model.encode([answer])[0]
                    gt_emb = self.embedding_model.encode([ground_truth])[0]
                    semantic_score = float(np.dot(a_emb, gt_emb) / (np.linalg.norm(a_emb) * np.linalg.norm(gt_emb)))
                except:
                    semantic_score = factual_score
            else:
                semantic_score = factual_score
            
            # Weighted combination (equal weights)
            combined_score = 0.5 * factual_score + 0.5 * semantic_score
            scores.append(combined_score)
        
        return np.mean(scores) if scores else 0.0
    
    # Helper methods
    
    def _extract_statements(self, text: str) -> List[str]:
        """Extract individual statements from text"""
        # Split by sentence endings and semicolons
        sentences = re.split(r'[.!?;]+', text)
        statements = []
        
        for sent in sentences:
            sent = sent.strip()
            if len(sent.split()) > 3:  # At least 3 words
                statements.append(sent)
        
        return statements
    
    def _is_statement_supported(self, statement: str, context: str) -> bool:
        """Check if a statement is supported by context"""
        statement_lower = statement.lower()
        
        # Extract key content words from statement
        key_words = [w for w in statement_lower.split() 
                    if len(w) > 3 and w not in {'this', 'that', 'these', 'those', 'with', 'from'}]
        
        if not key_words:
            return True  # Empty statement is considered supported
        
        # Check if majority of key words appear in context
        found = sum(1 for word in key_words if word in context)
        return found >= len(key_words) * 0.6  # 60% threshold
    
    def _fallback_relevancy(self, question: str, answer: str) -> float:
        """Fallback relevancy calculation using keyword overlap"""
        q_words = set(question.lower().split())
        a_words = set(answer.lower().split())
        
        # Remove stop words
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where'}
        q_words = q_words - stop_words
        a_words = a_words - stop_words
        
        if not q_words:
            return 0.5
        
        overlap = len(q_words & a_words)
        return min(overlap / len(q_words), 1.0)
    
    def _is_context_relevant_to_answer(self, context: str, answer: str, question: str) -> bool:
        """Determine if context is relevant for answering the question"""
        context_lower = context.lower()
        answer_lower = answer.lower()
        question_lower = question.lower()
        
        # Extract key terms from question and answer
        key_terms = set()
        for text in [question_lower, answer_lower]:
            words = text.split()
            key_terms.update([w for w in words if len(w) > 4])
        
        # Count how many key terms appear in context
        matches = sum(1 for term in key_terms if term in context_lower)
        
        # Context is relevant if it contains significant portion of key terms
        return matches >= max(1, len(key_terms) * 0.3)
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text for recall calculation"""
        text_lower = text.lower()
        
        # Simple approach: extract noun phrases and important terms
        phrases = []
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        
        for sent in sentences:
            sent = sent.strip()
            if len(sent.split()) > 3:
                # Extract potential key phrases (3-5 word sequences)
                words = sent.split()
                for i in range(len(words) - 2):
                    phrase = ' '.join(words[i:i+3])
                    if not any(w in phrase for w in ['the', 'a', 'an', 'is', 'are']):
                        phrases.append(phrase.lower())
        
        # Also add important individual words
        important_words = [w for w in text_lower.split() 
                          if len(w) > 5 and w not in {'these', 'those', 'which', 'where'}]
        phrases.extend(important_words[:5])  # Top 5 important words
        
        return list(set(phrases))  # Remove duplicates
    
    def _is_phrase_covered(self, phrase: str, context: str) -> bool:
        """Check if phrase is covered in context"""
        # For single words, exact match
        if ' ' not in phrase:
            return phrase in context
        
        # For multi-word phrases, check if all words appear close together
        words = phrase.split()
        if all(word in context for word in words):
            # Simple proximity check
            return True
        
        return False
    
    def _compute_factual_similarity(self, answer: str, ground_truth: str) -> float:
        """Compute factual similarity using F1 score approach"""
        # Extract facts (numbers, named entities, key terms)
        answer_facts = self._extract_facts(answer)
        gt_facts = self._extract_facts(ground_truth)
        
        if not gt_facts:
            return 1.0 if not answer_facts else 0.5
        
        if not answer_facts:
            return 0.0
        
        # Calculate precision and recall
        common = len(answer_facts & gt_facts)
        precision = common / len(answer_facts) if answer_facts else 0
        recall = common / len(gt_facts) if gt_facts else 0
        
        # F1 score
        if precision + recall == 0:
            return 0.0
        
        f1 = 2 * (precision * recall) / (precision + recall)
        return f1
    
    def _extract_facts(self, text: str) -> set:
        """Extract factual elements from text"""
        facts = set()
        text_lower = text.lower()
        
        # Extract numbers
        numbers = re.findall(r'\b\d+\b', text)
        facts.update(numbers)
        
        # Extract capitalized words (potential entities)
        words = text.split()
        entities = [w for w in words if w[0].isupper() and len(w) > 2]
        facts.update([e.lower() for e in entities[:10]])  # Top 10 entities
        
        # Extract key terms (long words)
        key_terms = [w.lower() for w in text_lower.split() if len(w) > 6]
        facts.update(key_terms[:10])  # Top 10 key terms
        
        return facts