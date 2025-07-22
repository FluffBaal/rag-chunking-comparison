'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface StatisticalSummaryProps {
  comparison: {
    summary: {
      overall_improvement: number;
      significant_metrics: string[];
      significant_count: number;
      total_metrics: number;
      best_improvement: {
        metric: string;
        improvement: number;
      };
      worst_improvement: {
        metric: string;
        improvement: number;
      };
      recommendation: string;
      confidence_level: string;
    };
    significance_tests: Record<string, {
      p_value: number;
      significant: boolean;
      effect_size: number;
    }>;
  };
}

export function StatisticalSummary({ comparison }: StatisticalSummaryProps) {
  const { summary, significance_tests } = comparison;

  const getConfidenceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'very high': return 'success';
      case 'high': return 'default';
      case 'moderate': return 'warning';
      case 'low': return 'destructive';
      case 'very low': return 'outline';
      default: return 'outline';
    }
  };

  const getRecommendationIcon = () => {
    if (summary.overall_improvement > 10) return CheckCircle;
    if (summary.overall_improvement > 0) return TrendingUp;
    if (summary.overall_improvement > -5) return Info;
    return AlertTriangle;
  };

  const RecommendationIcon = getRecommendationIcon();

  const getEffectSizeInterpretation = (effectSize: number) => {
    const abs = Math.abs(effectSize);
    if (abs < 0.2) return { label: 'Negligible', color: 'outline' };
    if (abs < 0.5) return { label: 'Small', color: 'default' };
    if (abs < 0.8) return { label: 'Medium', color: 'warning' };
    return { label: 'Large', color: 'success' };
  };

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RecommendationIcon className="h-5 w-5" />
            Statistical Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {summary.overall_improvement > 0 ? '+' : ''}{summary.overall_improvement.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Improvement</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {summary.significant_count}/{summary.total_metrics}
              </div>
              <div className="text-sm text-muted-foreground">Significant Metrics</div>
            </div>
            
            <div className="text-center">
              <Badge variant={getConfidenceColor(summary.confidence_level) as any} className="text-sm">
                {summary.confidence_level} Confidence
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Statistical Significance</span>
              <span>{Math.round((summary.significant_count / summary.total_metrics) * 100)}%</span>
            </div>
            <Progress 
              value={(summary.significant_count / summary.total_metrics) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Best Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold capitalize">
                {summary.best_improvement.metric.replace('_', ' ')}
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{summary.best_improvement.improvement.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                This metric showed the strongest improvement with semantic chunking
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              Worst Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold capitalize">
                {summary.worst_improvement.metric.replace('_', ' ')}
              </div>
              <div className="text-2xl font-bold text-red-600">
                {summary.worst_improvement.improvement.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                This metric showed the least improvement or declined
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistical Tests Details */}
      <Card>
        <CardHeader>
          <CardTitle>Statistical Significance Tests</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            These tests determine if the performance differences between chunking strategies are meaningful or just due to random chance.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(significance_tests).map(([metric, test]) => {
              const effectSize = getEffectSizeInterpretation(test.effect_size);
              
              // Generate human-readable explanation based on the results
              const getExplanation = () => {
                if (test.significant) {
                  if (test.effect_size > 0) {
                    return `Semantic chunking performs measurably better for ${metric.replace('_', ' ')}. This improvement is statistically reliable.`;
                  } else {
                    return `Naive chunking actually performs better for ${metric.replace('_', ' ')}. This difference is statistically reliable.`;
                  }
                } else {
                  return `The performance difference for ${metric.replace('_', ' ')} could be due to random variation. More data needed.`;
                }
              };
              
              return (
                <div key={metric} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {metric.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        p-value: {test.p_value.toFixed(4)} | Effect size: {test.effect_size.toFixed(3)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={effectSize.color as any}>
                        {effectSize.label} Effect
                      </Badge>
                      <Badge variant={test.significant ? 'success' : 'outline'}>
                        {test.significant ? 'Significant' : 'Not Significant'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground italic">
                    {getExplanation()}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Understanding the Results:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <strong>P-value:</strong> The probability of seeing this difference by chance. 
                Values below 0.05 (5%) indicate the difference is likely real, not random.
              </div>
              <div>
                <strong>Effect Size:</strong> How big the difference is in practical terms:
                <ul className="ml-4 mt-1">
                  <li>• Negligible (&lt; 0.2): Tiny difference, likely not noticeable</li>
                  <li>• Small (0.2-0.5): Minor improvement</li>
                  <li>• Medium (0.5-0.8): Moderate improvement, worth considering</li>
                  <li>• Large (&gt; 0.8): Substantial improvement, highly recommended</li>
                </ul>
              </div>
              <div>
                <strong>Significant vs Not Significant:</strong> "Significant" means we're confident the difference is real. 
                "Not Significant" means we can't rule out random chance.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RecommendationIcon className="h-5 w-5" />
            Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed mb-4">
            {summary.recommendation}
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium">Key Findings:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• {summary.significant_count} out of {summary.total_metrics} metrics showed statistically significant improvements</li>
              <li>• Overall performance improvement of {summary.overall_improvement.toFixed(1)}%</li>
              <li>• Confidence level: {summary.confidence_level}</li>
              <li>• Best performing metric: {summary.best_improvement.metric.replace('_', ' ')} (+{summary.best_improvement.improvement.toFixed(1)}%)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

