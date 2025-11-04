#!/bin/bash

# TestFlight Build Script
# Streamlined script that leverages EAS autoIncrement and eas.json env vars
# Use this for a quick, one-command TestFlight deployment

set -e

echo "🚀 Starting TestFlight build process..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Please install it first:"
    echo "   npm install -g eas-cli"
    exit 1
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please log in first:"
    echo "   eas login"
    exit 1
fi

echo "📋 Pre-build checklist:"
echo "✅ EAS CLI installed"
echo "✅ Logged in to EAS"
echo "✅ Using autoIncrement from eas.json"
echo "✅ Environment variables from eas.json profile"

# Build for TestFlight
echo "🔨 Building for TestFlight..."
echo "   (Build number will auto-increment, env vars come from eas.json)"
eas build --profile testflight --platform ios

echo ""
echo "✅ Build submitted successfully!"
echo ""
echo "Next steps:"
echo "1. Wait for build to complete (check: eas build:list --profile testflight)"
echo "2. Once complete, submit to TestFlight:"
echo "   eas submit --profile testflight --platform ios"
echo "3. Or submit manually with a specific build ID"
echo ""
echo "To check build status:"
echo "   eas build:list --profile testflight --platform ios --limit=5"
