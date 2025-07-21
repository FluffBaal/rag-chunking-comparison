import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Test the API key with OpenAI
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      } else {
        let errorMessage = 'Invalid API key';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }
        
        return NextResponse.json(
          { success: false, error: errorMessage }
        );
      }
    } catch (fetchError) {
      console.error('Error calling OpenAI:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to connect to OpenAI API' }
      );
    }
  } catch (error) {
    console.error('API key test error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' }
    );
  }
}