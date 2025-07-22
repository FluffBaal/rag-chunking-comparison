import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RAG Chunking Comparison',
  description: 'Compare semantic vs naive chunking strategies for RAG systems',
  keywords: ['RAG', 'chunking', 'semantic', 'machine learning', 'NLP'],
  authors: [{ name: 'RAG Research Team' }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'RAG Chunking Comparison',
    description: 'Compare semantic vs naive chunking strategies for RAG systems',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-primary">
                RAG Chunking Comparison
              </h1>
              <p className="text-muted-foreground">
                Research tool comparing semantic vs naive chunking strategies
              </p>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t mt-16">
            <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
              <p>© 2025 RAG Chunking Comparison. Built with Next.js 15 and Vercel.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

