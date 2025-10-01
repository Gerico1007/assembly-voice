#!/bin/bash
# G.Music Assembly - Environment Setup Script
# This script copies or symlinks .env from home directory to project

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_ENV="$HOME/.env"
PROJECT_ENV="$PROJECT_DIR/.env"

echo "♠️🌿🎸🧵 G.Music Assembly - Environment Setup"
echo "=============================================="
echo ""

# Check if .env already exists in project
if [ -f "$PROJECT_ENV" ] || [ -L "$PROJECT_ENV" ]; then
    echo "✓ .env already exists in project directory"
    echo "  Location: $PROJECT_ENV"

    if [ -L "$PROJECT_ENV" ]; then
        echo "  (Symlink to: $(readlink -f "$PROJECT_ENV"))"
    fi
    echo ""
    echo "To update, delete it first: rm $PROJECT_ENV"
    exit 0
fi

# Check if .env exists in home directory
if [ -f "$HOME_ENV" ]; then
    echo "Found .env in home directory: $HOME_ENV"
    echo ""
    echo "Choose setup method:"
    echo "  1) Symlink (recommended - stays synced with ~/env)"
    echo "  2) Copy (independent copy)"
    echo "  3) Skip (configure manually later)"
    echo ""
    read -p "Enter choice [1-3]: " choice

    case $choice in
        1)
            ln -s "$HOME_ENV" "$PROJECT_ENV"
            echo "✓ Created symlink: $PROJECT_ENV -> $HOME_ENV"
            ;;
        2)
            cp "$HOME_ENV" "$PROJECT_ENV"
            echo "✓ Copied: $HOME_ENV -> $PROJECT_ENV"
            ;;
        3)
            echo "Skipped. You can manually create .env later."
            echo "Use .env.example as a template: cp .env.example .env"
            exit 0
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
else
    echo "No .env found in home directory ($HOME_ENV)"
    echo ""
    echo "Options:"
    echo "  1) Create new .env in project (from .env.example)"
    echo "  2) Create new .env in home directory (then symlink)"
    echo "  3) Skip (configure manually later)"
    echo ""
    read -p "Enter choice [1-3]: " choice

    case $choice in
        1)
            if [ -f "$PROJECT_DIR/.env.example" ]; then
                cp "$PROJECT_DIR/.env.example" "$PROJECT_ENV"
                echo "✓ Created: $PROJECT_ENV (from .env.example)"
                echo ""
                echo "⚠️  Please edit $PROJECT_ENV and add your API key"
            else
                echo "Error: .env.example not found"
                exit 1
            fi
            ;;
        2)
            if [ -f "$PROJECT_DIR/.env.example" ]; then
                cp "$PROJECT_DIR/.env.example" "$HOME_ENV"
                ln -s "$HOME_ENV" "$PROJECT_ENV"
                echo "✓ Created: $HOME_ENV (from .env.example)"
                echo "✓ Created symlink: $PROJECT_ENV -> $HOME_ENV"
                echo ""
                echo "⚠️  Please edit $HOME_ENV and add your API key"
            else
                echo "Error: .env.example not found"
                exit 1
            fi
            ;;
        3)
            echo "Skipped. You can manually create .env later."
            echo "Use .env.example as a template: cp .env.example .env"
            exit 0
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
echo "=============================================="
echo "✓ Environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit your .env file and add your Gemini API key"
echo "     Get one from: https://aistudio.google.com/app/apikey"
echo "  2. Restart the dev server: npm run dev"
echo ""
