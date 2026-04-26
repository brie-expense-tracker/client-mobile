# Brie Mobile App

Brie Mobile is your daily money operating system: one place to log spending, track goals, stay on budget, and understand what to do next.

Built with React Native + Expo, the app combines practical personal-finance tools with AI-guided insights so users can move from "I think I'm doing okay" to "I know exactly where I stand."

## Why Brie

- **Clarity over chaos**: Money often feels fragmented across apps, notes, and memory. Brie gives users one connected place to understand what is happening.
- **Action over anxiety**: Instead of raw numbers alone, Brie highlights what matters now and what to do next.
- **Progress you can feel**: Small daily check-ins compound into better spending habits, stronger savings, and fewer surprises.
- **Built for real life**: Track recurring bills, one-off purchases, debt payoff, and goals without adding complexity.
- **Always available**: Offline support keeps the experience reliable on commutes, in stores, or anywhere signal is weak.
- **Inclusive by design**: VoiceOver and TalkBack support are core product requirements, not an afterthought.

## What Brie Helps Users Do

- Understand where money is going each day, week, and month.
- Make budget adjustments before problems grow.
- Balance short-term spending with long-term goals.
- Stay accountable with reflection prompts and progress visibility.
- Build confidence through consistent routines and guided insights.

## How To Use Brie

1. **Create your account** and complete onboarding.
2. **Add your first transactions** (income and spending) to establish your baseline.
3. **Set budgets and goals** for the month (or longer-term targets).
4. **Review your dashboard daily** for progress, trends, and priority actions.
5. **Use AI chat + weekly reflections** to stay consistent and improve decisions over time.

Brie works best as a lightweight daily habit: quick check-ins, clear progress, and fewer financial surprises.

## 📸 App Preview

![Brie dashboard preview](<./app/(tabs)/dashboard/brie-preview.png>)

## 🚀 Quick Start

This section is for developers working on the mobile client.

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

- **AI-Powered Insights**: Personalized analysis that turns transaction history into clear recommendations.
- **Budget Management**: Create budgets and track progress with clear visual signals before overspending happens.
- **Goal Setting**: Turn financial goals into measurable targets with ongoing progress tracking.
- **Transaction Management**: Quickly add, categorize, and review transactions to maintain accurate data.
- **Recurring Expenses**: Keep fixed obligations visible so users can plan with confidence.
- **Debt Tracking**: Monitor balances and payoff progress to support better long-term decisions.
- **Weekly Reflections**: Reinforce awareness, habits, and behavior change through short guided prompts.
- **Offline Support**: Core workflows remain usable without internet access.
- **Accessibility**: Full VoiceOver and TalkBack support for inclusive navigation.
- **Crash Reporting**: Firebase Crashlytics keeps reliability high through fast issue detection.

## 🔧 Configuration

### Environment Setup

The app uses Firebase for authentication, crash reporting, and remote configuration. Ensure you have:

- `google-services.json` (Android Firebase config)
- `GoogleService-Info.plist` (iOS Firebase config)

**Firebase Services Used:**

- Firebase Authentication (email/password, Google Sign-In, Apple Sign-In)
- Firebase Crashlytics (crash reporting)
- Firebase Remote Config (feature flags and configuration)

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
