import OpenAI from 'openai';

export interface ChunkWithEmbedding {
  text: string;
  embedding?: number[];
  metadata?: {
    index: number;
    start_char?: number;
    end_char?: number;
    tokens?: number;
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Get embedding for a single text using OpenAI
 */
async function getEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
}

/**
 * Retrieve chunks using embedding similarity
 * This provides semantic search capabilities
 */
export async function embeddingRetrieveChunks(
  query: string,
  chunks: ChunkWithEmbedding[],
  topK: number = 3,
  openai: OpenAI
): Promise<ChunkWithEmbedding[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  try {
    // Get query embedding
    const queryEmbedding = await getEmbedding(openai, query);
    
    // Calculate similarity scores for all chunks
    const scores = chunks.map(chunk => {
      // If chunk has pre-computed embedding, use it
      if (chunk.embedding && chunk.embedding.length > 0) {
        return {
          chunk,
          score: cosineSimilarity(queryEmbedding, chunk.embedding)
        };
      }
      
      // Otherwise, return low score (will need to compute embedding)
      return {
        chunk,
        score: 0
      };
    });
    
    // Sort by similarity score (descending) and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);
  } catch (error) {
    console.error('Error in embedding retrieval:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Compute embeddings for chunks that don't have them
 * This is useful for pre-computing embeddings during chunking
 */
export async function computeChunkEmbeddings<T extends { text: string; embedding?: number[] }>(
  chunks: T[],
  openai: OpenAI
): Promise<T[]> {
  try {
    // Get embeddings for all chunks in batches (OpenAI allows up to 2048 inputs)
    const batchSize = 100;
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.text);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      
      // Add embeddings from this batch
      response.data.forEach(item => {
        allEmbeddings.push(item.embedding);
      });
    }
    
    // Update chunks with embeddings
    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: allEmbeddings[index]
    }));
  } catch (error) {
    console.error('Error computing chunk embeddings:', error);
    return chunks; // Return original chunks on error
  }
}

/**
 * Hybrid retrieval that combines embedding similarity with keyword matching
 * This often provides the best results
 */
export async function hybridEmbeddingRetrieveChunks(
  query: string,
  chunks: ChunkWithEmbedding[],
  topK: number = 3,
  openai: OpenAI,
  keywordWeight: number = 0.3,
  embeddingWeight: number = 0.7
): Promise<ChunkWithEmbedding[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  try {
    // Get query embedding
    const queryEmbedding = await getEmbedding(openai, query);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    
    // Calculate hybrid scores
    const scores = chunks.map(chunk => {
      let embeddingScore = 0;
      let keywordScore = 0;
      
      // Calculate embedding similarity
      if (chunk.embedding && chunk.embedding.length > 0) {
        embeddingScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      
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
      
      // Normalize keyword score
      const normalizedKeyword = keywordScore / Math.max(1, queryWords.length + 5);
      
      // Combine scores
      const hybridScore = (embeddingScore * embeddingWeight) + (normalizedKeyword * keywordWeight);
      
      return {
        chunk,
        score: hybridScore,
        embeddingScore,
        keywordScore: normalizedKeyword
      };
    });
    
    // Sort by hybrid score and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);
  } catch (error) {
    console.error('Error in hybrid embedding retrieval:', error);
    return [];
  }
}