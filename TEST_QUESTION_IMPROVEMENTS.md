# Test Question Generation Improvements

## Overview

The quality of test questions is crucial for meaningful RAG evaluation. Better questions lead to more accurate assessment of chunking strategies.

## Three Levels of Question Generation

### 1. **LLM-Generated Questions** (Best - Requires API Key)
When an OpenAI API key is provided, the system uses GPT to generate sophisticated test questions:

**Features:**
- **Multi-hop reasoning**: Questions that require combining information from multiple chunks
- **Synthesis questions**: Require understanding relationships between concepts
- **Context-aware**: Test understanding of nuance and implications
- **Varied difficulty**: Mix of easy (30%), medium (50%), and hard (20%) questions

**Example Questions:**
- "Based on the performance metrics and system architecture described, what would be the primary bottleneck when scaling this system?"
- "How do the three approaches mentioned in section 2 compare in terms of both accuracy and computational efficiency?"
- "What are the implications of using method A versus method B given the constraints outlined in the document?"

### 2. **Advanced Rule-Based Questions** (Good - No API Required)
Extracts sophisticated patterns from the document:

**Features:**
- Numbered lists and enumerations
- Comparisons and contrasts
- Cause-effect relationships
- Statistical information
- Technical definitions

**Example Questions:**
- "What are all the benefits mentioned in the document?"
- "How does System A compare to System B?"
- "What causes the performance degradation mentioned?"
- "What is the accuracy rate for the baseline model?"

### 3. **Basic Pattern Matching** (Fallback)
Simple extraction of facts and definitions:

**Features:**
- Basic definitions
- Simple facts
- Entity-based questions

**Example Questions:**
- "What is machine learning?"
- "What year was the system developed?"
- "Who developed the algorithm?"

## Why Better Questions Matter

### For Chunking Evaluation:

1. **Boundary Testing**: Multi-hop questions test if chunking preserves relationships across boundaries

2. **Context Preservation**: Synthesis questions verify if semantic chunking maintains necessary context

3. **Retrieval Precision**: Specific questions test if the right chunks are retrieved

4. **Real-world Relevance**: Questions similar to actual user queries provide practical evaluation

### Example Impact:

**Poor Question**: "What is mentioned about performance?"
- Too vague
- Any chunk mentioning "performance" scores well
- Doesn't differentiate chunking quality

**Good Question**: "What is the performance impact of enabling feature X compared to the baseline, and what trade-offs does this introduce?"
- Requires specific information
- Tests retrieval precision
- Evaluates context preservation
- Differentiates good vs bad chunking

## Recommendations

1. **Always use an API key when available** for best evaluation quality

2. **For critical evaluations**, consider using custom questions that target:
   - Known challenging aspects of your document
   - Typical user queries for your use case
   - Information that spans multiple sections

3. **Document structure matters**:
   - Well-structured documents work better with naive chunking
   - Complex narratives benefit from semantic chunking
   - Test questions should reflect your document type

4. **Iterate on chunking parameters** based on which questions fail:
   - If multi-hop questions fail → chunks may be too small
   - If specific detail questions fail → chunks may be too large
   - If context questions fail → semantic threshold may need adjustment