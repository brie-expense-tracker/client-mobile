# App Directory Structure

This directory contains the main navigation structure for the Brie mobile app using Expo Router.

## Directory Organization

### 📁 `(auth)` - Authentication Flow

- **`login.tsx`** - User login screen
- **`signup.tsx`** - User registration screen
- **`forgotPassword.tsx`** - Password reset screen
- **`_layout.tsx`** - Auth stack layout

### 📁 `(onboarding)` - Onboarding Flow

- **`profileSetup.tsx`** - Profile setup and financial information collection
- **`notificationSetup.tsx`** - Notification permission and preferences setup
- **`_layout.tsx`** - Onboarding stack layout

### 📁 `(tabs)` - Main App Tabs

- **`_layout.tsx`** - Tab navigation layout

#### 📁 `dashboard/` - Dashboard Tab

- **`index.tsx`** - Main dashboard screen
- **`notifications.tsx`** - Notifications screen
- **`_layout.tsx`** - Dashboard stack layout
- **`ledger/`** - Transaction ledger
  - **`index.tsx`** - Ledger main screen
  - **`edit.tsx`** - Edit transaction screen
  - **`ledgerFilter.tsx`** - Filter transactions
  - **`_layout.tsx`** - Ledger stack layout
  - **`components/`** - Ledger-specific components

#### 📁 `budgets/` - Budgets Tab

- **`index.tsx`** - Main budgets screen
- **`goals.tsx`** - Financial goals screen
- **`recurringExpenses.tsx`** - Recurring expenses screen
- **`_layout.tsx`** - Budgets stack layout
- **`components/`** - Budget-specific components

#### 📁 `chat/` - AI Chat Tab

- **`index.tsx`** - Main AI chat screen
- **`_layout.tsx`** - Chat stack layout
- **`components/`** - Chat-specific components

#### 📁 `transaction/` - Transaction Tab

- **`index.tsx`** - Transaction list screen
- **`expense.tsx`** - Add expense screen
- **`_layout.tsx`** - Transaction stack layout

### 📁 `(stack)` - Modal/Stack Screens

- **`_layout.tsx`** - Stack navigation layout

#### Budget & Goal Management

- **`addBudget.tsx`** - Add new budget
- **`editBudget.tsx`** - Edit existing budget
- **`budgetDetails.tsx`** - Budget details view
- **`addGoal.tsx`** - Add new goal
- **`editGoal.tsx`** - Edit existing goal
- **`goalDetails.tsx`** - Goal details view

#### Recurring Expenses

- **`addRecurringExpense.tsx`** - Add recurring expense
- **`recurringExpenseDetails.tsx`** - Recurring expense details

#### 📁 `settings/` - Settings Screens

- **`index.tsx`** - Main settings screen
- **`_layout.tsx`** - Settings stack layout

##### Profile Settings

- **`profile/index.tsx`** - Profile main screen
- **`profile/editName.tsx`** - Edit name
- **`profile/editPhone.tsx`** - Edit phone
- **`profile/editFinancial.tsx`** - Edit financial info
- **`profile/editExpenses.tsx`** - Edit expenses
- **`profile/deleteAccount.tsx`** - Delete account
- **`profile/components/`** - Profile-specific components

##### Notification Settings

- **`notification/index.tsx`** - Notification settings
- **`notification/consentManagement.tsx`** - Consent management

##### Privacy & Security

- **`privacy/index.tsx`** - Privacy settings
- **`privacy/AIPrivacySettings.tsx`** - AI privacy settings
- **`privacyandsecurity/index.tsx`** - Security & privacy main
- **`privacyandsecurity/downloadData.tsx`** - Download data
- **`privacyandsecurity/manageData.tsx`** - Manage data
- **`privacyandsecurity/editPassword.tsx`** - Edit password
- **`security/index.tsx`** - Security settings
- **`security/loginHistory.tsx`** - Login history

##### Other Settings

- **`upgrade/index.tsx`** - Upgrade screen
- **`aiInsights/index.tsx`** - AI insights settings
- **`recurringExpenses/index.tsx`** - Recurring expenses settings
- **`budgets/index.tsx`** - Budget settings
- **`goals/index.tsx`** - Goal settings
- **`about/index.tsx`** - About screen
- **`faq/index.tsx`** - FAQ screen
- **`legal/`** - Legal documents
  - **`index.tsx`** - Legal main screen
  - **`terms.tsx`** - Terms of service
  - **`privacyPolicy.tsx`** - Privacy policy
  - **`licenseAgreement.tsx`** - License agreement
  - **`cookiePolicy.tsx`** - Cookie policy
  - **`disclaimer.tsx`** - Disclaimer
  - **`dataRightsCompliance.tsx`** - Data rights compliance

## Navigation Flow

1. **Authentication** → `(auth)` group
2. **Onboarding** → `(onboarding)` group
3. **Main App** → `(tabs)` group with modal stacks in `(stack)`

## File Naming Conventions

- **`index.tsx`** - Main screen for each directory
- **`_layout.tsx`** - Navigation layout for each group
- **`components/`** - Reusable components specific to that section

## Recent Cleanup

- ✅ Removed duplicate `forgotPassword.tsx` from profile settings
- ✅ Streamlined onboarding flow by removing redundant screens
- ✅ Renamed onboarding files for better clarity:
  - `onboardingThree.tsx` → `profileSetup.tsx`
  - `notificationPermission.tsx` → `notificationSetup.tsx`
- ✅ Updated navigation references
- ✅ All files are properly referenced and used
