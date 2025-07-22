import { NextRequest, NextResponse } from 'next/server';
import { naiveChunking, calculateNaiveMetrics } from '@/lib/chunking/naive';
import { semanticChunking, calculateSemanticMetrics } from '@/lib/chunking/semantic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document, config } = body;
    const apiKey = request.headers.get('x-api-key') || undefined;
    
    if (!document || typeof document !== 'string') {
      return NextResponse.json(
        { error: 'Document text is required' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    // Perform naive chunking
    const naiveChunks = naiveChunking(document, {
      chunk_size: config?.chunk_size || 400,
      overlap: config?.overlap || 50,
      model: config?.model || 'gpt-3.5-turbo'
    });
    
    const naiveMetrics = calculateNaiveMetrics(naiveChunks);
    
    // Perform semantic chunking
    const semanticChunks = await semanticChunking(document, {
      similarity_threshold: config?.similarity_threshold || 0.7,
      max_tokens: config?.max_tokens || 400,
      min_tokens: config?.min_tokens || 75,
      model: config?.model || 'gpt-3.5-turbo',
      apiKey
    });
    
    const semanticMetrics = calculateSemanticMetrics(semanticChunks);
    
    // Calculate comparison metrics
    const coherenceImprovement = ((semanticMetrics.coherence_score - naiveMetrics.coherence_score) / naiveMetrics.coherence_score) * 100;
    const consistencyImprovement = naiveMetrics.length_variance > 0 
      ? ((naiveMetrics.length_variance - semanticMetrics.length_variance) / naiveMetrics.length_variance) * 100
      : 0;
    
    const response = {
      results: {
        naive: {
          strategy: 'naive',
          chunks: naiveChunks,
          quality_metrics: naiveMetrics,
          strategy_info: {
            chunk_size: config?.chunk_size || 400,
            overlap: config?.overlap || 50
          }
        },
        semantic: {
          strategy: 'semantic',
          chunks: semanticChunks,
          quality_metrics: semanticMetrics,
          strategy_info: {
            similarity_threshold: config?.similarity_threshold || 0.7,
            max_tokens: config?.max_tokens || 400,
            min_tokens: config?.min_tokens || 75,
            uses_embeddings: !!apiKey
          }
        }
      },
      comparison: {
        coherence_improvement: Math.round(coherenceImprovement * 10) / 10,
        consistency_improvement: Math.round(consistencyImprovement * 10) / 10,
        chunks_difference: semanticChunks.length - naiveChunks.length
      },
      metadata: {
        processing_time: (Date.now() - startTime) / 1000,
        document_length: document.length,
        api_version: '2.0.0',
        mode: apiKey ? 'full' : 'limited'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Chunking error:', error);
    return NextResponse.json(
      { error: 'Failed to process document. ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}