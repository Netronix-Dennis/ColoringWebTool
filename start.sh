#!/bin/bash
# Simple script to start a local server for the Coloring Web Tool
# This bypasses browser security restrictions on file:// protocol

PORT=8000

echo "Starting Local Server for Coloring Studio..."
echo "http://localhost:$PORT"

if command -v python3 &>/dev/null; then
    python3 -m http.server $PORT
elif command -v python &>/dev/null; then
    python -m http.server $PORT
else
    echo "Python not found. Please install Python or use a web server of your choice."
    exit 1
fi
