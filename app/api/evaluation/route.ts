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
      // In production, this will be handled by Vercel's Python runtime
      return NextResponse.json(
        { error: 'This endpoint is handled by Vercel serverless functions in production' },
        { status: 501 }
      );
    }
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure the Python dev server is running on port 8001.' },
      { status: 500 }
    );
  }
}