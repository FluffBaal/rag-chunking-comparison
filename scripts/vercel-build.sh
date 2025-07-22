#!/bin/bash

echo "=== Building RAG Chunking Comparison ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Run the Next.js build
next build

echo "=== Build complete ===="