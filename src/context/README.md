# Profile Provider Documentation

## Overview

The Profile Provider is a React Context that manages user profile data throughout the app. It provides a centralized way to access, update, and manage user profile information including personal details, financial information, preferences, and notification settings.

## Features

- **Automatic Profile Creation**: When a user is created, a profile is automatically created with default values
- **Real-time Updates**: Profile changes are immediately reflected across the app
- **Error Handling**: Built-in error handling and loading states
- **Type Safety**: Full TypeScript support with proper interfaces
- **Authentication Integration**: Works seamlessly with the AuthContext

## Setup

The Profile Provider is already set up in your app at `client-mobile/app/(tabs)/_layout.tsx`. It wraps all tab screens, making profile data available throughout the main app.

## Usage

### Basic Usage

```tsx
import { useProfile } from '../context/profileContext';

function MyComponent() {
	const { profile, loading, error } = useProfile();

	if (loading) return <Text>Loading...</Text>;
	if (error) return <Text>Error: {error}</Text>;
	if (!profile) return <Text>No profile found</Text>;

	return (
		<View>
			<Text>
				Welcome, {profile.firstName} {profile.lastName}!
			</Text>
			<Text>Monthly Income: ${profile.monthlyIncome}</Text>
		</View>
	);
}
```

### Updating Profile Data

```tsx
import { useProfile } from '../context/profileContext';

function ProfileUpdateComponent() {
	const { updateProfile, profile } = useProfile();

	const handleUpdateIncome = async () => {
		try {
			await updateProfile({
				monthlyIncome: 5000,
			});
			console.log('Profile updated successfully!');
		} catch (error) {
			console.error('Failed to update profile:', error);
		}
	};

	return (
		<TouchableOpacity onPress={handleUpdateIncome}>
			<Text>Update Income</Text>
		</TouchableOpacity>
	);
}
```

### Updating Preferences

```tsx
import { useProfile } from '../context/profileContext';

function PreferencesComponent() {
	const { updatePreferences, profile } = useProfile();

	const handleUpdateAdviceFrequency = async () => {
		try {
			await updatePreferences({
				adviceFrequency: 'daily',
			});
			console.log('Preferences updated!');
		} catch (error) {
			console.error('Failed to update preferences:', error);
		}
	};

	return (
		<View>
			<Text>Current frequency: {profile?.preferences.adviceFrequency}</Text>
			<TouchableOpacity onPress={handleUpdateAdviceFrequency}>
				<Text>Change to Daily</Text>
			</TouchableOpacity>
		</View>
	);
}
```

### Updating Notification Settings

```tsx
import { useProfile } from '../context/profileContext';

function NotificationSettingsComponent() {
	const { updateNotificationSettings, profile } = useProfile();

	const handleToggleWeeklySummary = async () => {
		try {
			await updateNotificationSettings({
				weeklySummary: !profile?.preferences.notifications.weeklySummary,
			});
			console.log('Notification settings updated!');
		} catch (error) {
			console.error('Failed to update notification settings:', error);
		}
	};

	return (
		<View>
			<Text>
				Weekly Summary:{' '}
				{profile?.preferences.notifications.weeklySummary ? 'On' : 'Off'}
			</Text>
			<TouchableOpacity onPress={handleToggleWeeklySummary}>
				<Text>Toggle Weekly Summary</Text>
			</TouchableOpacity>
		</View>
	);
}
```

## Available Methods

### `useProfile()` Hook

Returns an object with the following properties and methods:

#### Properties

- `profile: Profile | null` - The current user's profile data
- `loading: boolean` - Whether the profile is currently loading
- `error: string | null` - Any error message if profile loading failed

#### Methods

- `fetchProfile(): Promise<void>` - Manually fetch the profile data
- `updateProfile(updates: Partial<Profile>): Promise<void>` - Update profile information
- `updatePreferences(preferences: Partial<ProfilePreferences>): Promise<void>` - Update user preferences
- `updateNotificationSettings(settings: Partial<ProfilePreferences['notifications']>): Promise<void>` - Update notification settings
- `refreshProfile(): Promise<void>` - Refresh the profile data

## Profile Data Structure

```tsx
interface Profile {
	_id: string;
	userId: string;
	firstName: string;
	lastName: string;
	ageRange: string;
	monthlyIncome: number;
	financialGoal: string;
	expenses: {
		housing: number;
		loans: number;
		subscriptions: number;
	};
	savings: number;
	debt: number;
	riskProfile: {
		tolerance: string;
		experience: string;
	};
	preferences: {
		adviceFrequency: string;
		autoSave: {
			enabled: boolean;
			amount: number;
		};
		notifications: {
			enableNotifications: boolean;
			weeklySummary: boolean;
			overspendingAlert: boolean;
			aiSuggestion: boolean;
			budgetMilestones: boolean;
		};
	};
	createdAt: string;
	updatedAt: string;
}
```

## Error Handling

The Profile Provider includes comprehensive error handling:

```tsx
function MyComponent() {
	const { profile, loading, error } = useProfile();

	if (loading) {
		return <ActivityIndicator />;
	}

	if (error) {
		return (
			<View>
				<Text>Error loading profile: {error}</Text>
				<TouchableOpacity onPress={() => refreshProfile()}>
					<Text>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// Your component logic here
}
```

## Best Practices

1. **Always check loading state**: Before accessing profile data, check if it's still loading
2. **Handle errors gracefully**: Provide user-friendly error messages and retry options
3. **Use TypeScript**: Take advantage of the full TypeScript support for type safety
4. **Optimistic updates**: Consider showing immediate UI updates while API calls are in progress
5. **Batch updates**: When updating multiple fields, use a single `updateProfile` call instead of multiple calls

## Examples

### Complete Profile Display Component

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useProfile } from '../context/profileContext';

const ProfileDisplay = () => {
	const { profile, loading, error } = useProfile();

	if (loading) return <Text>Loading profile...</Text>;
	if (error) return <Text>Error: {error}</Text>;
	if (!profile) return <Text>No profile found</Text>;

	return (
		<View style={styles.container}>
			<Text style={styles.name}>
				{profile.firstName} {profile.lastName}
			</Text>
			<Text>Age: {profile.ageRange}</Text>
			<Text>Income: ${profile.monthlyIncome}</Text>
			<Text>Savings: ${profile.savings}</Text>
			<Text>Debt: ${profile.debt}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { padding: 16 },
	name: { fontSize: 20, fontWeight: 'bold' },
});

export default ProfileDisplay;
```

### Profile Form Component

```tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useProfile } from '../context/profileContext';

const ProfileForm = () => {
	const { profile, updateProfile } = useProfile();
	const [firstName, setFirstName] = useState(profile?.firstName || '');

	const handleSave = async () => {
		try {
			await updateProfile({ firstName });
			console.log('Profile updated!');
		} catch (error) {
			console.error('Update failed:', error);
		}
	};

	return (
		<View>
			<TextInput
				value={firstName}
				onChangeText={setFirstName}
				placeholder="First Name"
			/>
			<TouchableOpacity onPress={handleSave}>
				<Text>Save</Text>
			</TouchableOpacity>
		</View>
	);
};

export default ProfileForm;
```

## Integration with Other Contexts

The Profile Provider works seamlessly with other contexts in your app:

```tsx
function MyComponent() {
	const { user } = useAuth();
	const { profile } = useProfile();
	const { transactions } = useContext(TransactionContext);

	// Use data from multiple contexts together
	const monthlyBudget = profile?.monthlyIncome || 0;
	const monthlySpending = transactions
		.filter((t) => t.type === 'expense')
		.reduce((sum, t) => sum + t.amount, 0);

	return (
		<View>
			<Text>Budget: ${monthlyBudget}</Text>
			<Text>Spent: ${monthlySpending}</Text>
			<Text>Remaining: ${monthlyBudget - monthlySpending}</Text>
		</View>
	);
}
```
