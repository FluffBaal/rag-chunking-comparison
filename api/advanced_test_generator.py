"""
Advanced Test Question Generator for RAG Evaluation

This module generates high-quality test questions that properly evaluate RAG systems
by creating questions that test:
- Multi-hop reasoning
- Specific detail retrieval
- Context understanding
- Different cognitive levels
"""

import random
from typing import List, Dict, Optional, Tuple
import re
import os
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

class AdvancedTestGenerator:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.openai_client = None
        
        if self.api_key and OpenAI:
            try:
                self.openai_client = OpenAI(api_key=self.api_key)
                print("Advanced test generator initialized with OpenAI")
            except Exception as e:
                print(f"Failed to initialize OpenAI client: {e}")
                self.openai_client = None
    
    def generate_test_set(self, document_text: str, document_title: Optional[str] = None, 
                         num_questions: int = 10) -> List[Dict[str, str]]:
        """Generate high-quality test questions from document"""
        
        if self.openai_client:
            # Use LLM for sophisticated question generation
            return self._generate_llm_questions(document_text, document_title, num_questions)
        else:
            # Fall back to improved rule-based generation
            return self._generate_advanced_rule_questions(document_text, document_title, num_questions)
    
    def _generate_llm_questions(self, document_text: str, document_title: Optional[str], 
                                num_questions: int) -> List[Dict[str, str]]:
        """Use LLM to generate high-quality questions"""
        
        # Truncate document if too long
        max_chars = 6000  # Leave room for prompt
        if len(document_text) > max_chars:
            document_text = document_text[:max_chars] + "..."
        
        prompt = f"""Generate {num_questions} high-quality test questions for evaluating a RAG (Retrieval Augmented Generation) system.

Document Title: {document_title or 'Unknown'}

Document Content:
{document_text}

Requirements for questions:
1. Create diverse question types:
   - Factual questions requiring specific information
   - Questions requiring synthesis of multiple facts
   - Questions about relationships between concepts
   - Questions testing understanding of context
   - Questions that would differentiate good vs poor retrieval

2. Vary difficulty levels:
   - Some straightforward questions (30%)
   - Some moderate questions requiring inference (50%)
   - Some challenging questions requiring synthesis (20%)

3. Make questions realistic - similar to what actual users would ask

4. Each question must be answerable from the document content

5. Provide precise ground truth answers based solely on the document

Format your response as a JSON array with this structure:
[
  {{
    "question": "The question text",
    "ground_truth": "The precise answer based on the document",
    "difficulty": "easy|medium|hard",
    "type": "factual|synthesis|relationship|contextual"
  }}
]

Generate exactly {num_questions} questions."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo-16k" if len(document_text) > 3000 else "gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at creating evaluation questions for RAG systems."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the response
            content = response.choices[0].message.content
            
            # Extract JSON from response
            import json
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                questions_data = json.loads(json_match.group())
                
                # Convert to expected format
                test_set = []
                for q in questions_data[:num_questions]:
                    test_set.append({
                        'question': q['question'],
                        'ground_truth': q['ground_truth']
                    })
                
                return test_set
            
        except Exception as e:
            print(f"Error generating LLM questions: {e}")
        
        # Fall back to rule-based
        return self._generate_advanced_rule_questions(document_text, document_title, num_questions)
    
    def _generate_advanced_rule_questions(self, document_text: str, document_title: Optional[str], 
                                         num_questions: int) -> List[Dict[str, str]]:
        """Generate better rule-based questions"""
        
        # Extract different types of information
        sentences = self._extract_sentences(document_text)
        
        # Extract more sophisticated patterns
        numbered_items = self._extract_numbered_items(sentences)
        comparisons = self._extract_comparisons(sentences)
        cause_effects = self._extract_cause_effects(sentences)
        technical_terms = self._extract_technical_terms(sentences)
        statistics = self._extract_statistics(sentences)
        
        test_set = []
        
        # Generate questions that test chunk boundary issues
        if numbered_items:
            for items in numbered_items[:2]:  # First 2 lists
                if len(items) >= 3:
                    test_set.append({
                        'question': f"What are all the {items['context']} mentioned in the document?",
                        'ground_truth': f"The {items['context']} mentioned are: " + ", ".join(items['items'])
                    })
        
        # Generate comparison questions
        if comparisons:
            for comp in comparisons[:2]:
                test_set.append({
                    'question': f"How does {comp['item1']} compare to {comp['item2']}?",
                    'ground_truth': comp['comparison']
                })
        
        # Generate cause-effect questions
        if cause_effects:
            for ce in cause_effects[:2]:
                test_set.append({
                    'question': f"What causes {ce['effect']}?",
                    'ground_truth': f"{ce['cause']} causes {ce['effect']}"
                })
        
        # Generate technical definition questions
        if technical_terms:
            for term, definition in technical_terms[:3]:
                test_set.append({
                    'question': f"What is {term}?",
                    'ground_truth': definition
                })
        
        # Generate statistical questions
        if statistics:
            for stat in statistics[:2]:
                test_set.append({
                    'question': f"What is the {stat['metric']} for {stat['subject']}?",
                    'ground_truth': f"The {stat['metric']} for {stat['subject']} is {stat['value']}"
                })
        
        # Multi-hop questions (require combining information)
        if len(sentences) > 10:
            # Find sentences that reference each other
            multi_hop = self._generate_multi_hop_questions(sentences)
            test_set.extend(multi_hop[:2])
        
        # If we still need more questions, generate contextual ones
        while len(test_set) < num_questions:
            context_q = self._generate_contextual_question(sentences)
            if context_q and context_q not in test_set:
                test_set.append(context_q)
            else:
                break
        
        return test_set[:num_questions]
    
    def _extract_sentences(self, text: str) -> List[str]:
        """Extract and clean sentences"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 20]
    
    def _extract_numbered_items(self, sentences: List[str]) -> List[Dict]:
        """Extract numbered or bulleted lists"""
        numbered_items = []
        
        for i, sent in enumerate(sentences):
            # Look for patterns like "1.", "a)", "•", "-" at the beginning
            if re.match(r'^(\d+\.|[a-z]\)|[•\-\*])\s+', sent.strip()):
                # Find the context (previous sentence)
                context = sentences[i-1] if i > 0 else "items"
                
                # Collect consecutive list items
                items = []
                j = i
                while j < len(sentences) and re.match(r'^(\d+\.|[a-z]\)|[•\-\*])\s+', sentences[j].strip()):
                    item_text = re.sub(r'^(\d+\.|[a-z]\)|[•\-\*])\s+', '', sentences[j].strip())
                    items.append(item_text)
                    j += 1
                
                if len(items) >= 2:
                    numbered_items.append({
                        'context': self._extract_list_context(context),
                        'items': items
                    })
        
        return numbered_items
    
    def _extract_list_context(self, context: str) -> str:
        """Extract what the list is about from context sentence"""
        # Look for patterns like "following X:", "these X:", "X include:"
        patterns = [
            r'following\s+(\w+)',
            r'these\s+(\w+)',
            r'(\w+)\s+include',
            r'(\w+)\s+are:',
            r'types of\s+(\w+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, context.lower())
            if match:
                return match.group(1)
        
        return "items"
    
    def _extract_comparisons(self, sentences: List[str]) -> List[Dict]:
        """Extract comparative statements"""
        comparisons = []
        
        comparison_words = ['compared to', 'versus', 'unlike', 'whereas', 'while', 'but', 
                           'in contrast', 'differ', 'similar to', 'better than', 'worse than']
        
        for sent in sentences:
            sent_lower = sent.lower()
            for comp_word in comparison_words:
                if comp_word in sent_lower:
                    # Try to extract what's being compared
                    parts = sent_lower.split(comp_word)
                    if len(parts) == 2:
                        item1 = self._extract_noun_phrase(parts[0])
                        item2 = self._extract_noun_phrase(parts[1])
                        if item1 and item2:
                            comparisons.append({
                                'item1': item1,
                                'item2': item2,
                                'comparison': sent
                            })
                    break
        
        return comparisons
    
    def _extract_cause_effects(self, sentences: List[str]) -> List[Dict]:
        """Extract cause-effect relationships"""
        cause_effects = []
        
        causal_patterns = [
            r'(\w+.*?)\s+(?:causes?|leads? to|results? in)\s+(.+)',
            r'due to\s+(.+?),\s*(.+)',
            r'because of\s+(.+?),\s*(.+)',
            r'(.+?)\s+is caused by\s+(.+)'
        ]
        
        for sent in sentences:
            for pattern in causal_patterns:
                match = re.search(pattern, sent, re.IGNORECASE)
                if match:
                    cause_effects.append({
                        'cause': match.group(1).strip(),
                        'effect': match.group(2).strip()
                    })
                    break
        
        return cause_effects
    
    def _extract_technical_terms(self, sentences: List[str]) -> List[Tuple[str, str]]:
        """Extract technical terms and their definitions"""
        definitions = []
        
        # Patterns for definitions
        patterns = [
            r'(\w+(?:\s+\w+)?)\s+is\s+(?:a|an|the)\s+(.+)',
            r'(\w+(?:\s+\w+)?)\s+refers to\s+(.+)',
            r'(\w+(?:\s+\w+)?)\s+means\s+(.+)',
            r'(\w+(?:\s+\w+)?),\s+(?:which is|defined as)\s+(.+)'
        ]
        
        for sent in sentences:
            for pattern in patterns:
                match = re.search(pattern, sent)
                if match:
                    term = match.group(1)
                    definition = match.group(2)
                    # Filter out common words
                    if len(term) > 3 and term.lower() not in ['this', 'that', 'these', 'those', 'which']:
                        definitions.append((term, sent))
                        break
        
        return definitions
    
    def _extract_statistics(self, sentences: List[str]) -> List[Dict]:
        """Extract statistical information"""
        statistics = []
        
        # Pattern for numbers with context
        pattern = r'(\w+(?:\s+\w+)?)\s+(?:is|was|are|were|has|have)\s+(\d+(?:\.\d+)?%?|\d+(?:,\d+)*)\s*(\w+)?'
        
        for sent in sentences:
            matches = re.finditer(pattern, sent)
            for match in matches:
                subject = match.group(1)
                value = match.group(2)
                unit = match.group(3) if match.group(3) else ""
                
                statistics.append({
                    'subject': subject,
                    'value': f"{value} {unit}".strip(),
                    'metric': 'value',
                    'full_context': sent
                })
        
        return statistics
    
    def _extract_noun_phrase(self, text: str) -> str:
        """Simple extraction of main noun phrase"""
        # Remove common words and get the main subject
        words = text.strip().split()
        if not words:
            return ""
        
        # Skip determiners and get to the noun
        skip_words = ['the', 'a', 'an', 'this', 'that', 'these', 'those']
        result = []
        for word in words:
            if word.lower() not in skip_words or result:
                result.append(word)
        
        return ' '.join(result[:3])  # Take first 3 words max
    
    def _generate_multi_hop_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate questions that require combining multiple pieces of information"""
        multi_hop = []
        
        # Look for sentences that build on each other
        for i in range(len(sentences) - 1):
            # Find sentences that share a common entity
            entities_1 = set(re.findall(r'\b[A-Z]\w+\b', sentences[i]))
            entities_2 = set(re.findall(r'\b[A-Z]\w+\b', sentences[i+1]))
            
            common = entities_1 & entities_2
            if common and len(common) == 1:
                entity = list(common)[0]
                # Create a question that requires both sentences
                combined_info = f"{sentences[i]} {sentences[i+1]}"
                
                multi_hop.append({
                    'question': f"What can you tell me about {entity} based on all the information provided?",
                    'ground_truth': combined_info
                })
        
        return multi_hop
    
    def _generate_contextual_question(self, sentences: List[str]) -> Optional[Dict]:
        """Generate a question about the overall context"""
        if len(sentences) < 5:
            return None
        
        # Pick a random section
        start = random.randint(0, len(sentences) - 5)
        section = sentences[start:start+5]
        
        # Find the main topic of this section
        all_words = ' '.join(section).lower().split()
        word_freq = {}
        for word in all_words:
            if len(word) > 5:  # Focus on longer words
                word_freq[word] = word_freq.get(word, 0) + 1
        
        if word_freq:
            main_topic = max(word_freq, key=word_freq.get)
            
            return {
                'question': f"What does the document say about {main_topic}?",
                'ground_truth': ' '.join(section)
            }
        
        return None


def generate_advanced_test_set(document_text: str, document_title: Optional[str] = None,
                              num_questions: int = 10, api_key: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Generate advanced test questions for document
    
    Args:
        document_text: The document content
        document_title: Optional title of the document
        num_questions: Number of questions to generate
        api_key: Optional OpenAI API key
        
    Returns:
        List of test questions with ground truth answers
    """
    generator = AdvancedTestGenerator(api_key)
    return generator.generate_test_set(document_text, document_title, num_questions)