export interface Chunk {
  text: string;
  metadata: {
    index: number;
    start_char?: number;
    end_char?: number;
    tokens?: number;
  };
}

export interface ChunkingConfig {
  chunk_size?: number;
  overlap?: number;
  model?: string;
}

// Simple tokenizer fallback
function simpleTokenize(text: string): string[] {
  // Split by whitespace and punctuation, filter empty strings
  return text.split(/[\s\.,;!?\-]+/).filter(token => token.length > 0);
}

// Dynamic import with fallback
async function getTokenizer() {
  try {
    const { encode } = await import('gpt-tokenizer');
    return encode;
  } catch (error) {
    console.warn('Failed to load gpt-tokenizer, using simple tokenizer:', error);
    return null;
  }
}

export function naiveChunking(text: string, config: ChunkingConfig = {}): Chunk[] {
  const chunkSize = config.chunk_size || 400;
  const overlap = config.overlap || 50;
  
  if (!text || text.length === 0) {
    return [];
  }
  
  // For now, use character-based chunking as it's more reliable
  // We'll enhance this with proper tokenization later
  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let startIdx = 0;
  
  // Calculate approximate characters per token (rough estimate)
  const avgCharsPerToken = 4;
  const charChunkSize = chunkSize * avgCharsPerToken;
  const charOverlap = overlap * avgCharsPerToken;
  
  while (startIdx < text.length) {
    let endIdx = Math.min(startIdx + charChunkSize, text.length);
    
    // Try to end at a sentence boundary
    if (endIdx < text.length) {
      // Look for sentence endings
      const sentenceEnders = ['. ', '! ', '? ', '\n\n'];
      let bestEndIdx = endIdx;
      
      for (const ender of sentenceEnders) {
        const lastIndex = text.lastIndexOf(ender, endIdx);
        if (lastIndex > startIdx + charChunkSize * 0.5) {
          bestEndIdx = lastIndex + ender.length;
          break;
        }
      }
      
      // If no sentence boundary found, try to end at word boundary
      if (bestEndIdx === endIdx && text[endIdx] !== ' ') {
        const lastSpace = text.lastIndexOf(' ', endIdx);
        if (lastSpace > startIdx + charChunkSize * 0.5) {
          bestEndIdx = lastSpace;
        }
      }
      
      endIdx = bestEndIdx;
    }
    
    const chunkText = text.slice(startIdx, endIdx).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        metadata: {
          index: chunkIndex,
          start_char: startIdx,
          end_char: endIdx,
          tokens: Math.ceil(chunkText.length / avgCharsPerToken)
        }
      });
      chunkIndex++;
    }
    
    // Move start index forward
    if (endIdx >= text.length) {
      break;
    }
    
    startIdx = endIdx - charOverlap;
    
    // Ensure we make progress
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && lastChunk.metadata.start_char !== undefined && startIdx <= lastChunk.metadata.start_char) {
      startIdx = endIdx;
    }
  }
  
  return chunks;
}

export function calculateNaiveMetrics(chunks: Chunk[]) {
  if (chunks.length === 0) {
    return {
      coherence_score: 0,
      avg_chunk_length: 0,
      length_variance: 0,
      total_chunks: 0
    };
  }
  
  const lengths = chunks.map(c => c.text.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.length > 1 
    ? lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / (lengths.length - 1)
    : 0;
  
  // Simple coherence score based on chunk length consistency
  const stdDev = Math.sqrt(variance);
  const coherenceScore = avgLength > 0 ? 1 - Math.min(1, stdDev / avgLength) : 0;
  
  return {
    coherence_score: Math.max(0, Math.min(1, coherenceScore)),
    avg_chunk_length: Math.round(avgLength),
    length_variance: Math.round(variance * 10) / 10,
    total_chunks: chunks.length
  };
}