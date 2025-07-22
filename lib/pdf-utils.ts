'use client';

import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

// Configure PDF.js worker to avoid "fake worker" warning
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('pdfjs-dist').then((pdfjsLib) => {
    // Use CDN for the worker to avoid build issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }).catch(err => {
    console.warn('Failed to configure PDF.js worker:', err);
  });
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Create a blob from the file
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    
    // Initialize WebPDFLoader with the blob
    const loader = new WebPDFLoader(blob, {
      // Use spaces to separate text elements
      parsedItemSeparator: " ",
      // Split by pages to maintain structure
      splitPages: true,
    });
    
    // Load and parse the PDF
    const docs = await loader.load();
    
    // Combine all pages into a single text string
    const text = docs.map(doc => doc.pageContent).join('\n\n');
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }
    
    return text.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No text content')) {
        throw error;
      }
      if (error.message.includes('decrypt')) {
        throw new Error('This PDF is encrypted and cannot be processed.');
      }
      if (error.message.includes('Invalid PDF')) {
        throw new Error('The file appears to be corrupted or is not a valid PDF.');
      }
    }
    
    throw new Error('Failed to extract text from PDF. Please ensure the PDF contains readable text and is not corrupted.');
  }
}

export function isValidPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}