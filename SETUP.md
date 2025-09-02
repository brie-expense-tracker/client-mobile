# Setup Instructions

## Firebase Configuration

### 1. Copy Firebase Config Files

Copy the example files and fill in your Firebase project details:

```bash
# Android
cp google-services.json.example android/app/google-services.json

# iOS
cp GoogleService-Info.plist.example ios/brie/GoogleService-Info.plist
```

### 2. Update Environment Variables

Update your `.env` file with your Firebase configuration:

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Firebase details
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. EAS Build Configuration

For production builds, set Firebase environment variables in your EAS build profiles:

```bash
# Set environment variables for EAS builds
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_api_key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
# ... etc for all Firebase variables
```

## Security Notes

- Never commit `google-services.json` or `GoogleService-Info.plist` to version control
- Use environment variables for all sensitive configuration
- The `.env` file is gitignored and should remain local
