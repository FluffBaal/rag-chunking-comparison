import { TfIdf } from 'natural';

interface RetrievalResult {
  chunk: { text: string };
  score: number;
}

/**
 * Enhanced retrieval using TF-IDF (Term Frequency-Inverse Document Frequency)
 * This provides better relevance scoring than simple keyword matching
 */
export function tfidfRetrieveChunks(
  query: string,
  chunks: Array<{ text: string }>,
  topK: number = 3
): Array<{ text: string }> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Initialize TF-IDF
  const tfidf = new TfIdf();
  
  // Add all chunks as documents
  chunks.forEach(chunk => {
    tfidf.addDocument(chunk.text);
  });
  
  // Calculate scores for each chunk
  const scores: RetrievalResult[] = [];
  
  chunks.forEach((chunk, index) => {
    let score = 0;
    
    // Get TF-IDF score for the query against this document
    tfidf.tfidfs(query, (i: number, measure: number) => {
      if (i === index) {
        score += measure;
      }
    });
    
    scores.push({ chunk, score });
  });
  
  // Sort by score (descending) and return top K
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.chunk);
}

/**
 * Hybrid retrieval that combines TF-IDF with keyword matching
 * This provides the best of both approaches
 */
export function hybridRetrieveChunks(
  query: string,
  chunks: Array<{ text: string }>,
  topK: number = 3
): Array<{ text: string }> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const tfidf = new TfIdf();
  
  // Add all chunks as documents
  chunks.forEach(chunk => {
    tfidf.addDocument(chunk.text);
  });
  
  // Calculate hybrid scores
  const scores: RetrievalResult[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
  
  chunks.forEach((chunk, index) => {
    let tfidfScore = 0;
    let keywordScore = 0;
    
    // Get TF-IDF score
    tfidf.tfidfs(query, (i: number, measure: number) => {
      if (i === index) {
        tfidfScore += measure;
      }
    });
    
    // Calculate keyword score (from original implementation)
    const chunkLower = chunk.text.toLowerCase();
    
    // Count keyword matches
    for (const word of queryWords) {
      if (chunkLower.includes(word)) {
        keywordScore += 1;
      }
    }
    
    // Boost for exact phrase matches
    if (chunkLower.includes(queryLower)) {
      keywordScore += 5;
    }
    
    // Combine scores (weighted average)
    // TF-IDF is normalized by dividing by max possible score
    const normalizedTfidf = tfidfScore / Math.max(1, queryWords.length);
    const normalizedKeyword = keywordScore / Math.max(1, queryWords.length + 5);
    
    // 70% TF-IDF, 30% keyword matching
    const hybridScore = (normalizedTfidf * 0.7) + (normalizedKeyword * 0.3);
    
    scores.push({ chunk, score: hybridScore });
  });
  
  // Sort by score (descending) and return top K
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.chunk);
}