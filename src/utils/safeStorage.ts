// src/utils/safeStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
	// The module exists in node_modules even if native bits aren't compiled yet
	SecureStore = require('expo-secure-store');
} catch {
	SecureStore = null;
}

let secureStoreAvailablePromise: Promise<boolean> | null = null;
const isSecureStoreAvailable = async () => {
	if (!SecureStore?.isAvailableAsync) return false;
	if (!secureStoreAvailablePromise) {
		secureStoreAvailablePromise = SecureStore.isAvailableAsync().catch(
			() => false
		);
	}
	return secureStoreAvailablePromise;
};

export async function getItem(key: string): Promise<string | null> {
	try {
		if (await isSecureStoreAvailable()) {
			return await SecureStore!.getItemAsync(key);
		}
	} catch {}
	return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
	try {
		if (await isSecureStoreAvailable()) {
			await SecureStore!.setItemAsync(key, value, {
				keychainAccessible: SecureStore!.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
			});
			return;
		}
	} catch {}
	await AsyncStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
	try {
		if (await isSecureStoreAvailable()) {
			await SecureStore!.deleteItemAsync(key);
			return;
		}
	} catch {}
	await AsyncStorage.removeItem(key);
}
