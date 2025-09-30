#!/bin/bash

# ♠️🌿🎸🧵 G.MUSIC ASSEMBLY - Production Build & Preview
# Builds and serves the production-optimized version

echo "♠️🌿🎸🧵 G.MUSIC ASSEMBLY - PRODUCTION MODE"
echo "==========================================="
echo ""
echo "📦 Building production bundle..."
echo ""

npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Starting preview server..."
    echo ""
    echo "📱 Access at: http://localhost:4173"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""

    npm run preview
else
    echo ""
    echo "❌ Build failed. Please check errors above."
    exit 1
fi
