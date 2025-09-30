#!/bin/bash

# ♠️🌿🎸🧵 G.MUSIC ASSEMBLY - Mobile HTTPS Server
# Starts Express HTTPS server for mobile device testing
# Required for voice features on mobile (needs HTTPS)

echo "♠️🌿🎸🧵 G.MUSIC ASSEMBLY - MOBILE MODE"
echo "========================================"
echo ""

# Check if SSL certificates exist
if [ ! -f "ssl/server.key" ] || [ ! -f "ssl/server.cert" ]; then
    echo "🔐 SSL certificates not found. Generating..."
    node generate-certs.js
    echo ""
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo "📦 Production build not found. Building..."
    npm run build
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

# Get local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d: -f2)
fi

echo "🚀 Starting HTTPS server on port $PORT..."
echo ""
echo "📱 **Access from your Android phone:**"
echo "   https://$LOCAL_IP:$PORT"
echo ""
echo "⚠️  **Important:**"
echo "   1. Ensure phone and computer are on same WiFi"
echo "   2. Accept the security warning (self-signed cert)"
echo "   3. Grant microphone permissions when prompted"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the HTTPS server
PORT=$PORT npm run server
