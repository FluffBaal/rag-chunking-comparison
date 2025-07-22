import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In development, proxy to the Python dev server
    const isDev = process.env.NODE_ENV === 'development';
    const pythonUrl = isDev ? 'http://localhost:8001' : '';
    
    if (isDev) {
      const body = await request.json();
      const apiKey = request.headers.get('x-api-key');
      
      const response = await fetch(`${pythonUrl}/api/analysis`, {
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
          { error: error || 'Analysis failed' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // In production, return mock analysis
      const mockAnalysis = {
        statistical_tests: {
          answer_relevancy: {
            statistic: 2.45,
            p_value: 0.03,
            significant: true,
            effect_size: 0.82,
            confidence_interval: [0.05, 0.35]
          },
          context_precision: {
            statistic: 2.78,
            p_value: 0.02,
            significant: true,
            effect_size: 0.93,
            confidence_interval: [0.08, 0.38]
          }
        },
        recommendations: [
          'Semantic chunking shows statistically significant improvements in demo mode.',
          'Context precision improved by 21.5% (p < 0.05)',
          'Answer relevancy improved by 20.6% (p < 0.05)',
          'Note: This is demo data. Deploy Python backend for real analysis.'
        ],
        confidence_metrics: {
          overall_confidence: 'Demo Mode',
          statistical_power: 0.0,
          sample_size_adequacy: 'N/A - Demo Mode'
        },
        summary: {
          total_improvements: 5,
          significant_improvements: 2,
          average_improvement: 19.2,
          recommendation: 'Demo shows semantic chunking potential'
        }
      };
      
      return NextResponse.json(mockAnalysis);
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure the Python dev server is running on port 8001.' },
      { status: 500 }
    );
  }
}