#!/usr/bin/env python3
"""
Simple development server for Python API endpoints.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add API directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Import the handlers
from chunking import handler as chunking_handler
from evaluation import handler as evaluation_handler  
from analysis import handler as analysis_handler
try:
    from extract_pdf import handler as extract_pdf_handler
except ImportError:
    # Use underscore instead of hyphen
    from extract_pdf import handler as extract_pdf_handler

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class MockRequest:
    def __init__(self, json_data, headers):
        self._json = json_data
        self.headers = headers
    
    async def json(self):
        return self._json

class MockResponse:
    def __init__(self):
        self._json_data = None
        self._status = 200
        self.headers = {}
    
    def json(self, data, status=200):
        self._json_data = data
        self._status = status
        return self

@app.route('/api/chunking', methods=['POST', 'OPTIONS'])
def chunking():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        req = MockRequest(request.json, dict(request.headers))
        res = MockResponse()
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(chunking_handler(req, res))
        return jsonify(res._json_data), res._status
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/evaluation', methods=['POST', 'OPTIONS'])
def evaluation():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        req = MockRequest(request.json, dict(request.headers))
        res = MockResponse()
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(evaluation_handler(req, res))
        return jsonify(res._json_data), res._status
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis', methods=['POST', 'OPTIONS'])
def analysis():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        req = MockRequest(request.json, dict(request.headers))
        res = MockResponse()
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(analysis_handler(req, res))
        return jsonify(res._json_data), res._status
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-pdf', methods=['POST', 'OPTIONS'])
def extract_pdf():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        req = MockRequest(request.json, dict(request.headers))
        res = MockResponse()
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(extract_pdf_handler(req, res))
        return jsonify(res._json_data), res._status
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return jsonify({
        'status': 'Python API server running',
        'endpoints': [
            'POST /api/chunking',
            'POST /api/evaluation',
            'POST /api/analysis'
        ]
    })

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    print(f"Starting Python API server on http://localhost:{port}")
    print("Available endpoints:")
    print("  POST http://localhost:{port}/api/chunking")
    print("  POST http://localhost:{port}/api/evaluation") 
    print("  POST http://localhost:{port}/api/analysis")
    
    # Use Flask's built-in async support
    app.run(host='0.0.0.0', port=port, debug=True)