import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In development, proxy to the Python dev server
    const isDev = process.env.NODE_ENV === 'development';
    const pythonUrl = isDev ? 'http://localhost:8001' : '';
    
    if (isDev) {
      const body = await request.json();
      const apiKey = request.headers.get('x-api-key');
      
      const response = await fetch(`${pythonUrl}/api/chunking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: error || 'Chunking failed' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // In production, return mock data for demo purposes
      const body = await request.json();
      const { document, config } = body;
      
      const mockResponse = {
        results: {
          naive: {
            strategy: 'naive',
            chunks: [
              { text: 'This is a demo chunk 1 using naive strategy.', metadata: { index: 0 } },
              { text: 'This is a demo chunk 2 using naive strategy.', metadata: { index: 1 } }
            ],
            quality_metrics: {
              coherence_score: 0.75,
              avg_chunk_length: 45,
              length_variance: 5.2,
              total_chunks: 2
            },
            strategy_info: {
              chunk_size: config?.chunk_size || 400,
              overlap: config?.overlap || 50
            }
          },
          semantic: {
            strategy: 'semantic',
            chunks: [
              { text: 'This is a semantically coherent demo chunk.', metadata: { index: 0 } },
              { text: 'This represents another semantic unit.', metadata: { index: 1 } }
            ],
            quality_metrics: {
              coherence_score: 0.88,
              avg_chunk_length: 42,
              length_variance: 3.1,
              total_chunks: 2
            },
            strategy_info: {
              similarity_threshold: config?.similarity_threshold || 0.7,
              max_tokens: config?.max_tokens || 400,
              min_tokens: config?.min_tokens || 75
            }
          }
        },
        comparison: {
          coherence_improvement: 17.3,
          consistency_improvement: 15.2,
          chunks_difference: 0
        },
        metadata: {
          processing_time: 0.5,
          document_length: document?.length || 100,
          api_version: '1.0.0',
          note: 'This is a demo response. Deploy Python backend separately for real functionality.'
        }
      };
      
      return NextResponse.json(mockResponse);
    }
  } catch (error) {
    console.error('Chunking error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure the Python dev server is running on port 8001.' },
      { status: 500 }
    );
  }
}