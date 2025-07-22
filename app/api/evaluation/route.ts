import { NextRequest, NextResponse } from 'next/server';
import { 
  generateTestQuestions, 
  retrieveChunks, 
  generateAnswer, 
  calculateRAGASMetrics 
} from '@/lib/evaluation/ragas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results, config } = body;
    const apiKey = request.headers.get('x-api-key') || undefined;
    
    if (!results || !results.naive || !results.semantic) {
      return NextResponse.json(
        { error: 'Chunking results are required' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    const evaluationConfig = {
      model: config?.model || 'gpt-3.5-turbo',
      num_questions: config?.num_questions || 5,
      apiKey
    };
    
    // Generate test questions from the first strategy's chunks
    const questions = await generateTestQuestions(
      results.naive.chunks,
      evaluationConfig
    );
    
    // Evaluate naive strategy
    const naiveEval = await evaluateStrategy(
      results.naive.chunks,
      questions,
      evaluationConfig
    );
    
    // Evaluate semantic strategy with the same questions
    const semanticEval = await evaluateStrategy(
      results.semantic.chunks,
      questions,
      evaluationConfig
    );
    
    // Calculate improvements
    const improvements = calculateImprovements(naiveEval.metrics, semanticEval.metrics);
    
    const response = {
      success: true,
      naive: {
        ragas: naiveEval.metrics,
        rag_details: {
          retrieved_contexts: naiveEval.retrievals.map(chunks => chunks.map(c => c.text)),
          generated_answers: naiveEval.answers,
          ground_truths: questions.map(q => q.expected_answer)
        }
      },
      semantic: {
        ragas: semanticEval.metrics,
        rag_details: {
          retrieved_contexts: semanticEval.retrievals.map(chunks => chunks.map(c => c.text)),
          generated_answers: semanticEval.answers,
          ground_truths: questions.map(q => q.expected_answer)
        }
      },
      comparison: {
        ragas_improvements: improvements,
        quality_improvements: {
          coherence_score: ((results.semantic.quality_metrics.coherence_score - results.naive.quality_metrics.coherence_score) / results.naive.quality_metrics.coherence_score) * 100,
          avg_chunk_length: ((results.semantic.quality_metrics.avg_chunk_length - results.naive.quality_metrics.avg_chunk_length) / results.naive.quality_metrics.avg_chunk_length) * 100,
          length_variance: ((results.semantic.quality_metrics.length_variance - results.naive.quality_metrics.length_variance) / results.naive.quality_metrics.length_variance) * 100,
          total_chunks: results.semantic.chunks.length - results.naive.chunks.length
        },
        statistical_significance: {},
        summary: {
          overall_improvement: calculateOverallImprovement(improvements),
          significant_metrics: identifySignificantMetrics(improvements),
          significant_count: identifySignificantMetrics(improvements).length,
          total_metrics: 5,
          best_improvement: findBestImprovement(improvements),
          worst_improvement: findWorstImprovement(improvements),
          recommendation: generateRecommendation(improvements, !!apiKey),
          confidence_level: apiKey ? 'High' : 'Limited (No API Key)'
        }
      },
      test_dataset: questions.map(q => ({
        question: q.question,
        ground_truth: q.expected_answer
      })),
      metadata: {
        evaluation_time: (Date.now() - startTime) / 1000,
        model_used: evaluationConfig.model,
        api_version: '2.0.0',
        mode: apiKey ? 'full' : 'limited'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate chunks. ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

async function evaluateStrategy(
  chunks: Array<{ text: string }>, 
  questions: any[],
  config: any
) {
  const retrievals: Array<Array<{ text: string }>> = [];
  const answers: string[] = [];
  
  for (const question of questions) {
    // Retrieve relevant chunks
    const retrieved = retrieveChunks(question.question, chunks, 3);
    retrievals.push(retrieved);
    
    // Generate answer
    const answer = await generateAnswer(question.question, retrieved, config);
    answers.push(answer);
  }
  
  // Calculate RAGAS metrics
  const metrics = await calculateRAGASMetrics(
    questions,
    retrievals,
    answers,
    config
  );
  
  return {
    metrics,
    retrievals,
    answers
  };
}

function calculateImprovements(naiveMetrics: any, semanticMetrics: any): any {
  const improvements: any = {};
  
  for (const key of Object.keys(naiveMetrics)) {
    const naive = naiveMetrics[key];
    const semantic = semanticMetrics[key];
    
    if (naive > 0) {
      improvements[key] = Math.round(((semantic - naive) / naive) * 1000) / 10;
    } else {
      improvements[key] = 0;
    }
  }
  
  return improvements;
}

function calculateOverallImprovement(improvements: any): number {
  const values = Object.values(improvements) as number[];
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length * 10) / 10;
}

function identifySignificantMetrics(improvements: any): string[] {
  return Object.entries(improvements)
    .filter(([_, value]) => Math.abs(value as number) > 10)
    .map(([key, _]) => key);
}

function findBestImprovement(improvements: any): any {
  let best = { metric: '', improvement: -Infinity };
  
  for (const [metric, improvement] of Object.entries(improvements)) {
    if ((improvement as number) > best.improvement) {
      best = { metric, improvement: improvement as number };
    }
  }
  
  return best;
}

function findWorstImprovement(improvements: any): any {
  let worst = { metric: '', improvement: Infinity };
  
  for (const [metric, improvement] of Object.entries(improvements)) {
    if ((improvement as number) < worst.improvement) {
      worst = { metric, improvement: improvement as number };
    }
  }
  
  return worst;
}

function generateRecommendation(improvements: any, hasApiKey: boolean): string {
  const overall = calculateOverallImprovement(improvements);
  
  if (!hasApiKey) {
    return 'Limited evaluation without API key. Provide OpenAI API key for comprehensive analysis with embeddings and LLM-based metrics.';
  }
  
  if (overall > 15) {
    return 'Semantic chunking shows significant improvements across multiple metrics. Strongly recommended for this document type.';
  } else if (overall > 5) {
    return 'Semantic chunking provides moderate improvements. Consider using it for better retrieval quality.';
  } else if (overall > -5) {
    return 'Both strategies perform similarly. Choose based on your specific requirements and computational resources.';
  } else {
    return 'Naive chunking may be more suitable for this document. Consider adjusting parameters or document preprocessing.';
  }
}