/**
 * Persists "use local mode" (no account) preference.
 * When true, user can use app without signing in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_MODE_KEY = 'brie_use_local';

export async function getUseLocalMode(): Promise<boolean> {
	try {
		const v = await AsyncStorage.getItem(LOCAL_MODE_KEY);
		return v === 'true';
	} catch {
		return false;
	}
}

export async function setUseLocalMode(value: boolean): Promise<void> {
	try {
		await AsyncStorage.setItem(LOCAL_MODE_KEY, value ? 'true' : 'false');
	} catch (err) {
		console.warn('[localModeStorage] set failed:', err);
	}
}
