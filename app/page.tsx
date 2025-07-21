import { ComparisonDashboard } from '@/components/comparison-dashboard'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">
          Semantic vs Naive Chunking Analysis
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          This research tool demonstrates the impact of different chunking strategies on RAG system performance. 
          Compare semantic chunking (similarity-based) against naive chunking (fixed-size) using comprehensive 
          RAGAS metrics and statistical analysis.
        </p>
      </div>
      
      <ComparisonDashboard />
    </div>
  )
}

