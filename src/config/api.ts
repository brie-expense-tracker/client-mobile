// api.ts - API configuration for the mobile app
import { resolveApiBaseUrl, getApiUrl, ENV } from './environment';

// Base URL for API endpoints
export const API_BASE_URL = resolveApiBaseUrl();

// Full API URL with base path
export const API_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
	analytics: {
		emit: `${API_BASE_URL}/api/analytics/emit`,
	},
	chat: {
		message: `${API_BASE_URL}/api/chat/message`,
	},
	user: {
		profile: `${API_BASE_URL}/api/users/profile`,
		preferences: `${API_BASE_URL}/api/users/preferences`,
	},
	budgets: {
		list: `${API_BASE_URL}/api/budgets`,
		create: `${API_BASE_URL}/api/budgets`,
		update: (id: string) => `${API_BASE_URL}/api/budgets/${id}`,
		delete: (id: string) => `${API_BASE_URL}/api/budgets/${id}`,
	},
	goals: {
		list: `${API_BASE_URL}/api/goals`,
		create: `${API_BASE_URL}/api/goals`,
		update: (id: string) => `${API_BASE_URL}/api/goals/${id}`,
		delete: (id: string) => `${API_BASE_URL}/api/goals/${id}`,
	},
	recurringExpenses: {
		list: `${API_BASE_URL}/api/recurring-expenses`,
		create: `${API_BASE_URL}/api/recurring-expenses`,
		update: (id: string) => `${API_BASE_URL}/api/recurring-expenses/${id}`,
		delete: (id: string) => `${API_BASE_URL}/api/recurring-expenses/${id}`,
	},
	profiles: {
		me: `${API_BASE_URL}/api/profiles/me`,
		user: (userId: string) => `${API_BASE_URL}/api/profiles/user/${userId}`,
	},
	weeklyReflections: {
		current: `${API_BASE_URL}/api/weekly-reflections/current`,
		save: `${API_BASE_URL}/api/weekly-reflections/save`,
		history: `${API_BASE_URL}/api/weekly-reflections/history`,
		stats: `${API_BASE_URL}/api/weekly-reflections/stats`,
	},
	// AI endpoints
	ai: {
		customGPT: {
			chat: `${API_BASE_URL}/api/custom-gpt/chat`,
			context: `${API_BASE_URL}/api/custom-gpt/context`,
		},
		tieredAI: {
			chat: `${API_BASE_URL}/api/tiered-ai/chat`,
			stats: `${API_BASE_URL}/api/tiered-ai/stats`,
		},
		enhancedAI: {
			chat: `${API_BASE_URL}/api/enhanced-ai/chat`,
			context: `${API_BASE_URL}/api/enhanced-ai/context`,
		},
		groundedAI: {
			chat: `${API_BASE_URL}/api/grounded-ai/chat`,
		},
	},
};

// API configuration
export const API_CONFIG = {
	timeout: ENV.API_TIMEOUT_MS,
	retries: 3,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
};

// Re-export environment settings for convenience
export {
	isDevelopment,
	isProduction,
	isTest,
	isDev,
	isDevMode,
	DEV_MODE,
} from './environment';
