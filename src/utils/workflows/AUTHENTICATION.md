# Authentication System

This document explains how the authentication system works in the Brie mobile app.

## Overview

The app uses Firebase Authentication for user authentication and MongoDB for storing user data. The Firebase UID serves as the unique identifier that links Firebase authentication with MongoDB user records.

## Architecture

### Frontend (React Native)

- **AuthContext**: Manages authentication state and provides user data
- **UserService**: Handles API calls to the backend
- **ApiService**: Provides authenticated HTTP requests with Firebase UID headers

### Backend (Node.js/Express)

- **Auth Middleware**: Verifies Firebase UID and attaches user to request
- **User Controller**: Handles user CRUD operations
- **User Model**: MongoDB schema for user data

## Key Components

### 1. AuthContext (`src/context/AuthContext.tsx`)

The main authentication context that:

- Listens to Firebase auth state changes
- Manages user data from MongoDB
- Provides authentication methods

```typescript
const { user, firebaseUser, loading, login, logout, createUserInMongoDB } =
	useAuth();
```

**Available properties:**

- `user`: MongoDB user object (null if not authenticated)
- `firebaseUser`: Firebase user object (null if not authenticated)
- `loading`: Boolean indicating if auth state is being determined
- `login(firebaseUser)`: Login method that verifies MongoDB user
- `logout()`: Logout method that signs out from Firebase
- `createUserInMongoDB(firebaseUser, name?)`: Creates user in MongoDB

### 2. UserService (`src/services/userService.ts`)

Service for user-related API calls:

```typescript
// Create user in MongoDB
const user = await UserService.createUser({ firebaseUID, email, name });

// Get user by Firebase UID
const user = await UserService.getUserByFirebaseUID(firebaseUID);

// Get current authenticated user
const user = await UserService.getCurrentUser();

// Update user profile
const updatedUser = await UserService.updateUserProfile({ name: 'New Name' });
```

### 3. ApiService (`src/services/apiService.ts`)

Generic API service that automatically includes Firebase UID in headers:

```typescript
// All requests automatically include Firebase UID header
const response = await ApiService.get('/some-endpoint');
const response = await ApiService.post('/some-endpoint', data);
const response = await ApiService.put('/some-endpoint', data);
const response = await ApiService.delete('/some-endpoint');
```

## Authentication Flow

### 1. Sign Up

1. User creates Firebase account with email/password
2. Firebase returns user object with UID
3. App calls `createUserInMongoDB()` to create MongoDB record
4. User is now authenticated and can access protected features

### 2. Sign In

1. User signs in with Firebase credentials
2. Firebase returns user object with UID
3. App calls `login()` which verifies user exists in MongoDB
4. If user doesn't exist in MongoDB, they're redirected to signup
5. User is authenticated and can access protected features

### 3. App Launch

1. AuthContext listens to Firebase auth state
2. If user is authenticated in Firebase, app checks MongoDB
3. If user exists in MongoDB, they're logged in
4. If user doesn't exist in MongoDB, they're redirected to signup

## Protected Routes

### Frontend Protection

The layout automatically handles navigation based on authentication state:

- Authenticated users → Dashboard
- Unauthenticated users → Auth screens
- Firebase users without MongoDB record → Signup

### Backend Protection

Use the `authenticateUser` middleware to protect routes:

```javascript
// In routes
router.get('/protected-route', authenticateUser, controllerFunction);

// In controller
export const protectedFunction = async (req, res) => {
	// req.user contains the authenticated user from MongoDB
	const user = req.user;
	// ... your logic
};
```

## Usage Examples

### In Components

```typescript
import useAuth from '../src/context/AuthContext';

function MyComponent() {
	const { user, firebaseUser, logout } = useAuth();

	if (!user) {
		return <Text>Please log in</Text>;
	}

	return (
		<View>
			<Text>Welcome, {user.name}!</Text>
			<Button onPress={logout} title="Logout" />
		</View>
	);
}
```

### Making Authenticated API Calls

```typescript
import { ApiService } from '../src/services/apiService';

// Firebase UID is automatically included in headers
const response = await ApiService.get('/user-data');
if (response.success) {
	console.log(response.data);
}
```

### Updating User Profile

```typescript
import { UserService } from '../src/services/userService';

try {
	const updatedUser = await UserService.updateUserProfile({
		name: 'New Name',
		email: 'newemail@example.com',
	});
	console.log('Profile updated:', updatedUser);
} catch (error) {
	console.error('Failed to update profile:', error);
}
```

## Security Notes

1. **Firebase UID**: The Firebase UID is the primary identifier and should never be exposed or modified
2. **Headers**: All authenticated requests include `X-Firebase-UID` header
3. **Middleware**: Backend routes should use `authenticateUser` middleware for protection
4. **Error Handling**: Always handle authentication errors gracefully
5. **Loading States**: Use the `loading` state from AuthContext to show appropriate UI

## Configuration

### API Base URL

Update the `API_BASE_URL` in both `userService.ts` and `apiService.ts` to match your server URL.

### Firebase Configuration

Ensure Firebase is properly configured in your app with the correct project settings.

### MongoDB Connection

Ensure your server has proper MongoDB connection and the User model is correctly set up.
