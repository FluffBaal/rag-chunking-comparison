'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Sparkles, Code, FileText, AlertCircle } from 'lucide-react';

interface TestGenerationInfoProps {
  hasApiKey: boolean;
  documentUploaded: boolean;
}

export function TestGenerationInfo({ hasApiKey, documentUploaded }: TestGenerationInfoProps) {
  const methods = [
    {
      name: 'LLM-Generated Questions',
      icon: Sparkles,
      available: hasApiKey && documentUploaded,
      description: 'Uses GPT to create sophisticated test questions including multi-hop reasoning, synthesis, and context-aware questions.',
      quality: 'Highest',
      requirements: 'Requires OpenAI API key'
    },
    {
      name: 'Advanced Rule-Based',
      icon: Code,
      available: documentUploaded,
      description: 'Extracts comparisons, cause-effects, statistics, and numbered lists to create meaningful questions.',
      quality: 'Good',
      requirements: 'No API key needed'
    },
    {
      name: 'Basic Pattern Matching',
      icon: FileText,
      available: documentUploaded,
      description: 'Simple extraction of definitions and facts for basic question generation.',
      quality: 'Basic',
      requirements: 'Fallback option'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Test Question Generation Methods
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {methods.map((method) => {
            const Icon = method.icon;
            return (
              <div
                key={method.name}
                className={`p-3 border rounded-lg space-y-2 ${
                  method.available ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{method.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={method.quality === 'Highest' ? 'default' : 
                                  method.quality === 'Good' ? 'secondary' : 'outline'}>
                      {method.quality} Quality
                    </Badge>
                    {method.available ? (
                      <Badge variant="success" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Unavailable</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {method.requirements}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Better Questions = Better Evaluation</p>
              <p className="text-muted-foreground">
                High-quality test questions that require multi-hop reasoning and context understanding 
                provide more meaningful evaluation of chunking strategies.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}