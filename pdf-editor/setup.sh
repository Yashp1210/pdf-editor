#!/bin/bash

# PDF Editor - Automated Setup Script
# This script will set up and run your PDF editor

echo "🚀 PDF Editor - Automated Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📥 Please install Node.js from: https://nodejs.org"
    echo ""
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  Node.js version is too old (need v16+)"
    echo "📥 Please upgrade from: https://nodejs.org"
    echo ""
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
echo "   (This may take 2-3 minutes)"
echo ""

npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "🎯 What would you like to do?"
    echo ""
    echo "1. Start development server (recommended for testing)"
    echo "2. Build for production"
    echo "3. Exit and run manually"
    echo ""
    read -p "Enter choice (1-3): " choice

    case $choice in
        1)
            echo ""
            echo "🚀 Starting development server..."
            echo "📱 Your app will open at: http://localhost:5173"
            echo "⏹️  Press Ctrl+C to stop the server"
            echo ""
            sleep 2
            npm run dev
            ;;
        2)
            echo ""
            echo "🏗️  Building for production..."
            npm run build
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Build complete!"
                echo "📁 Files are in: dist/"
                echo ""
                echo "🌐 Deploy options:"
                echo "   Vercel:  vercel"
                echo "   Netlify: netlify deploy --prod"
                echo ""
            fi
            ;;
        3)
            echo ""
            echo "📝 Manual commands:"
            echo "   Development: npm run dev"
            echo "   Build:       npm run build"
            echo "   Deploy:      vercel"
            echo ""
            ;;
        *)
            echo ""
            echo "Invalid choice. Exiting."
            ;;
    esac
else
    echo ""
    echo "❌ Installation failed!"
    echo "💡 Try running: npm install"
    echo ""
    exit 1
fi
