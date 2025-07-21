'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, File, X } from 'lucide-react';
import { extractTextFromPDF, isValidPDFFile, formatFileSize } from '@/lib/pdf-utils';

interface DocumentUploadProps {
  onDocumentChange: (content: string, metadata?: { title: string; type: string }) => void;
  maxSizeBytes?: number;
}

export function DocumentUpload({ 
  onDocumentChange, 
  maxSizeBytes = 4 * 1024 * 1024 // 4MB default
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);


  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check file size
      if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB limit`);
      }

      let content = '';
      const fileType = file.type;
      
      if (isValidPDFFile(file)) {
        // Extract text from PDF
        content = await extractTextFromPDF(file);
      } else if (fileType === 'text/plain' || fileType === 'text/markdown' || file.name.endsWith('.md')) {
        // Read text files directly
        content = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload PDF, TXT, or MD files.');
      }

      if (!content.trim()) {
        throw new Error('No text content found in the file');
      }

      // Check if extracted text is too large
      const textSizeBytes = new TextEncoder().encode(content).length;
      if (textSizeBytes > maxSizeBytes) {
        throw new Error(`Extracted text exceeds ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB limit`);
      }

      setDocumentText(content);
      setFileName(file.name);
      onDocumentChange(content, {
        title: file.name,
        type: fileType
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDocumentText(text);
    setFileName(null);
    if (text.trim()) {
      onDocumentChange(text, {
        title: 'Pasted Text',
        type: 'text/plain'
      });
    }
  };

  const clearDocument = () => {
    setDocumentText('');
    setFileName(null);
    setError(null);
    onDocumentChange('', undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.txt,.md"
            onChange={handleFileInput}
            disabled={loading}
          />
          
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer font-medium text-primary hover:underline"
              >
                Upload a file
              </label>
              {' '}or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, TXT, or MD files up to {formatFileSize(maxSizeBytes)}
            </p>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">Processing file...</p>
              </div>
            </div>
          )}
        </div>

        {/* Current File Display */}
        {fileName && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4" />
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-muted-foreground">
                ({(documentText.length / 1000).toFixed(1)}k chars)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDocument}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Text Input Area */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Or paste your text directly:
          </label>
          <Textarea
            placeholder="Paste your document text here..."
            className="min-h-[200px] font-mono text-sm"
            value={documentText}
            onChange={handleTextareaChange}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            {documentText.length} characters • {documentText.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        {/* Sample Documents */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Or try a sample document:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sampleText = `Machine learning is a subset of artificial intelligence...`; // Add full sample
                setDocumentText(sampleText);
                setFileName('ML Fundamentals (Sample)');
                onDocumentChange(sampleText, {
                  title: 'ML Fundamentals',
                  type: 'text/plain'
                });
              }}
            >
              ML Fundamentals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sampleText = `The history of computer science...`; // Add another sample
                setDocumentText(sampleText);
                setFileName('CS History (Sample)');
                onDocumentChange(sampleText, {
                  title: 'CS History',
                  type: 'text/plain'
                });
              }}
            >
              CS History
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}