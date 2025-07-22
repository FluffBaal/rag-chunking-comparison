import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

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
    if (error instanceof Error && error.message.includes('No text content')) {
      throw error;
    }
    throw new Error('Failed to extract text from PDF. Please ensure the PDF contains readable text.');
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