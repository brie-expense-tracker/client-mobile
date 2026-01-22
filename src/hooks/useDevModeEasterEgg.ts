import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_EASTER_EGG_KEY = '@dev_mode_easter_egg_enabled';
const TAP_COUNT_THRESHOLD = 7;
const TAP_RESET_TIMEOUT = 2000; // Reset tap count after 2 seconds of inactivity

/**
 * Hook to manage the "tap logo 7 times" easter egg for showing dev mode badge
 * This allows internal builds to show dev mode badge only when explicitly enabled
 */
export function useDevModeEasterEgg() {
	const [isEnabled, setIsEnabled] = useState<boolean | null>(null); // null = loading
	const [tapCount, setTapCount] = useState(0);
	const [tapTimeout, setTapTimeout] = useState<NodeJS.Timeout | null>(null);

	// Load saved preference on mount
	useEffect(() => {
		const loadPreference = async () => {
			try {
				const saved = await AsyncStorage.getItem(DEV_MODE_EASTER_EGG_KEY);
				setIsEnabled(saved === 'true');
			} catch (error) {
				console.error('Error loading dev mode easter egg preference:', error);
				setIsEnabled(false);
			}
		};
		loadPreference();
	}, []);

	// Save preference when it changes
	const savePreference = useCallback(async (enabled: boolean) => {
		try {
			await AsyncStorage.setItem(DEV_MODE_EASTER_EGG_KEY, enabled.toString());
			setIsEnabled(enabled);
		} catch (error) {
			console.error('Error saving dev mode easter egg preference:', error);
		}
	}, []);

	// Handle logo tap
	const handleLogoTap = useCallback(() => {
		// Clear existing timeout
		if (tapTimeout) {
			clearTimeout(tapTimeout);
		}

		const newTapCount = tapCount + 1;
		setTapCount(newTapCount);

		// If we've reached the threshold, toggle the dev mode visibility
		if (newTapCount >= TAP_COUNT_THRESHOLD) {
			savePreference(!isEnabled);
			setTapCount(0);
		} else {
			// Set timeout to reset tap count if user stops tapping
			const timeout = setTimeout(() => {
				setTapCount(0);
			}, TAP_RESET_TIMEOUT);
			setTapTimeout(timeout);
		}
	}, [tapCount, tapTimeout, isEnabled, savePreference]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (tapTimeout) {
				clearTimeout(tapTimeout);
			}
		};
	}, [tapTimeout]);

	return {
		isEnabled: isEnabled ?? false, // Default to false while loading
		handleLogoTap,
		tapCount, // Expose for debugging/visual feedback if needed
	};
}
