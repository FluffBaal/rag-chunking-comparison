import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num == null || isNaN(num)) return 'N/A'
  return num.toFixed(decimals)
}

export function formatPercentage(num: number | null | undefined, decimals: number = 1): string {
  if (num == null || isNaN(num)) return 'N/A'
  return `${(num * 100).toFixed(decimals)}%`
}

export function safeToFixed(num: number | null | undefined, decimals: number = 2): string {
  if (num == null || isNaN(num)) return 'N/A'
  return num.toFixed(decimals)
}

export function calculateImprovement(baseline: number, improved: number): number {
  if (baseline === 0) return 0
  return ((improved - baseline) / baseline) * 100
}

export function getImprovementColor(improvement: number): string {
  if (improvement > 0) return 'text-green-600 dark:text-green-400'
  if (improvement < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export interface ChunkingConfig {
  similarity_threshold: number
  max_tokens: number
  min_tokens: number
  chunk_size: number
  overlap: number
  model: string
  provider: string
}

export interface RAGASMetrics {
  faithfulness: number
  answer_relevancy: number
  context_precision: number
  context_recall: number
  answer_correctness: number
}

export interface ChunkingQualityMetrics {
  chunk_count: number
  avg_length: number
  length_std: number
  avg_coherence: number
  coherence_std: number
  coverage_ratio: number
}

export interface EvaluationResults {
  ragas: RAGASMetrics
  chunking_quality: ChunkingQualityMetrics
  performance: {
    processing_time: number
    memory_usage: number
  }
  strategy: 'naive' | 'semantic'
  timestamp: string
  chunks?: string[]
  rag_details?: {
    questions: string[]
    answers: string[]
    contexts: string[][]
    ground_truths: string[]
  }
  per_question_metrics?: Array<{
    faithfulness: number
    answer_relevancy: number
    answer_correctness: number
    context_precision: number
    context_recall: number
  }>
}

export interface ComparisonResults {
  naive: EvaluationResults
  semantic: EvaluationResults
  comparison: {
    ragas_improvements: Record<keyof RAGASMetrics, number>
    quality_improvements: Record<keyof ChunkingQualityMetrics, number>
    statistical_significance: Record<string, {
      p_value: number
      significant: boolean
      effect_size: number
    }>
    significance_tests?: Record<string, {
      p_value: number
      significant: boolean
      effect_size: number
    }>
    summary: {
      overall_improvement: number
      significant_metrics: string[]
      significant_count?: number
      total_metrics?: number
      best_improvement?: {
        metric: string
        improvement: number
      }
      worst_improvement?: {
        metric: string
        improvement: number
      }
      recommendation: string
      confidence_level?: string
    }
  }
  test_dataset?: Array<{
    question: string
    ground_truth: string
  }>
}

