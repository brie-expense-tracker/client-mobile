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
├── app/                           # Expo Router app directory (file-based routing)
│   ├── _layout.tsx                # Root layout
│   ├── (auth)/                    # Authentication flow
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgotPassword.tsx
│   ├── (onboarding)/              # First-time user onboarding
│   │   ├── _layout.tsx
│   │   ├── profileSetup.tsx
│   │   └── notificationSetup.tsx
│   ├── (stack)/                   # Stack navigation screens
│   │   ├── _layout.tsx
│   │   ├── budgets/               # Budget management screens
│   │   ├── debts/                 # Debt tracking screens
│   │   ├── goals/                 # Financial goals screens
│   │   ├── recurring/             # Recurring expenses screens
│   │   └── settings/              # Settings & configuration
│   │       ├── index.tsx
│   │       ├── _layout.tsx
│   │       ├── profile/           # User profile management
│   │       ├── security/          # Security & login settings
│   │       ├── privacyandsecurity/ # Privacy & data management
│   │       ├── notification/      # Notification preferences
│   │       ├── assistant/         # AI assistant settings
│   │       ├── aiInsights/        # AI insights configuration
│   │       ├── budgets/           # Budget settings
│   │       ├── goals/             # Goal settings
│   │       ├── recurringExpenses/ # Recurring expense settings
│   │       ├── legal/             # Legal documents (ToS, Privacy, etc.)
│   │       ├── about/             # About page
│   │       ├── faq/               # Frequently asked questions
│   │       └── upgrade/           # Subscription upgrade
│   └── (tabs)/                    # Tab navigation screens
│       ├── _layout.tsx
│       ├── dashboard/             # Main dashboard with transactions
│       │   ├── index.tsx
│       │   ├── ledger/           # Transaction ledger & editing
│       │   └── components/       # Dashboard widgets
│       ├── chat/                  # AI assistant chat interface
│       │   ├── index.tsx
│       │   ├── _components/      # Chat UI components
│       │   └── components/       # Chat utilities
│       ├── wallet/               # Financial overview & management
│       │   ├── index.tsx
│       │   ├── budgets.tsx
│       │   ├── goals.tsx
│       │   ├── debts.tsx
│       │   ├── recurring.tsx
│       │   └── components/       # Wallet components
│       ├── reflections/           # Weekly financial reflections
│       │   ├── index.tsx
│       │   ├── ReflectionWizard.tsx
│       │   └── components/
│       └── transaction/           # Transaction entry
│
├── src/                           # Source code
│   ├── assets/                    # Static assets
│   │   ├── fonts/                 # Custom fonts
│   │   ├── icons/                 # App icons
│   │   ├── images/                # Images & illustrations
│   │   └── logos/                 # Brand logos
│   ├── components/                # Reusable UI components
│   │   ├── assistant/             # AI assistant UI components
│   │   ├── budgets/               # Budget-related components
│   │   ├── forms/                 # Form components
│   │   └── __tests__/             # Component tests
│   ├── config/                    # App configuration
│   │   ├── api.ts                 # API endpoints
│   │   ├── env.ts                 # Environment variables
│   │   ├── features.ts            # Feature flags
│   │   └── telemetry.ts           # Analytics configuration
│   ├── constants/                 # App constants
│   ├── context/                   # React Context providers
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── ThemeContext.tsx       # Theme management
│   │   ├── transactionContext.tsx # Transaction state
│   │   └── ...                    # Other context providers
│   ├── hooks/                     # Custom React hooks
│   │   ├── useBudgets.ts          # Budget operations
│   │   ├── useGoals.ts            # Goal operations
│   │   ├── useAssistantStream.ts  # AI streaming
│   │   └── ...                    # Other custom hooks
│   ├── lib/                       # Core libraries
│   │   ├── firebaseClient.ts      # Firebase initialization
│   │   └── eventBus.ts            # Event system
│   ├── networking/                # Network configuration
│   ├── services/                  # Business logic & API services
│   │   ├── assistant/             # AI assistant services
│   │   ├── core/                  # Core services
│   │   ├── feature/               # Feature-specific services
│   │   ├── ml/                    # Machine learning services
│   │   ├── resilience/            # Error handling & retry logic
│   │   ├── security/              # Security utilities
│   │   └── utility/               # Utility services
│   ├── state/                     # Global state management
│   ├── types/                     # TypeScript type definitions
│   ├── ui/                        # UI primitives & theme
│   │   ├── theme.ts               # Design system (colors, spacing, etc.)
│   │   ├── Card.tsx
│   │   ├── Page.tsx
│   │   └── ...                    # Other UI primitives
│   └── utils/                     # Utility functions
│       ├── logger.ts              # Logging utilities
│       ├── format.ts              # Formatting helpers
│       ├── accessibility.ts       # Accessibility utilities
│       └── ...                    # Other utilities
│
├── docs/                          # Documentation
│   ├── README.md                  # Documentation index
│   ├── workflows/                 # Workflow documentation
│   └── *.md                       # Feature-specific docs
│
├── scripts/                       # Build & utility scripts
│   ├── clear-cache-and-restart.sh
│   └── testflight-build.sh
│
├── ios/                           # iOS native code
│   ├── brie/                      # iOS app bundle
│   └── Podfile                    # CocoaPods dependencies
│
├── android/                       # Android native code
│   ├── app/                       # Android app module
│   └── build.gradle               # Gradle build config
│
├── app.config.ts                  # Expo app configuration
├── eas.json                       # EAS Build configuration
├── babel.config.js                # Babel configuration
├── metro.config.js                # Metro bundler config
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies & scripts
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
