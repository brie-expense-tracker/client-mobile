import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileContext {
	lastAction: string;
	actionTaken: boolean;
	timestamp: string;
	profileSnapshot: {
		income?: number;
		savings?: number;
		debt?: number;
		expenses?: any;
	};
	recentUpdates: any[];
}

interface UseProfileContextReturn {
	profileContext: ProfileContext | null;
	loading: boolean;
	error: string | null;
	refreshContext: () => Promise<void>;
	clearContext: () => Promise<void>;
	hasRecentUpdates: boolean;
}

export const useProfileContext = (): UseProfileContextReturn => {
	const [profileContext, setProfileContext] = useState<ProfileContext | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadContext = async () => {
		try {
			setLoading(true);
			setError(null);

			const contextData = await AsyncStorage.getItem('aiProfileContext');
			if (contextData) {
				const parsed = JSON.parse(contextData);
				setProfileContext(parsed);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load profile context'
			);
		} finally {
			setLoading(false);
		}
	};

	const refreshContext = async () => {
		await loadContext();
	};

	const clearContext = async () => {
		try {
			await AsyncStorage.removeItem('aiProfileContext');
			setProfileContext(null);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to clear profile context'
			);
		}
	};

	// Check if there are recent updates (within last 24 hours)
	const hasRecentUpdates = profileContext
		? Date.now() - new Date(profileContext.timestamp).getTime() <
		  24 * 60 * 60 * 1000
		: false;

	useEffect(() => {
		loadContext();
	}, []);

	return {
		profileContext,
		loading,
		error,
		refreshContext,
		clearContext,
		hasRecentUpdates,
	};
};
