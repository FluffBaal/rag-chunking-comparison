import json
import base64
import io
import PyPDF2

async def handler(request, response):
    """Async handler for PDF text extraction"""
    try:
        # Get request data
        request_data = await request.json()
        
        # Extract PDF data
        pdf_content_base64 = request_data.get('content')
        filename = request_data.get('filename', 'unknown.pdf')
        
        if not pdf_content_base64:
            return response.json({'error': 'No PDF content provided'}, status=400)
        
        # Decode base64 content
        pdf_bytes = base64.b64decode(pdf_content_base64)
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Extract text using PyPDF2
        text = extract_text_from_pdf(pdf_file)
        
        return response.json({
            'success': True,
            'text': text,
            'filename': filename,
            'length': len(text),
            'pages': len(PyPDF2.PdfReader(io.BytesIO(pdf_bytes)).pages)
        })
        
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        import traceback
        traceback.print_exc()
        return response.json({
            'success': False,
            'error': str(e)
        }, status=500)

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF using PyPDF2"""
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        page_text = page.extract_text()
        
        # Clean up the text
        page_text = page_text.replace('\n', ' ')
        page_text = ' '.join(page_text.split())  # Normalize whitespace
        
        text += page_text + "\n\n"
    
    return text.strip()