// API Configuration
// This file contains the API URLs for different environments

export const API_CONFIG = {
	// Development environment - local simulator/device
	development: {
		baseUrl: 'http://192.168.1.65:3000', // Your computer's local IP address
		// Alternative: 'http://192.168.1.100:3000' (replace with your actual IP)
	},

	// Production environment
	production: {
		baseUrl: 'https://your-production-api.com', // Replace with your actual production URL
	},
};

// Get the current environment
export const getApiBaseUrl = () => {
	let baseUrl: string;

	if (__DEV__) {
		// In development, try to use environment variable first, then fallback
		baseUrl =
			process.env.EXPO_PUBLIC_LOCAL_SIM_API_URL ||
			API_CONFIG.development.baseUrl;
	} else {
		// In production, try to use environment variable first, then fallback
		baseUrl =
			process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
			API_CONFIG.production.baseUrl;
	}

	// Ensure the base URL doesn't end with /api to prevent duplication
	// If the environment variable already includes /api, use it as is
	// If not, append /api for consistency
	if (baseUrl.endsWith('/api')) {
		// Already has /api, use as is
		return baseUrl;
	} else if (baseUrl.endsWith('/api/')) {
		// Has /api/, remove trailing slash
		return baseUrl.slice(0, -1);
	} else {
		// No /api, append it
		return `${baseUrl}/api`;
	}
};

// Export the current base URL
export const API_BASE_URL = getApiBaseUrl();

// Network status check
export const checkNetworkStatus = async () => {
	try {
		// Try to fetch a simple endpoint to check if the server is reachable
		const response = await fetch(`${API_BASE_URL}/budgets`, {
			method: 'GET',
			signal: AbortSignal.timeout(5000), // 5 second timeout
		});
		return response.ok;
	} catch (error) {
		console.log('Network status check failed:', error);
		return false;
	}
};

// Debug logging
console.log(
	'API Config - Environment:',
	__DEV__ ? 'development' : 'production'
);
console.log(
	'API Config - EXPO_PUBLIC_LOCAL_SIM_API_URL:',
	process.env.EXPO_PUBLIC_LOCAL_SIM_API_URL
);
console.log(
	'API Config - EXPO_PUBLIC_PRODUCTION_API_URL:',
	process.env.EXPO_PUBLIC_PRODUCTION_API_URL
);
console.log(
	'API Config - Fallback baseUrl:',
	__DEV__ ? API_CONFIG.development.baseUrl : API_CONFIG.production.baseUrl
);
console.log('API Config - Final API_BASE_URL:', API_BASE_URL);
console.log(
	'API Config - API_BASE_URL ends with /api:',
	API_BASE_URL.endsWith('/api')
);

// Log network status on startup
checkNetworkStatus().then((isOnline) => {
	console.log('API Config - Network status:', isOnline ? 'Online' : 'Offline');
});
