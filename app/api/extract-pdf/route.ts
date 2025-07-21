import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In development, proxy to the Python dev server
    const isDev = process.env.NODE_ENV === 'development';
    const pythonUrl = isDev ? 'http://localhost:8001' : '';
    
    if (isDev) {
      const formData = await request.formData();
      const pdf = formData.get('pdf') as File;
      
      if (!pdf) {
        return NextResponse.json(
          { error: 'No PDF file provided' },
          { status: 400 }
        );
      }
      
      // Convert file to base64 for easier transmission
      const arrayBuffer = await pdf.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      const response = await fetch(`${pythonUrl}/api/extract-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: pdf.name,
          content: base64,
          contentType: pdf.type,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: error || 'PDF extraction failed' },
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
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure the Python dev server is running on port 8001.' },
      { status: 500 }
    );
  }
}