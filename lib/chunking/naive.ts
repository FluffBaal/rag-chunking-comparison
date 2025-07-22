import { encode } from 'gpt-tokenizer';

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

export function naiveChunking(text: string, config: ChunkingConfig = {}): Chunk[] {
  const chunkSize = config.chunk_size || 400;
  const overlap = config.overlap || 50;
  
  // Tokenize the text
  const tokens = encode(text);
  const chunks: Chunk[] = [];
  
  let startIdx = 0;
  let chunkIndex = 0;
  
  while (startIdx < tokens.length) {
    // Calculate end index for this chunk
    const endIdx = Math.min(startIdx + chunkSize, tokens.length);
    
    // Get the token slice for this chunk
    const chunkTokens = tokens.slice(startIdx, endIdx);
    
    // Decode tokens back to text
    // Since we don't have a direct decode function, we'll use character-based chunking
    // as a fallback for now
    const chunkText = naiveChunkByCharacters(text, startIdx, endIdx, tokens.length, chunkSize);
    
    chunks.push({
      text: chunkText.trim(),
      metadata: {
        index: chunkIndex,
        start_char: startIdx,
        end_char: endIdx,
        tokens: chunkTokens.length
      }
    });
    
    // Move start index forward, accounting for overlap
    startIdx += chunkSize - overlap;
    chunkIndex++;
    
    // Prevent infinite loop if overlap >= chunk_size
    if (startIdx <= chunkIndex * overlap) {
      startIdx = (chunkIndex + 1) * Math.max(1, chunkSize - overlap);
    }
  }
  
  return chunks;
}

function naiveChunkByCharacters(
  text: string, 
  tokenStart: number, 
  tokenEnd: number, 
  totalTokens: number,
  chunkSize: number
): string {
  // Approximate character positions based on token positions
  const avgCharsPerToken = text.length / totalTokens;
  const charStart = Math.floor(tokenStart * avgCharsPerToken);
  const charEnd = Math.min(Math.floor(tokenEnd * avgCharsPerToken), text.length);
  
  // Adjust to word boundaries
  let adjustedStart = charStart;
  let adjustedEnd = charEnd;
  
  // Move start to beginning of word
  while (adjustedStart > 0 && text[adjustedStart - 1] !== ' ') {
    adjustedStart--;
  }
  
  // Move end to end of word
  while (adjustedEnd < text.length && text[adjustedEnd] !== ' ') {
    adjustedEnd++;
  }
  
  return text.slice(adjustedStart, adjustedEnd);
}

export function calculateNaiveMetrics(chunks: Chunk[]) {
  const lengths = chunks.map(c => c.text.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  
  // Simple coherence score based on chunk length consistency
  const coherenceScore = 1 - (Math.sqrt(variance) / avgLength);
  
  return {
    coherence_score: Math.max(0, Math.min(1, coherenceScore)),
    avg_chunk_length: Math.round(avgLength),
    length_variance: Math.round(variance * 10) / 10,
    total_chunks: chunks.length
  };
}