#!/bin/bash

# TestFlight Build Script
# This script prepares and builds the app for TestFlight submission

set -e

echo "🚀 Starting TestFlight build process..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo "🔐 Please log in to EAS:"
    eas login
fi

# Set environment variables for TestFlight
export EXPO_PUBLIC_ENV=testflight
export NODE_ENV=testflight

echo "📋 Pre-build checklist:"
echo "✅ EAS CLI installed and logged in"
echo "✅ Environment variables set"
echo "✅ App config updated for TestFlight"

# Increment build number
echo "📈 Incrementing build number..."
node -e "
const fs = require('fs');
const configPath = './app.config.ts';
let config = fs.readFileSync(configPath, 'utf8');
const buildNumberMatch = config.match(/buildNumber:\s*['\"](\d+)['\"]/);
if (buildNumberMatch) {
  const currentBuild = parseInt(buildNumberMatch[1]);
  const newBuild = currentBuild + 1;
  config = config.replace(/buildNumber:\s*['\"]\d+['\"]/, \`buildNumber: '\${newBuild}'\`);
  fs.writeFileSync(configPath, config);
  console.log(\`Build number updated: \${currentBuild} → \${newBuild}\`);
}
"

# Build for TestFlight
echo "🔨 Building for TestFlight..."
eas build -p ios --profile testflight --non-interactive

# Get the latest build ID
BUILD_ID=$(eas build:list --platform=ios --limit=1 --json | jq -r '.[0].id')

if [ "$BUILD_ID" = "null" ] || [ -z "$BUILD_ID" ]; then
    echo "❌ Failed to get build ID"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📱 Build ID: $BUILD_ID"

# Submit to TestFlight (optional - uncomment if you want automatic submission)
# echo "📤 Submitting to TestFlight..."
# eas submit -p ios --id $BUILD_ID --non-interactive

echo ""
echo "🎉 TestFlight build process completed!"
echo ""
echo "Next steps:"
echo "1. Wait for build processing in App Store Connect"
echo "2. Submit to TestFlight: eas submit -p ios --id $BUILD_ID"
echo "3. Configure TestFlight groups and testers"
echo "4. Complete Export Compliance if prompted"
echo ""
echo "Build ID: $BUILD_ID"
