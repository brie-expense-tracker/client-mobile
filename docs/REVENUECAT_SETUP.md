# RevenueCat Integration Guide

This document explains the RevenueCat SDK integration in the Brie mobile app.

## Overview

The app uses RevenueCat to manage in-app subscriptions for **Brie Pro**. RevenueCat provides a unified API for handling subscriptions across iOS App Store and Google Play Store.

## Architecture

### Core Components

1. **RevenueCatService** (`src/services/subscriptions/revenueCatService.ts`)
   - Singleton service that wraps RevenueCat SDK
   - Handles configuration, user identification, purchases, and subscription checks
   - Manages customer info and offerings

2. **SubscriptionContext** (`src/context/SubscriptionContext.tsx`)
   - React context provider for subscription state
   - Automatically initializes RevenueCat when user is authenticated
   - Provides subscription status, packages, and purchase methods

3. **useBriePro Hook** (`src/hooks/useBriePro.ts`)
   - Convenient hook for checking Brie Pro entitlement
   - Returns subscription status and expiration info

4. **Upgrade Screen** (`app/(stack)/settings/upgrade/index.tsx`)
   - Displays subscription packages
   - Integrates RevenueCat Paywall UI
   - Handles purchases and restoration

5. **Customer Center** (`src/components/CustomerCenter.tsx`)
   - Subscription management UI
   - Shows active subscriptions, expiration dates
   - Allows purchase restoration

## Configuration

### API Key

The RevenueCat API key is configured in `revenueCatService.ts`:

```typescript
const REVENUECAT_API_KEY = 'test_XEuKZYJZDHHfOqxNxoLUxtCsbAH';
```

**Note:** This is currently set to a test key. Update this with your production API key before release.

### Entitlement

- **Entitlement Identifier:** `Brie Pro`
- This must match exactly what's configured in your RevenueCat dashboard

### Product Identifiers

- **Monthly:** `monthly`
- **Yearly:** `yearly`

These identifiers must match the product IDs configured in your RevenueCat dashboard.

## Setup Steps

### 1. RevenueCat Dashboard Configuration

1. **Create Products**
   - Log in to [RevenueCat Dashboard](https://app.revenuecat.com)
   - Create two products:
     - `monthly` - Monthly subscription
     - `yearly` - Yearly subscription

2. **Create Offering**
   - Create an offering (e.g., "default")
   - Add both monthly and yearly packages to the offering

3. **Configure Entitlement**
   - Create an entitlement named exactly: `Brie Pro`
   - Attach both products to this entitlement

### 2. App Store Connect / Google Play Console

1. **Create In-App Purchases**
   - iOS: Create auto-renewable subscriptions in App Store Connect
   - Android: Create subscriptions in Google Play Console

2. **Link Products**
   - In RevenueCat dashboard, link your products to the App Store/Play Store product IDs

### 3. Testing

RevenueCat provides test API keys and sandbox environments:
- Use the test API key for development
- Test purchases in sandbox mode (iOS) or test accounts (Android)

## Usage Examples

### Check if User Has Pro

```typescript
import { useBriePro } from '../hooks/useBriePro';

function MyComponent() {
  const { isPro, isLoading } = useBriePro();
  
  if (isLoading) return <Loading />;
  if (isPro) {
    // Show Pro features
  } else {
    // Show upgrade prompt
  }
}
```

### Purchase a Package

```typescript
import { useSubscription } from '../context/SubscriptionContext';

function UpgradeScreen() {
  const { availablePackages, purchasePackage } = useSubscription();
  
  const handlePurchase = async (pkg) => {
    try {
      await purchasePackage(pkg);
      // Purchase successful
    } catch (error) {
      // Handle error
    }
  };
}
```

### Restore Purchases

```typescript
const { restorePurchases } = useSubscription();

const handleRestore = async () => {
  try {
    await restorePurchases();
    // Check if user now has Pro
  } catch (error) {
    // Handle error
  }
};
```

### Show Customer Center

```typescript
import CustomerCenter from '../components/CustomerCenter';

function SettingsScreen() {
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  
  return (
    <>
      <Button onPress={() => setShowCustomerCenter(true)}>
        Manage Subscription
      </Button>
      <CustomerCenter
        visible={showCustomerCenter}
        onClose={() => setShowCustomerCenter(false)}
      />
    </>
  );
}
```

## Best Practices

1. **Always Check Entitlements**
   - Don't rely solely on purchase state
   - Always check entitlements for feature access

2. **Handle Errors Gracefully**
   - User cancellation is not an error
   - Show appropriate messages for network errors

3. **Refresh Customer Info**
   - Refresh after purchases
   - Periodically refresh to catch subscription changes

4. **Test in Sandbox**
   - Use sandbox/test accounts
   - Test purchase flows, restores, and cancellations

5. **Handle Subscription States**
   - Active subscriptions
   - Expired subscriptions
   - Cancelled subscriptions (may still be active until period ends)

## Troubleshooting

### "No packages available"
- Check that products are configured in RevenueCat dashboard
- Verify offering is published and active
- Ensure products are linked to App Store/Play Store

### "Purchase failed"
- Check network connectivity
- Verify API key is correct
- Check RevenueCat dashboard for error logs

### "User not identified"
- Ensure RevenueCat is configured after user authentication
- Verify Firebase UID is being passed correctly

## Additional Resources

- [RevenueCat React Native Documentation](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [RevenueCat Paywalls](https://www.revenuecat.com/docs/tools/paywalls)
- [RevenueCat Customer Center](https://www.revenuecat.com/docs/tools/customer-center)


