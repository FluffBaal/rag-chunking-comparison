import { NextRequest, NextResponse } from 'next/server';

// Define interfaces for type safety
interface Model {
  id: string;
  created: number;
  object: string;
  owned_by?: string;
}

interface ModelsResponse {
  data: Model[];
  object: string;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Fetch models from OpenAI
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch models' } }));
      return NextResponse.json(
        { error: error.error?.message || 'Failed to fetch models' },
        { status: response.status }
      );
    }

    const data: ModelsResponse = await response.json();
    
    // Filter and sort models that are suitable for text generation
    const textModels = data.data
      .filter((model: Model) => {
        const modelId = model.id.toLowerCase();
        // Include GPT models and text generation models
        return (
          modelId.includes('gpt') ||
          modelId.includes('text-') ||
          modelId.includes('davinci') ||
          modelId.includes('curie') ||
          modelId.includes('babbage') ||
          modelId.includes('ada')
        ) && !modelId.includes('embed') && !modelId.includes('whisper') && !modelId.includes('tts');
      })
      .sort((a: Model, b: Model) => {
        // Sort by model name, with GPT-4 models first, then GPT-3.5
        const aId = a.id.toLowerCase();
        const bId = b.id.toLowerCase();
        
        if (aId.includes('gpt-4') && !bId.includes('gpt-4')) return -1;
        if (!aId.includes('gpt-4') && bId.includes('gpt-4')) return 1;
        if (aId.includes('gpt-3.5') && !bId.includes('gpt-3.5')) return -1;
        if (!aId.includes('gpt-3.5') && bId.includes('gpt-3.5')) return 1;
        
        return a.id.localeCompare(b.id);
      })
      .map((model: Model) => ({
        id: model.id,
        name: formatModelName(model.id),
        created: model.created,
      }));

    return NextResponse.json({
      success: true,
      models: textModels,
      count: textModels.length,
    });
  } catch (error) {
    console.error('Models fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

function formatModelName(modelId: string): string {
  // Format model names for display
  const formatted = modelId
    .replace(/^gpt-/, 'GPT-')
    .replace(/-turbo/, ' Turbo')
    .replace(/-preview/, ' Preview')
    .replace(/-/, ' ')
    .replace(/(\d+)k/, '$1K');
  
  // Capitalize first letter of each word
  return formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}