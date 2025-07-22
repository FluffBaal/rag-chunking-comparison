'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Info, RefreshCw } from 'lucide-react';
import { ChunkingConfig } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ConfigurationPanelProps {
  config: ChunkingConfig;
  onConfigChange: (config: ChunkingConfig) => void;
  disabled?: boolean;
  apiKey?: string | null;
}

export function ConfigurationPanel({ config, onConfigChange, disabled = false, apiKey }: ConfigurationPanelProps) {
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey && config.provider === 'openai') {
      fetchAvailableModels();
    }
  }, [apiKey, config.provider]);

  const fetchAvailableModels = async () => {
    if (!apiKey) return;
    
    setLoadingModels(true);
    setModelsError(null);
    
    try {
      const response = await fetch('/api/models', {
        headers: {
          'x-api-key': apiKey,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch models');
      }
      
      const data = await response.json();
      setAvailableModels(data.models || []);
      
      // If current model is not in the available models, update to the first available one
      const modelIds = data.models.map((m: { id: string; name: string }) => m.id);
      if (modelIds.length > 0 && !modelIds.includes(config.model)) {
        updateConfig('model', modelIds[0]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModelsError(error instanceof Error ? error.message : 'Failed to fetch models');
      // Fall back to default models
      setAvailableModels([
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const updateConfig = (key: keyof ChunkingConfig, value: string | number) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  const resetToDefaults = () => {
    onConfigChange({
      similarity_threshold: 0.70,
      max_tokens: 400,
      min_tokens: 75,
      chunk_size: 400,
      overlap: 50,
      model: 'gpt-3.5-turbo',
      provider: 'openai'
    });
  };

  const presets = [
    {
      name: 'Focused',
      description: 'Very high similarity, small precise chunks',
      config: {
        similarity_threshold: 0.85,
        max_tokens: 250,
        min_tokens: 100,
        chunk_size: 250,
        overlap: 75
      }
    },
    {
      name: 'Balanced',
      description: 'Moderate settings for most documents',
      config: {
        similarity_threshold: 0.70,
        max_tokens: 400,
        min_tokens: 75,
        chunk_size: 400,
        overlap: 50
      }
    },
    {
      name: 'Contextual',
      description: 'Lower threshold for narrative documents',
      config: {
        similarity_threshold: 0.55,
        max_tokens: 600,
        min_tokens: 50,
        chunk_size: 600,
        overlap: 100
      }
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    onConfigChange({
      ...config,
      ...preset.config
    });
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <Label className="text-base font-medium mb-3 block">Quick Presets</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <Card 
              key={preset.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => !disabled && applyPreset(preset)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.description}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      Sim: {preset.config.similarity_threshold}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Max: {preset.config.max_tokens}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Semantic Chunking Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Semantic Chunking Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="similarity-threshold">Similarity Threshold</Label>
              <Badge variant="outline">{config.similarity_threshold.toFixed(2)}</Badge>
            </div>
            <Slider
              id="similarity-threshold"
              min={0.3}
              max={0.9}
              step={0.05}
              value={[config.similarity_threshold]}
              onValueChange={(value) => updateConfig('similarity_threshold', value[0])}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher values (0.7-0.9) create focused chunks better for Q&A. Lower values (0.5-0.7) preserve more context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Badge variant="outline">{config.max_tokens}</Badge>
              </div>
              <Slider
                id="max-tokens"
                min={100}
                max={1000}
                step={50}
                value={[config.max_tokens]}
                onValueChange={(value) => updateConfig('max_tokens', value[0])}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Maximum tokens per semantic chunk
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="min-tokens">Min Tokens</Label>
                <Badge variant="outline">{config.min_tokens}</Badge>
              </div>
              <Slider
                id="min-tokens"
                min={10}
                max={200}
                step={10}
                value={[config.min_tokens]}
                onValueChange={(value) => updateConfig('min_tokens', value[0])}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Minimum tokens per semantic chunk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Naive Chunking Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Naive Chunking Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="chunk-size">Chunk Size</Label>
                <Badge variant="outline">{config.chunk_size}</Badge>
              </div>
              <Slider
                id="chunk-size"
                min={100}
                max={1000}
                step={50}
                value={[config.chunk_size]}
                onValueChange={(value) => updateConfig('chunk_size', value[0])}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Fixed size for naive chunks (tokens)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="overlap">Overlap</Label>
                <Badge variant="outline">{config.overlap}</Badge>
              </div>
              <Slider
                id="overlap"
                min={0}
                max={200}
                step={25}
                value={[config.overlap]}
                onValueChange={(value) => updateConfig('overlap', value[0])}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Token overlap between consecutive chunks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={config.provider}
                onValueChange={(value) => updateConfig('provider', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="local">Local Model</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="model">Model</Label>
                {config.provider === 'openai' && apiKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchAvailableModels()}
                    disabled={loadingModels}
                    className="h-7 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingModels ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
              <Select
                value={config.model}
                onValueChange={(value) => updateConfig('model', value)}
                disabled={disabled || loadingModels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {config.provider === 'openai' && (
                    <>
                      {availableModels.length > 0 ? (
                        availableModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </>
                      )}
                    </>
                  )}
                  {config.provider === 'anthropic' && (
                    <>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </>
                  )}
                  {config.provider === 'local' && (
                    <>
                      <SelectItem value="llama-2-7b">Llama 2 7B</SelectItem>
                      <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {modelsError && config.provider === 'openai' && (
                <p className="text-xs text-amber-600">
                  Using default models. {modelsError}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Configuration Summary */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Similarity:</span>
              <div className="font-mono">{config.similarity_threshold}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Max Tokens:</span>
              <div className="font-mono">{config.max_tokens}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Chunk Size:</span>
              <div className="font-mono">{config.chunk_size}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Model:</span>
              <div className="font-mono">{config.model}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

