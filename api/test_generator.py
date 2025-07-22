"""
Test Question Generator for Domain-Specific Evaluation

This module generates test questions and ground truth answers based on the content
of uploaded documents, ensuring that evaluation metrics are relevant to the actual
document being analyzed.
"""

import re
import random
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
import nltk
from collections import Counter

class DomainSpecificTestGenerator:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """Initialize the test generator with necessary models"""
        try:
            self.embedding_model = SentenceTransformer(model_name)
            # Ensure NLTK data is available
            try:
                nltk.data.find('tokenizers/punkt')
            except:
                nltk.download('punkt', quiet=True)
            try:
                nltk.data.find('tokenizers/punkt_tab')
            except:
                nltk.download('punkt_tab', quiet=True)
            try:
                nltk.data.find('taggers/averaged_perceptron_tagger')
            except:
                nltk.download('averaged_perceptron_tagger', quiet=True)
            try:
                nltk.data.find('taggers/averaged_perceptron_tagger_eng')
            except:
                nltk.download('averaged_perceptron_tagger_eng', quiet=True)
        except Exception as e:
            print(f"Error initializing test generator: {e}")
            self.embedding_model = None
    
    def generate_test_set(self, document_text: str, num_questions: int = 8) -> List[Dict[str, str]]:
        """
        Generate test questions and ground truth answers based on document content
        
        Args:
            document_text: The full text of the document
            num_questions: Number of test questions to generate
            
        Returns:
            List of dictionaries with 'question' and 'ground_truth' keys
        """
        # Extract key information from the document
        sentences = self._extract_sentences(document_text)
        key_facts = self._identify_key_facts(sentences)
        entities = self._extract_entities(document_text)
        definitions = self._extract_definitions(sentences)
        relationships = self._extract_relationships(sentences)
        
        test_set = []
        
        # Generate different types of questions
        question_types = [
            ('definition', self._generate_definition_question, definitions),
            ('fact', self._generate_fact_question, key_facts),
            ('entity', self._generate_entity_question, entities),
            ('relationship', self._generate_relationship_question, relationships),
            ('summary', self._generate_summary_question, key_facts)
        ]
        
        # Ensure variety in question types
        questions_per_type = max(1, num_questions // len(question_types))
        remaining = num_questions - (questions_per_type * len(question_types))
        
        for q_type, generator, data in question_types:
            count = questions_per_type + (1 if remaining > 0 else 0)
            if remaining > 0:
                remaining -= 1
            
            for _ in range(count):
                if data:
                    question_data = generator(data, document_text)
                    if question_data:
                        test_set.append(question_data)
        
        # If we don't have enough questions, fill with additional fact-based questions
        while len(test_set) < num_questions and key_facts:
            question_data = self._generate_fact_question(key_facts, document_text)
            if question_data and question_data not in test_set:
                test_set.append(question_data)
        
        # Ensure we don't exceed the requested number
        return test_set[:num_questions]
    
    def _extract_sentences(self, text: str) -> List[str]:
        """Extract and clean sentences from text"""
        sentences = nltk.sent_tokenize(text)
        # Filter out very short sentences and clean them
        cleaned = []
        for sent in sentences:
            sent = sent.strip()
            if len(sent.split()) > 5:  # At least 5 words
                cleaned.append(sent)
        return cleaned
    
    def _identify_key_facts(self, sentences: List[str]) -> List[str]:
        """Identify sentences that contain key facts"""
        key_facts = []
        
        # Patterns that often indicate important information
        fact_patterns = [
            r'\bis\s+(?:a|an|the)\b',  # Definitions
            r'\bare\s+(?:a|an|the)\b',  # Definitions (plural)
            r'\bconsists?\s+of\b',      # Composition
            r'\bincludes?\b',           # Inclusion
            r'\bdefines?\b',            # Definitions
            r'\bmeans?\b',              # Meaning
            r'\bprovides?\b',           # Function
            r'\ballows?\b',             # Capability
            r'\benables?\b',            # Capability
            r'\b(?:main|primary|key|important|significant)\b',  # Importance markers
        ]
        
        for sent in sentences:
            sent_lower = sent.lower()
            # Check if sentence matches any fact pattern
            if any(re.search(pattern, sent_lower) for pattern in fact_patterns):
                # Also check it's not a question
                if not sent.strip().endswith('?'):
                    key_facts.append(sent)
        
        # Limit to most relevant facts
        return key_facts[:20]
    
    def _extract_entities(self, text: str) -> List[Tuple[str, str]]:
        """Extract named entities and important terms"""
        entities = []
        
        # Simple entity extraction based on capitalization and patterns
        # Look for consistently capitalized terms (likely proper nouns)
        words = text.split()
        word_counts = Counter()
        
        # Common words to skip
        skip_words = {'The', 'This', 'These', 'Those', 'That', 'There', 'Then', 'They', 'What', 'When', 'Where', 'Which', 'Who', 'Why', 'How'}
        
        for word in words:
            # Clean word
            clean_word = re.sub(r'[^\w\s-]', '', word)
            if clean_word and clean_word[0].isupper() and len(clean_word) > 2 and clean_word not in skip_words:
                word_counts[clean_word] += 1
        
        # Get frequently mentioned entities
        for entity, count in word_counts.most_common(10):
            if count > 1:  # Mentioned more than once
                # Find a sentence that defines or describes this entity
                for sent in nltk.sent_tokenize(text):
                    if entity in sent and any(marker in sent.lower() for marker in ['is', 'are', 'refers to', 'means']):
                        entities.append((entity, sent))
                        break
        
        return entities
    
    def _extract_definitions(self, sentences: List[str]) -> List[Tuple[str, str]]:
        """Extract term definitions from sentences"""
        definitions = []
        
        definition_patterns = [
            (r'(\w+(?:\s+\w+)*?)\s+(?:is|are)\s+(?:a|an|the)?\s*(.+)', 1, 2),
            (r'(\w+(?:\s+\w+)*?)\s+refers?\s+to\s+(.+)', 1, 2),
            (r'(\w+(?:\s+\w+)*?)\s+means?\s+(.+)', 1, 2),
            (r'(\w+(?:\s+\w+)*?)\s*:\s+(.+)', 1, 2),  # Term: definition
        ]
        
        for sent in sentences:
            for pattern, term_group, def_group in definition_patterns:
                match = re.search(pattern, sent, re.IGNORECASE)
                if match:
                    term = match.group(term_group).strip()
                    definition = match.group(def_group).strip()
                    # Filter out pronouns and very short terms
                    if len(term.split()) <= 4 and not term.lower() in ['it', 'this', 'that', 'they', 'these', 'those']:
                        definitions.append((term, sent))
                        break
        
        return definitions[:10]  # Limit to 10 definitions
    
    def _extract_relationships(self, sentences: List[str]) -> List[Tuple[str, str, str]]:
        """Extract relationships between concepts"""
        relationships = []
        
        relationship_patterns = [
            r'(\w+(?:\s+\w+)*?)\s+(?:leads?\s+to|results?\s+in|causes?)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*?)\s+(?:includes?|contains?|consists?\s+of)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*?)\s+(?:uses?|utilizes?|employs?)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*?)\s+(?:differs?\s+from|contrasts?\s+with)\s+(\w+(?:\s+\w+)*)',
        ]
        
        for sent in sentences:
            for pattern in relationship_patterns:
                match = re.search(pattern, sent, re.IGNORECASE)
                if match:
                    subj = match.group(1).strip()
                    obj = match.group(2).strip()
                    relationships.append((subj, obj, sent))
                    break
        
        return relationships[:10]
    
    def _generate_definition_question(self, definitions: List[Tuple[str, str]], document_text: str) -> Dict[str, str]:
        """Generate a definition-based question"""
        if not definitions:
            return None
        
        term, full_sentence = random.choice(definitions)
        
        # Create question
        question = f"What is {term}?"
        
        # Ground truth is the full sentence containing the definition
        ground_truth = full_sentence
        
        return {
            'question': question,
            'ground_truth': ground_truth
        }
    
    def _generate_fact_question(self, facts: List[str], document_text: str) -> Dict[str, str]:
        """Generate a fact-based question"""
        if not facts:
            return None
        
        fact = random.choice(facts)
        
        # Simple approach: look for capitalized words or important terms
        words = fact.split()
        important_words = []
        
        for word in words:
            clean_word = re.sub(r'[^\w\s-]', '', word)
            # Look for capitalized words (potential subjects) or longer words
            if (clean_word and (clean_word[0].isupper() or len(clean_word) > 6) 
                and clean_word.lower() not in ['these', 'this', 'that', 'those', 'the']):
                important_words.append(clean_word)
        
        if important_words:
            subject = random.choice(important_words)
            question = f"What can you tell me about {subject}?"
        else:
            # Fallback: ask about the main topic
            question = "What does this document say about this topic?"
        
        return {
            'question': question,
            'ground_truth': fact
        }
    
    def _generate_entity_question(self, entities: List[Tuple[str, str]], document_text: str) -> Dict[str, str]:
        """Generate an entity-based question"""
        if not entities:
            return None
        
        entity, description = random.choice(entities)
        
        question_templates = [
            f"What is {entity}?",
            f"Describe {entity}.",
            f"What do you know about {entity}?",
            f"Explain {entity}."
        ]
        
        question = random.choice(question_templates)
        
        return {
            'question': question,
            'ground_truth': description
        }
    
    def _generate_relationship_question(self, relationships: List[Tuple[str, str, str]], document_text: str) -> Dict[str, str]:
        """Generate a relationship-based question"""
        if not relationships:
            return None
        
        subj, obj, full_sentence = random.choice(relationships)
        
        question_templates = [
            f"What is the relationship between {subj} and {obj}?",
            f"How does {subj} relate to {obj}?",
            f"Explain the connection between {subj} and {obj}."
        ]
        
        question = random.choice(question_templates)
        
        return {
            'question': question,
            'ground_truth': full_sentence
        }
    
    def _generate_summary_question(self, facts: List[str], document_text: str) -> Dict[str, str]:
        """Generate a summary-based question"""
        if not facts:
            return None
        
        # Extract main topics from facts using simple word frequency
        word_counts = Counter()
        for fact in facts[:5]:  # Use first 5 facts
            words = fact.split()
            for word in words:
                clean_word = re.sub(r'[^\w\s-]', '', word)
                # Count longer, meaningful words
                if len(clean_word) > 4 and clean_word[0].isupper():
                    word_counts[clean_word] += 1
        
        # Get most common topic
        if word_counts:
            main_topic = word_counts.most_common(1)[0][0]
            question = f"Summarize the key points about {main_topic}."
            
            # Create ground truth by combining relevant facts
            relevant_facts = [fact for fact in facts if main_topic.lower() in fact.lower()][:3]
            ground_truth = " ".join(relevant_facts) if relevant_facts else facts[0]
            
            return {
                'question': question,
                'ground_truth': ground_truth
            }
        else:
            # Fallback question
            return {
                'question': "What are the main points discussed in this document?",
                'ground_truth': " ".join(facts[:2])
            }


def generate_domain_specific_test_set(document_text: str, document_title: str = None) -> List[Dict[str, str]]:
    """
    Main function to generate domain-specific test questions
    
    Args:
        document_text: The text content of the uploaded document
        document_title: Optional title of the document
        
    Returns:
        List of test questions with ground truth answers
    """
    generator = DomainSpecificTestGenerator()
    
    # Generate test set
    test_set = generator.generate_test_set(document_text)
    
    # If we couldn't generate enough questions, add some fallback questions
    if len(test_set) < 8:
        fallback_questions = [
            {
                'question': f"What is the main topic of this document?",
                'ground_truth': f"The document discusses {document_title or 'various topics'}. " + 
                               document_text[:200].strip() + "..."
            },
            {
                'question': "What are the key points mentioned in this document?",
                'ground_truth': "The key points include: " + 
                               ". ".join(document_text.split('.')[:3]) + "."
            }
        ]
        
        for q in fallback_questions:
            if len(test_set) < 8:
                test_set.append(q)
    
    return test_set