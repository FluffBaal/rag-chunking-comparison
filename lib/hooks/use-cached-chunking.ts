import { useState, useCallback } from 'react';
import { chunkCache } from '@/lib/cache/browser-cache';

interface UseCachedChunkingOptions {
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
}

export function useCachedChunking(options?: UseCachedChunkingOptions) {
  const [cacheStats, setCacheStats] = useState<{
    hits: number;
    misses: number;
    lastHit?: string;
  }>({ hits: 0, misses: 0 });

  const performChunking = useCallback(async (
    document: string,
    config: any,
    apiKey?: string
  ) => {
    // Initialize cache
    await chunkCache.init();
    
    try {
      // Check cache for naive chunks
      const cachedNaive = await chunkCache.getCachedChunks(
        document,
        'naive',
        config
      );
      
      // Check cache for semantic chunks
      const cachedSemantic = await chunkCache.getCachedChunks(
        document,
        'semantic',
        { ...config, hasApiKey: !!apiKey }
      );
      
      if (cachedNaive && cachedSemantic) {
        // Cache hit!
        setCacheStats(prev => ({
          hits: prev.hits + 1,
          misses: prev.misses,
          lastHit: new Date().toISOString()
        }));
        
        options?.onCacheHit?.();
        
        // Return cached results
        return {
          success: true,
          results: {
            naive: cachedNaive,
            semantic: cachedSemantic
          },
          metadata: {
            cached: true,
            cacheTimestamp: Date.now()
          }
        };
      }
    } catch (error) {
      console.error('Cache lookup error:', error);
    }
    
    // Cache miss - perform chunking
    setCacheStats(prev => ({
      hits: prev.hits,
      misses: prev.misses + 1,
      lastHit: prev.lastHit
    }));
    
    options?.onCacheMiss?.();
    
    // Call the chunking API
    const response = await fetch('/api/chunking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'x-api-key': apiKey })
      },
      body: JSON.stringify({ document, config })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Cache the results
      try {
        await chunkCache.cacheChunks(
          document,
          result.results.naive,
          'naive',
          config
        );
        
        await chunkCache.cacheChunks(
          document,
          result.results.semantic,
          'semantic',
          { ...config, hasApiKey: !!apiKey }
        );
      } catch (error) {
        console.error('Cache write error:', error);
      }
    }
    
    return result;
  }, [options]);

  const clearCache = useCallback(async () => {
    await chunkCache.clearCache();
    setCacheStats({ hits: 0, misses: 0 });
  }, []);

  const getCacheInfo = useCallback(async () => {
    const stats = await chunkCache.getCacheStats();
    return {
      ...stats,
      hitRate: cacheStats.hits / Math.max(1, cacheStats.hits + cacheStats.misses),
      ...cacheStats
    };
  }, [cacheStats]);

  return {
    performChunking,
    clearCache,
    getCacheInfo,
    cacheStats
  };
}