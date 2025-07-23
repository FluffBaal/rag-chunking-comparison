/**
 * Browser-based caching using IndexedDB
 * Caches chunking results to avoid reprocessing documents
 */

interface CachedChunks {
  id: string;
  chunks: any[];
  strategy: string;
  config: any;
  timestamp: number;
  documentHash: string;
}

export class ChunkCache {
  private dbName = 'rag-chunk-cache';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initialized = false;
  private cacheExpiry = 3600000; // 1 hour in milliseconds

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.db = await this.openDB();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunksStore.createIndex('documentHash', 'documentHash', { unique: false });
          chunksStore.createIndex('strategy', 'strategy', { unique: false });
          chunksStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'hash' });
        }
      };
    });
  }

  /**
   * Generate a hash for the document content
   */
  private async hashDocument(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a cache key from document hash, strategy, and config
   */
  private getCacheKey(documentHash: string, strategy: string, config: any): string {
    const configStr = JSON.stringify(config, Object.keys(config).sort());
    return `${documentHash}-${strategy}-${configStr}`;
  }

  /**
   * Cache chunks for a document
   */
  async cacheChunks(
    document: string,
    chunks: any[],
    strategy: string,
    config: any
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const documentHash = await this.hashDocument(document);
      const cacheKey = this.getCacheKey(documentHash, strategy, config);
      
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      
      const cachedData: CachedChunks = {
        id: cacheKey,
        chunks,
        strategy,
        config,
        timestamp: Date.now(),
        documentHash
      };
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(cachedData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Clean up old entries
      await this.cleanupOldEntries();
    } catch (error) {
      console.error('Error caching chunks:', error);
    }
  }

  /**
   * Retrieve cached chunks if they exist and are not expired
   */
  async getCachedChunks(
    document: string,
    strategy: string,
    config: any
  ): Promise<any[] | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const documentHash = await this.hashDocument(document);
      const cacheKey = this.getCacheKey(documentHash, strategy, config);
      
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      
      const result = await new Promise<CachedChunks | undefined>((resolve, reject) => {
        const request = store.get(cacheKey);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!result) return null;
      
      // Check if cache is expired
      if (Date.now() - result.timestamp > this.cacheExpiry) {
        await this.deleteCacheEntry(cacheKey);
        return null;
      }
      
      return result.chunks;
    } catch (error) {
      console.error('Error retrieving cached chunks:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Delete a specific cache entry
   */
  private async deleteCacheEntry(id: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting cache entry:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const index = store.index('timestamp');
      
      const cutoffTime = Date.now() - this.cacheExpiry;
      const range = IDBKeyRange.upperBound(cutoffTime);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Error cleaning up old entries:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    if (!this.db) await this.init();
    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    try {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      
      const countRequest = store.count();
      const totalEntries = await new Promise<number>((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });
      
      // Get all entries to calculate size and find oldest/newest
      const getAllRequest = store.getAll();
      const allEntries = await new Promise<CachedChunks[]>((resolve, reject) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
      
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;
      
      allEntries.forEach(entry => {
        // Rough size estimation
        totalSize += JSON.stringify(entry).length;
        
        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }
        if (!newestEntry || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }
      });
      
      return {
        totalEntries,
        totalSize,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
}

// Export singleton instance
export const chunkCache = new ChunkCache();