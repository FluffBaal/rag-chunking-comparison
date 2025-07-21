#!/usr/bin/env python3
"""
Development server for running Python API endpoints locally.
This simulates Vercel's serverless function environment.
"""

import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import importlib.util

class APIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
        self.end_headers()

    def do_POST(self):
        # Parse the path
        path = urlparse(self.path).path
        
        # Map paths to Python files
        route_map = {
            '/api/chunking': 'api/chunking.py',
            '/api/evaluation': 'api/evaluation.py',
            '/api/analysis': 'api/analysis.py'
        }
        
        if path not in route_map:
            self.send_error(404, 'Not Found')
            return
        
        try:
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            
            # Load the Python module
            module_path = route_map[path]
            spec = importlib.util.spec_from_file_location("handler", module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Create a mock request object
            class MockRequest:
                def __init__(self, body, headers):
                    self.body = body
                    self.headers = headers
                
                async def json(self):
                    return json.loads(self.body)
            
            # Create a mock response object
            class MockResponse:
                def __init__(self):
                    self.status_code = 200
                    self.headers = {}
                    self._json_data = None
                    self._text_data = None
                
                def json(self, data, status=200):
                    self.status_code = status
                    self._json_data = data
                    return self
            
            # Call the handler
            request = MockRequest(body, dict(self.headers))
            response = MockResponse()
            
            # Execute the handler
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(module.handler(request, response))
            
            # Send the response
            self.send_response(response.status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if response._json_data:
                self.wfile.write(json.dumps(response._json_data).encode())
            
        except Exception as e:
            print(f"Error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def log_message(self, format, *args):
        # Override to reduce noise
        if '/api/' in args[0]:
            print(f"{self.address_string()} - {args[0]}")

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, APIHandler)
    print(f"Python API server running on http://localhost:{port}")
    print("Available endpoints:")
    print("  POST http://localhost:8000/api/chunking")
    print("  POST http://localhost:8000/api/evaluation") 
    print("  POST http://localhost:8000/api/analysis")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)