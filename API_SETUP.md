# API Setup Guide - Fix Infinite Loading Issue

## Problem

The goals screen keeps loading indefinitely because the API service cannot connect to the server.

## Root Cause

The API service is looking for environment variables that are not set:

- `EXPO_PUBLIC_LOCAL_SIM_API_URL` (for development)
- `EXPO_PUBLIC_PRODUCTION_API_URL` (for production)

## Solutions

### Option 1: Set Environment Variables (Recommended)

Create a `.env` file in the `client-mobile` directory:

```bash
# Development - Your computer's local IP address
EXPO_PUBLIC_LOCAL_SIM_API_URL=http://192.168.1.100:3000

# Production - Your actual production API URL
EXPO_PUBLIC_PRODUCTION_API_URL=https://your-production-api.com
```

**Important:** Replace `192.168.1.100` with your actual computer's IP address.

### Option 2: Update the Configuration File

Edit `src/config/api.ts` and update the fallback URLs:

```typescript
export const API_CONFIG = {
	development: {
		baseUrl: 'http://192.168.1.100:3000', // Replace with your IP
	},
	production: {
		baseUrl: 'https://your-production-api.com', // Replace with your URL
	},
};
```

### Option 3: Use Localhost (Simulator Only)

If you're using the iOS Simulator or Android Emulator, you can use:

```typescript
export const API_CONFIG = {
	development: {
		baseUrl: 'http://localhost:3000',
	},
	// ... rest of config
};
```

## How to Find Your IP Address

### On macOS/Linux:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:

```bash
ipconfig | findstr "IPv4"
```

## Testing the Connection

1. Make sure your server is running on the specified port
2. Test the connection in your browser: `http://YOUR_IP:3000/health`
3. Check the console logs for network status

## Additional Debugging

The app now includes:

- ✅ Timeout handling (10 seconds)
- ✅ Retry mechanism (2 retries)
- ✅ Network status checking
- ✅ Better error messages
- ✅ Fallback API URLs

## Common Issues

1. **Firewall blocking connection**: Make sure port 3000 is open
2. **Wrong IP address**: Use your computer's local network IP, not localhost
3. **Server not running**: Ensure your backend server is started
4. **Port mismatch**: Verify the server is running on the correct port

## Quick Fix

If you just want to get it working quickly:

1. Find your IP address
2. Update `src/config/api.ts` with your IP
3. Restart the app

The infinite loading should be resolved!
