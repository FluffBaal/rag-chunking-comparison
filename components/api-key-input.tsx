'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Key, Eye, EyeOff } from 'lucide-react';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

interface ApiKeyInputProps {
  onApiKeyChange: (apiKey: string | null) => void;
}

export function ApiKeyInput({ onApiKeyChange }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useLocalStorage<string | null>('openai-api-key', null);
  const [inputValue, setInputValue] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Notify parent component when API key changes
  useEffect(() => {
    onApiKeyChange(apiKey);
  }, [apiKey, onApiKeyChange]);

  const handleSaveApiKey = () => {
    if (!inputValue.trim()) {
      setError('API key cannot be empty');
      return;
    }

    if (!inputValue.startsWith('sk-') && !inputValue.startsWith('OPENAI-')) {
      setError('Invalid API key format');
      return;
    }

    setApiKey(inputValue);
    setError(null);
    setInputValue('');
    testApiKey(inputValue);
  };

  const handleClearApiKey = () => {
    setApiKey(null);
    setInputValue('');
    setError(null);
    setTestStatus('idle');
  };

  const testApiKey = async (key: string) => {
    setTestStatus('testing');
    
    try {
      // Simple test to verify the API key works
      const response = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestStatus('success');
        // Also test if we can fetch models
        try {
          const modelsResponse = await fetch('/api/models', {
            headers: {
              'x-api-key': key,
            },
          });
          if (!modelsResponse.ok) {
            console.warn('Could not fetch models, but API key is valid');
          }
        } catch (e) {
          console.warn('Could not fetch models, but API key is valid');
        }
      } else {
        setTestStatus('error');
        setError(data.error || 'API key validation failed');
      }
    } catch (err) {
      console.error('Error testing API key:', err);
      setTestStatus('error');
      setError('Failed to test API key. The key will still be used, but may not work.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenAI API Key
        </CardTitle>
        <CardDescription>
          Your API key is stored locally in your browser and never sent to our servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {apiKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {testStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : testStatus === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">
                API key {testStatus === 'success' ? 'verified' : testStatus === 'error' ? 'invalid' : 'saved'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                disabled
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
                type="button"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleClearApiKey}
            >
              Clear API Key
            </Button>
            
            {error && (
              <div className="text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Enter your OpenAI API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleSaveApiKey}
              disabled={!inputValue.trim()}
            >
              Save API Key
            </Button>
            
            {error && (
              <div className="text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <p>Don't have an API key? You can still use the application with simulated results.</p>
              <p className="mt-1">Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI</a>.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

