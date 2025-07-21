'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MetricsChart } from './metrics-chart';
import { ChunkVisualizer } from './chunk-visualizer';
import { StatisticalSummary } from './statistical-summary';
import { ConfigurationPanel } from './configuration-panel';
import { ApiKeyInput } from './api-key-input';
import { LoadingSpinner } from './loading-spinner';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { ComparisonResults, ChunkingConfig } from '@/lib/utils';
import { DocumentUpload } from './document-upload';

export function ComparisonDashboard() {
  const [results, setResults] = useState<ComparisonResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentMetadata, setDocumentMetadata] = useState<{ title: string; type: string } | null>(null);
  const [config, setConfig] = useState<ChunkingConfig>({
    similarity_threshold: 0.60,
    max_tokens: 400,
    min_tokens: 50,
    chunk_size: 400,
    overlap: 50,
    model: 'gpt-3.5-turbo',
    provider: 'openai'
  });

  const runComparison = async () => {
    // Validate that we have a document
    if (!documentContent && !apiKey) {
      setError('Please upload a document or provide an API key to use the default sample document.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);
    
    try {
      // Step 1: Chunking
      setCurrentStep('Processing document with both chunking strategies...');
      setProgress(10);
      
      const chunkingResponse = await fetch('/api/chunking', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({ 
          config,
          document: documentContent ? {
            content: documentContent,
            title: documentMetadata?.title || 'Uploaded Document',
            type: documentMetadata?.type || 'text/plain'
          } : null
        })
      });

      if (!chunkingResponse.ok) {
        throw new Error(`Chunking failed: ${chunkingResponse.statusText}`);
      }

      const chunkingData = await chunkingResponse.json();
      
      if (!chunkingData.success) {
        throw new Error(chunkingData.error || 'Chunking failed');
      }

      setProgress(40);
      setCurrentStep('Running RAGAS evaluation...');

      // Step 2: Evaluation
      const evaluationResponse = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({ 
          results: chunkingData.results,
          config 
        })
      });

      if (!evaluationResponse.ok) {
        throw new Error(`Evaluation failed: ${evaluationResponse.statusText}`);
      }

      const evaluationData = await evaluationResponse.json();
      
      if (!evaluationData.success) {
        throw new Error(evaluationData.error || 'Evaluation failed');
      }

      setProgress(70);
      setCurrentStep('Performing statistical analysis...');

      // Step 3: Analysis
      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({ 
          results: evaluationData.results
        })
      });

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();
      
      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      setProgress(100);
      setCurrentStep('Analysis complete!');

      // Combine all results
      const finalResults: ComparisonResults = {
        naive: evaluationData.results.naive,
        semantic: evaluationData.results.semantic,
        comparison: analysisData.analysis
      };

      setResults(finalResults);

    } catch (error) {
      console.error('Comparison error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const getOverallStatus = () => {
    if (!results) return null;
    
    const improvement = results.comparison.summary.overall_improvement;
    const significantCount = results.comparison.summary.significant_count;
    
    if (improvement > 10 && significantCount >= 3) {
      return { type: 'success', icon: CheckCircle, message: 'Semantic chunking significantly outperforms naive chunking' };
    } else if (improvement > 5 && significantCount >= 2) {
      return { type: 'moderate', icon: TrendingUp, message: 'Semantic chunking shows meaningful improvements' };
    } else if (improvement > 0) {
      return { type: 'slight', icon: TrendingUp, message: 'Semantic chunking shows minor improvements' };
    } else if (improvement > -5) {
      return { type: 'neutral', icon: Zap, message: 'Both strategies perform similarly' };
    } else {
      return { type: 'worse', icon: TrendingDown, message: 'Naive chunking performs better' };
    }
  };

  const handleApiKeyChange = (key: string | null) => {
    setApiKey(key);
  };

  const status = getOverallStatus();

  const handleDocumentChange = (content: string, metadata?: { title: string; type: string }) => {
    setDocumentContent(content);
    setDocumentMetadata(metadata || null);
    // Clear previous results when document changes
    setResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* API Key Input */}
      <ApiKeyInput onApiKeyChange={handleApiKeyChange} />

      {/* Document Upload */}
      <DocumentUpload onDocumentChange={handleDocumentChange} />

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Experiment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigurationPanel 
            config={config} 
            onConfigChange={setConfig}
            disabled={isRunning}
            apiKey={apiKey}
          />
          <div className="mt-4">
            <Button 
              onClick={runComparison} 
              disabled={isRunning || (!documentContent && !apiKey)}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isRunning ? 'Running Analysis...' : 'Run Chunking Comparison'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Processing...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="flex items-center gap-2">
              <LoadingSpinner />
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <>
          {/* Overall Status */}
          {status && (
            <Card className={`border-2 ${
              status.type === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' :
              status.type === 'moderate' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' :
              status.type === 'slight' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20' :
              status.type === 'neutral' ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/20' :
              'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <status.icon className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{status.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Overall Improvement: {results.comparison.summary.overall_improvement.toFixed(1)}%
                  </Badge>
                  <Badge variant="outline">
                    Significant Metrics: {results.comparison.summary.significant_count}/{results.comparison.summary.total_metrics}
                  </Badge>
                  <Badge variant="outline">
                    Confidence: {results.comparison.summary.confidence_level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Results Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="chunks">Chunks</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Naive Chunking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Chunks:</span>
                      <span className="font-mono">{results.naive.chunking_quality.chunk_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Length:</span>
                      <span className="font-mono">{results.naive.chunking_quality.avg_length.toFixed(0)} chars</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coherence:</span>
                      <span className="font-mono">{results.naive.chunking_quality.avg_coherence.toFixed(3)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Semantic Chunking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Chunks:</span>
                      <span className="font-mono">{results.semantic.chunking_quality.chunk_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Length:</span>
                      <span className="font-mono">{results.semantic.chunking_quality.avg_length.toFixed(0)} chars</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coherence:</span>
                      <span className="font-mono">{results.semantic.chunking_quality.avg_coherence.toFixed(3)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <StatisticalSummary comparison={results.comparison} />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <MetricsChart 
                naive={results.naive.ragas}
                semantic={results.semantic.ragas}
                improvements={results.comparison.ragas_improvements}
              />
            </TabsContent>

            <TabsContent value="chunks" className="space-y-4">
              <ChunkVisualizer 
                naiveChunks={results.naive.chunks || []}
                semanticChunks={results.semantic.chunks || []}
              />
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistical Significance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(results.comparison.significance_tests).map(([metric, test]) => (
                        <div key={metric} className="flex items-center justify-between">
                          <span className="capitalize">{metric.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={test.significant ? 'success' : 'outline'}>
                              p = {test.p_value.toFixed(3)}
                            </Badge>
                            <Badge variant="outline">
                              d = {test.effect_size.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">
                      {results.comparison.summary.recommendation}
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Best Metric:</span>
                        <span className="font-medium">
                          {results.comparison.summary.best_improvement.metric} 
                          (+{results.comparison.summary.best_improvement.improvement.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Worst Metric:</span>
                        <span className="font-medium">
                          {results.comparison.summary.worst_improvement.metric} 
                          ({results.comparison.summary.worst_improvement.improvement.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

