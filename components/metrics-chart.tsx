'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { RAGASMetrics } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsChartProps {
  naive: RAGASMetrics;
  semantic: RAGASMetrics;
  improvements: Record<keyof RAGASMetrics, number>;
}

export function MetricsChart({ naive, semantic, improvements }: MetricsChartProps) {
  // Filter out metrics where both values are very small (< 0.01)
  const significantMetrics = Object.keys(naive).filter(metric => {
    const naiveValue = naive[metric as keyof RAGASMetrics];
    const semanticValue = semantic[metric as keyof RAGASMetrics];
    return Math.max(naiveValue, semanticValue) > 0.01;
  });

  // Prepare data for bar chart
  const barData = significantMetrics.map(metric => ({
    metric: metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    naive: naive[metric as keyof RAGASMetrics],
    semantic: semantic[metric as keyof RAGASMetrics],
    improvement: improvements[metric as keyof RAGASMetrics]
  }));

  // Prepare data for radar chart
  const radarData = significantMetrics.map(metric => ({
    metric: metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    naive: naive[metric as keyof RAGASMetrics] * 100, // Convert to percentage for better visualization
    semantic: semantic[metric as keyof RAGASMetrics] * 100
  }));

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 1) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (improvement < -1) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement > 5) return 'success';
    if (improvement > 1) return 'default';
    if (improvement < -1) return 'destructive';
    return 'outline';
  };

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'naive' ? 'Naive' : 'Semantic'}: {entry.value.toFixed(3)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const RadarTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'naive' ? 'Naive' : 'Semantic'}: {(entry.value / 100).toFixed(3)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const filteredCount = Object.keys(naive).length - significantMetrics.length;

  return (
    <div className="space-y-6">
      {/* Improvement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>RAGAS Metrics Improvements</CardTitle>
          {filteredCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {filteredCount} metric{filteredCount > 1 ? 's' : ''} with near-zero values hidden
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {barData.map((item) => (
              <div key={item.metric} className="text-center space-y-2">
                <div className="text-sm font-medium">{item.metric}</div>
                <div className="flex items-center justify-center gap-1">
                  {getImprovementIcon(item.improvement)}
                  <Badge variant={getImprovementColor(item.improvement) as 'success' | 'default' | 'destructive' | 'outline'}>
                    {item.improvement > 0 ? '+' : ''}{item.improvement.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.naive.toFixed(3)} → {item.semantic.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="metric" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, 1]}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="naive" 
                  fill="#f97316" 
                  name="Naive Chunking"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="semantic" 
                  fill="#3b82f6" 
                  name="Semantic Chunking"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="metric" 
                  fontSize={12}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  fontSize={10}
                />
                <Radar
                  name="Naive Chunking"
                  dataKey="naive"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar
                  name="Semantic Chunking"
                  dataKey="semantic"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Tooltip content={<RadarTooltip />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-right py-2">Naive</th>
                  <th className="text-right py-2">Semantic</th>
                  <th className="text-right py-2">Improvement</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((item) => (
                  <tr key={item.metric} className="border-b">
                    <td className="py-2 font-medium">{item.metric}</td>
                    <td className="text-right py-2 font-mono">{item.naive.toFixed(4)}</td>
                    <td className="text-right py-2 font-mono">{item.semantic.toFixed(4)}</td>
                    <td className="text-right py-2 font-mono">
                      <span className={
                        item.improvement > 0 ? 'text-green-600' : 
                        item.improvement < 0 ? 'text-red-600' : 'text-gray-600'
                      }>
                        {item.improvement > 0 ? '+' : ''}{item.improvement.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-2">
                      {getImprovementIcon(item.improvement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

