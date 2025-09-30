#!/bin/bash

echo "♠️🌿🎸🧵 G.MUSIC ASSEMBLY SERVER STARTUP"
echo ""

# Check if SSL certificates exist
if [ ! -f "ssl/server.key" ] || [ ! -f "ssl/server.cert" ]; then
    echo "🔐 SSL certificates not found. Generating..."
    node generate-certs.js
    echo ""
fi

# Function to check if port is in use
check_port() {
    netstat -tuln 2>/dev/null | grep -q ":$1 " || ss -tuln 2>/dev/null | grep -q ":$1 "
    return $?
}

# Find available port starting from 3000
PORT=3000
while check_port $PORT; do
    echo "⚠️  Port $PORT is already in use"
    PORT=$((PORT + 1))
    if [ $PORT -gt 3010 ]; then
        echo "❌ No available ports found between 3000-3010"
        exit 1
    fi
done

echo "🚀 Starting server on port $PORT..."
echo ""

# Start the server
PORT=$PORT npm start