# Brie Mobile App

A React Native mobile application built with Expo for personal finance management with AI-powered insights.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Run on your preferred platform:

   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

## 📱 Features

- **AI-Powered Insights**: Intelligent financial analysis and recommendations
- **Budget Management**: Create and track budgets with visual progress
- **Goal Setting**: Set financial goals with progress tracking
- **Transaction Management**: Add and categorize transactions
- **Offline Support**: Works without internet connection
- **Accessibility**: Full VoiceOver and TalkBack support
- **Crash Reporting**: Firebase Crashlytics integration

## 🏗️ Project Structure

```
client-mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   ├── (onboarding)/      # Onboarding flow
│   ├── (stack)/           # Main app screens
│   └── (tabs)/            # Tab navigation screens
├── src/
│   ├── components/        # Reusable UI components
│   ├── services/          # API and business logic
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── docs/                  # Implementation documentation
├── ios/                   # iOS native code
└── android/               # Android native code
```

## 🔧 Configuration

### Environment Setup

The app uses Firebase for authentication and crash reporting. Ensure you have:

- `google-services.json` (Android Firebase config)
- `GoogleService-Info.plist` (iOS Firebase config)

### Build Configuration

- **Development**: `eas build --profile development`
- **Production**: `eas build --profile production`

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- [Implementation Guides](./docs/README.md#-implementation-guides)
- [Configuration & Setup](./docs/README.md#-configuration--setup)
- [Troubleshooting](./docs/README.md#-troubleshooting)

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 🚀 Deployment

The app is configured for deployment via EAS Build:

```bash
# Build for development
eas build --profile development

# Build for production
eas build --profile production
```

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation as needed
4. Ensure accessibility compliance

## 📄 License

This project is part of the Brie financial management platform.
