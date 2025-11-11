#!/bin/bash

echo "🚀 Setting up iOS project..."

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null
then
    echo "❌ CocoaPods not found. Installing..."
    echo "Please run: sudo gem install cocoapods"
    echo "Or: brew install cocoapods"
    exit 1
fi

echo "✅ CocoaPods found"

# Check if out directory exists
if [ ! -d "out" ]; then
    echo "📦 Building Next.js app..."
    npm run build
fi

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Install CocoaPods dependencies
echo "📥 Installing iOS dependencies..."
cd ios/App
pod install

# Open Xcode
echo "🎉 Opening Xcode..."
open App.xcworkspace

echo "✅ Done! Xcode should open now."
echo "💡 Tip: In Xcode, select a simulator and click the ▶️ button to run."
