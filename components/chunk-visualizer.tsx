'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, FileText } from 'lucide-react';

interface ChunkVisualizerProps {
  naiveChunks: string[];
  semanticChunks: string[];
}

export function ChunkVisualizer({ naiveChunks, semanticChunks }: ChunkVisualizerProps) {
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<{type: 'naive' | 'semantic', index: number} | null>(null);

  const getChunkStats = (chunks: string[]) => {
    const lengths = chunks.map(chunk => chunk.length);
    const wordCounts = chunks.map(chunk => chunk.split(/\s+/).length);
    
    return {
      count: chunks.length,
      avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      avgWords: wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length,
      totalWords: wordCounts.reduce((a, b) => a + b, 0)
    };
  };

  const naiveStats = getChunkStats(naiveChunks);
  const semanticStats = getChunkStats(semanticChunks);

  const renderChunks = (chunks: string[], type: 'naive' | 'semantic') => {
    const colorClass = type === 'naive' ? 'chunk-naive' : 'chunk-semantic';
    
    return (
      <div className="space-y-2">
        {chunks.map((chunk, index) => (
          <div
            key={index}
            className={`${colorClass} cursor-pointer transition-all hover:shadow-md ${
              selectedChunk?.type === type && selectedChunk?.index === index 
                ? 'ring-2 ring-primary' 
                : ''
            }`}
            onClick={() => setSelectedChunk({type, index})}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                Chunk {index + 1}
              </Badge>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{chunk.length} chars</span>
                <span>{chunk.split(/\s+/).length} words</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              {chunk.length > 300 ? `${chunk.substring(0, 300)}...` : chunk}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderSideBySide = () => {
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            Naive Chunking ({naiveChunks.length} chunks)
          </h3>
          <ScrollArea className="h-96">
            {renderChunks(naiveChunks, 'naive')}
          </ScrollArea>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            Semantic Chunking ({semanticChunks.length} chunks)
          </h3>
          <ScrollArea className="h-96">
            {renderChunks(semanticChunks, 'semantic')}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              Naive Chunking Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Chunks:</span>
              <span className="font-mono">{naiveStats.count}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Length:</span>
              <span className="font-mono">{naiveStats.avgLength.toFixed(0)} chars</span>
            </div>
            <div className="flex justify-between">
              <span>Length Range:</span>
              <span className="font-mono">{naiveStats.minLength} - {naiveStats.maxLength}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Words:</span>
              <span className="font-mono">{naiveStats.avgWords.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Words:</span>
              <span className="font-mono">{naiveStats.totalWords}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              Semantic Chunking Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Chunks:</span>
              <span className="font-mono">{semanticStats.count}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Length:</span>
              <span className="font-mono">{semanticStats.avgLength.toFixed(0)} chars</span>
            </div>
            <div className="flex justify-between">
              <span>Length Range:</span>
              <span className="font-mono">{semanticStats.minLength} - {semanticStats.maxLength}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Words:</span>
              <span className="font-mono">{semanticStats.avgWords.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Words:</span>
              <span className="font-mono">{semanticStats.totalWords}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Chunk Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant={showBoundaries ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBoundaries(!showBoundaries)}
            >
              {showBoundaries ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {showBoundaries ? 'Hide' : 'Show'} Boundaries
            </Button>
            
            {selectedChunk && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChunk(null)}
              >
                Clear Selection
              </Button>
            )}
          </div>

          <Tabs defaultValue="side-by-side" className="w-full">
            <TabsList>
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="naive">Naive Only</TabsTrigger>
              <TabsTrigger value="semantic">Semantic Only</TabsTrigger>
            </TabsList>

            <TabsContent value="side-by-side" className="mt-4">
              {renderSideBySide()}
            </TabsContent>

            <TabsContent value="naive" className="mt-4">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  Naive Chunking ({naiveChunks.length} chunks)
                </h3>
                <ScrollArea className="h-96">
                  {renderChunks(naiveChunks, 'naive')}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="semantic" className="mt-4">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  Semantic Chunking ({semanticChunks.length} chunks)
                </h3>
                <ScrollArea className="h-96">
                  {renderChunks(semanticChunks, 'semantic')}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Chunk Details */}
      {selectedChunk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Chunk Details: {selectedChunk.type === 'naive' ? 'Naive' : 'Semantic'} #{selectedChunk.index + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Length:</span>
                  <div className="font-mono">
                    {selectedChunk.type === 'naive' 
                      ? naiveChunks[selectedChunk.index].length 
                      : semanticChunks[selectedChunk.index].length} chars
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Words:</span>
                  <div className="font-mono">
                    {selectedChunk.type === 'naive' 
                      ? naiveChunks[selectedChunk.index].split(/\s+/).length
                      : semanticChunks[selectedChunk.index].split(/\s+/).length}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Sentences:</span>
                  <div className="font-mono">
                    {selectedChunk.type === 'naive' 
                      ? naiveChunks[selectedChunk.index].split(/[.!?]+/).filter(s => s.trim()).length
                      : semanticChunks[selectedChunk.index].split(/[.!?]+/).filter(s => s.trim()).length}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <div className="capitalize">{selectedChunk.type}</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Full Content:</h4>
                <ScrollArea className="h-40 w-full rounded border p-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedChunk.type === 'naive' 
                      ? naiveChunks[selectedChunk.index]
                      : semanticChunks[selectedChunk.index]}
                  </p>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

