import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In development, proxy to the Python dev server
    const isDev = process.env.NODE_ENV === 'development';
    const pythonUrl = isDev ? 'http://localhost:8001' : '';
    
    if (isDev) {
      const body = await request.json();
      const apiKey = request.headers.get('x-api-key');
      
      const response = await fetch(`${pythonUrl}/api/evaluation`, {
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
          { error: error || 'Evaluation failed' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // In production, return mock evaluation data
      const mockEvaluation = {
        naive: {
          ragas: {
            faithfulness: 0.72,
            answer_relevancy: 0.68,
            context_precision: 0.65,
            context_recall: 0.70,
            answer_correctness: 0.69
          },
          rag_details: {
            retrieved_contexts: [['Demo context 1', 'Demo context 2']],
            generated_answers: ['This is a demo answer.'],
            ground_truths: ['This is the expected answer.']
          }
        },
        semantic: {
          ragas: {
            faithfulness: 0.85,
            answer_relevancy: 0.82,
            context_precision: 0.79,
            context_recall: 0.83,
            answer_correctness: 0.81
          },
          rag_details: {
            retrieved_contexts: [['Semantic context 1', 'Semantic context 2']],
            generated_answers: ['This is a better demo answer.'],
            ground_truths: ['This is the expected answer.']
          }
        },
        comparison: {
          ragas_improvements: {
            faithfulness: 18.1,
            answer_relevancy: 20.6,
            context_precision: 21.5,
            context_recall: 18.6,
            answer_correctness: 17.4
          },
          quality_improvements: {
            coherence_score: 17.3,
            avg_chunk_length: -6.7,
            length_variance: -40.4,
            total_chunks: 0
          },
          statistical_significance: {},
          summary: {
            overall_improvement: 19.2,
            significant_metrics: ['answer_relevancy', 'context_precision'],
            significant_count: 2,
            total_metrics: 5,
            best_improvement: {
              metric: 'context_precision',
              improvement: 21.5
            },
            worst_improvement: {
              metric: 'answer_correctness',
              improvement: 17.4
            },
            recommendation: 'Semantic chunking shows promising improvements in demo mode.',
            confidence_level: 'Demo Mode'
          }
        },
        test_dataset: [
          {
            question: 'What is the main topic?',
            ground_truth: 'This is the expected answer.'
          }
        ],
        metadata: {
          evaluation_time: 1.2,
          model_used: 'demo',
          api_version: '1.0.0',
          note: 'This is a demo response. Deploy Python backend separately for real evaluation.'
        }
      };
      
      return NextResponse.json(mockEvaluation);
    }
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure the Python dev server is running on port 8001.' },
      { status: 500 }
    );
  }
}