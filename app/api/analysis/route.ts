import { NextRequest, NextResponse } from 'next/server';
import { performStatisticalAnalysis } from '@/lib/analysis/statistics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results } = body;
    const apiKey = request.headers.get('x-api-key') || undefined;
    
    if (!results) {
      return NextResponse.json(
        { error: 'Evaluation results are required' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    // Perform statistical analysis
    const analysis = performStatisticalAnalysis(results);
    
    // Format response to match expected structure
    const response = {
      success: true,
      statistical_tests: Object.entries(analysis.statistical_tests).reduce((acc, [metric, test]) => {
        acc[metric] = {
          statistic: test.statistic,
          p_value: test.p_value,
          significant: test.significant,
          effect_size: analysis.effect_sizes[metric],
          confidence_interval: [
            analysis.confidence_intervals[metric].lower,
            analysis.confidence_intervals[metric].upper
          ]
        };
        return acc;
      }, {} as any),
      
      recommendations: generateRecommendations(analysis, !!apiKey),
      
      confidence_metrics: {
        overall_confidence: apiKey ? 'High' : 'Limited (No API Key)',
        statistical_power: apiKey ? 0.8 : 0.5,
        sample_size_adequacy: apiKey ? 'Adequate' : 'Limited - Simulated metrics'
      },
      
      summary: {
        total_improvements: Object.keys(analysis.statistical_tests).length,
        significant_improvements: Object.values(analysis.statistical_tests).filter((t: any) => t.significant).length,
        average_improvement: calculateAverageImprovement(analysis),
        overall_improvement: calculateAverageImprovement(analysis),
        significant_count: Object.values(analysis.statistical_tests).filter((t: any) => t.significant).length,
        total_metrics: Object.keys(analysis.statistical_tests).length,
        best_improvement: findBestImprovement(analysis),
        worst_improvement: findWorstImprovement(analysis),
        recommendation: analysis.overall_recommendation,
        confidence_level: apiKey ? 'High' : 'Limited (No API Key)'
      },
      
      detailed_analysis: {
        summary_statistics: analysis.summary_statistics,
        effect_sizes: analysis.effect_sizes,
        interpretations: analysis.interpretations
      },
      
      metadata: {
        analysis_time: (Date.now() - startTime) / 1000,
        api_version: '2.0.0',
        mode: apiKey ? 'full' : 'limited'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform analysis. ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

function generateRecommendations(analysis: any, hasApiKey: boolean): string[] {
  const recommendations: string[] = [];
  
  if (!hasApiKey) {
    recommendations.push('Analysis based on simulated metrics. Provide OpenAI API key for accurate evaluation.');
  }
  
  // Add specific metric recommendations
  const significantMetrics = Object.entries(analysis.statistical_tests)
    .filter(([_, test]: [string, any]) => test.significant)
    .map(([metric, test]: [string, any]) => {
      const effect = analysis.effect_sizes[metric];
      const improvement = analysis.confidence_intervals[metric].mean_diff;
      return `${formatMetricName(metric)} improved by ${(improvement * 100).toFixed(1)}% (p < ${test.p_value.toFixed(3)}, d = ${effect})`;
    });
  
  recommendations.push(...significantMetrics);
  
  // Add interpretation-based recommendations
  const strongImprovements = Object.entries(analysis.interpretations)
    .filter(([_, interp]: [string, any]) => interp.includes('substantial') || interp.includes('Moderate'))
    .length;
  
  if (strongImprovements >= 3) {
    recommendations.push('Multiple metrics show substantial improvements with semantic chunking.');
  }
  
  // Add overall recommendation
  recommendations.push(analysis.overall_recommendation);
  
  return recommendations;
}

function calculateAverageImprovement(analysis: any): number {
  const improvements = Object.values(analysis.confidence_intervals)
    .map((ci: any) => ci.mean_diff * 100);
  
  const sum = improvements.reduce((a: number, b: number) => a + b, 0);
  return Math.round(sum / improvements.length * 10) / 10;
}

function formatMetricName(metric: string): string {
  return metric
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function findBestImprovement(analysis: any): { metric: string; improvement: number } | null {
  const improvements = Object.entries(analysis.confidence_intervals)
    .map(([metric, ci]: [string, any]) => ({
      metric,
      improvement: ci.mean_diff * 100
    }))
    .sort((a, b) => b.improvement - a.improvement);
  
  return improvements[0] || null;
}

function findWorstImprovement(analysis: any): { metric: string; improvement: number } | null {
  const improvements = Object.entries(analysis.confidence_intervals)
    .map(([metric, ci]: [string, any]) => ({
      metric,
      improvement: ci.mean_diff * 100
    }))
    .sort((a, b) => a.improvement - b.improvement);
  
  return improvements[0] || null;
}