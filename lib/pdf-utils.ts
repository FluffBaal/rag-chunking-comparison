'use client';

import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

// Store worker configuration state
let workerConfigured = false;

// Configure PDF.js worker to avoid "fake worker" warning
async function configurePdfWorker() {
  if (workerConfigured || typeof window === 'undefined') {
    return;
  }
  
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Use specific version to ensure compatibility
    const version = pdfjsLib.version || '3.11.174';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
    workerConfigured = true;
  } catch (err) {
    console.error('Failed to configure PDF.js worker:', err);
    // Worker will fall back to fake worker mode, but PDF parsing will still work
  }
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Ensure worker is configured before processing PDF
    await configurePdfWorker();
    
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