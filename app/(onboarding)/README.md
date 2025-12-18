# Onboarding Flow

This directory contains the streamlined onboarding experience for new Brie users.

## Flow Overview

The onboarding process has been optimized to provide maximum value with minimal friction:

### 1. **Profile Setup** (`profileSetup.tsx`)

**Purpose:** Collect essential user information to personalize the experience

**What it collects:**

- Basic profile information (name)
- Financial information (monthly income, housing expenses)
- Financial goals
- Risk profile and preferences

**Value to user:**

- Personalized experience from day one
- Accurate budget recommendations
- Tailored AI insights
- Better financial planning tools

**Server integration:**

- Saves profile data to user account
- Enables personalized features
- Sets up initial preferences

### 2. **Notification Setup** (`notificationSetup.tsx`)

**Purpose:** Configure notification preferences for optimal engagement

**What it configures:**

- Core notifications (budgets, goals, transactions)
- AI insights frequency and delivery
- Reminder preferences
- Marketing preferences (optional)

**Value to user:**

- Stay informed about financial progress
- Receive timely alerts for overspending
- Get AI-powered insights and suggestions
- Maintain financial discipline through reminders

**Server integration:**

- Saves notification preferences
- Enables push notification delivery
- Configures AI insight scheduling

### 3. **Onboarding Summary** (`summary.tsx`)

**Purpose:** Provide a final snapshot of the user's profile and health before entering the app.

**What it shows:**

- Profile completion percentage
- Initial financial health score
- Snapshot of key financial data (income, savings, debt, housing)

**Value to user:**

- One-time confirmation checkpoint
- Encouragement through health score
- Last chance to verify data before the dashboard

**Server integration:**

- Marks onboarding as complete via `markOnboardingComplete`

## User Journey

```
New User → Profile Setup → Notification Setup → Onboarding Summary → Main App
```

### Entry Points

- New user registration
- First app launch after authentication
- Demo mode (skips to main app)

### Exit Points

- Profile setup completion → Notification setup
- Notification setup completion → Onboarding summary
- Onboarding summary completion → Main app dashboard
- Skip options available at each step

## Technical Implementation

### Navigation

- Uses Expo Router for seamless transitions
- Proper error handling and fallbacks
- Graceful degradation if setup fails

### Data Persistence

- Profile data saved to user account
- Preferences stored locally and on server
- Syncs with backend services

### Error Handling

- Network failure recovery
- Partial setup completion
- Fallback to default settings

## Benefits of Streamlined Flow

### Before (3 screens):

1. Welcome screen (no value)
2. Generic "create account" screen (no value)
3. Profile setup (valuable)
4. Notification setup (valuable)

### After (3 screens):

1. Profile setup (valuable)
2. Notification setup (valuable)
3. Onboarding summary (valuable - confirmation & momentum)

**Result:** Better momentum and a clear finish line for the user.

## Future Enhancements

- Progressive profile completion
- Optional advanced settings
- Integration with bank account linking
- Personalized onboarding based on user type
