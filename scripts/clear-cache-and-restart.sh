#!/bin/bash
# Script to clear all caches and restart the Expo dev server

echo "🧹 Clearing Expo caches..."
rm -rf .expo .expo-shared

echo "🗂️  Clearing build caches..."
rm -rf ios/build android/app/build

echo "📦 Clearing node_modules and reinstalling..."
rm -rf node_modules
npm install

echo "🚀 Starting Expo with cleared cache..."
npx expo start --clear

