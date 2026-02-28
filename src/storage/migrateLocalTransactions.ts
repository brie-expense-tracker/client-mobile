/**
 * Migrate local-only transactions to the backend when user signs in.
 * Runs once after first sign-in; clears local data only on full success.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services';
import {
	loadTransactions,
	saveTransactions,
} from './localTransactionStorage';
import type { Transaction } from '../context/transactionContext';

const MIGRATED_KEY = 'brie_local_migrated';

/**
 * Clear the migration flag so that the next sign-in will run migration again
 * if there are local transactions (e.g. after switching accounts).
 * Call this on logout so local data can migrate to the new account.
 */
export async function clearLocalMigrationFlag(): Promise<void> {
	try {
		await AsyncStorage.removeItem(MIGRATED_KEY);
	} catch {
		// ignore
	}
}

function toPayload(tx: Transaction): Omit<Transaction, 'id'> {
	return {
		description: tx.description,
		amount: tx.amount,
		date: tx.date,
		type: tx.type,
		target: tx.target,
		targetModel: tx.targetModel,
		recurringPattern: tx.recurringPattern,
		notes: tx.notes,
		source: tx.source ?? 'manual',
		vendor: tx.vendor,
		metadata: tx.metadata,
	};
}

export async function hasLocalTransactionsToMigrate(): Promise<boolean> {
	try {
		const migrated = await AsyncStorage.getItem(MIGRATED_KEY);
		if (migrated === 'true') return false;
		const list = await loadTransactions();
		return list.length > 0;
	} catch {
		return false;
	}
}

/**
 * Load local transactions, POST each to the API, then clear local storage
 * and set migrated flag. Only clears local data if every POST succeeds.
 */
export async function migrateLocalTransactionsToBackend(): Promise<{
	success: boolean;
	migratedCount: number;
	error?: string;
}> {
	try {
		const alreadyMigrated = await AsyncStorage.getItem(MIGRATED_KEY);
		if (alreadyMigrated === 'true') {
			return { success: true, migratedCount: 0 };
		}

		const local = await loadTransactions();
		if (local.length === 0) {
			await AsyncStorage.setItem(MIGRATED_KEY, 'true');
			return { success: true, migratedCount: 0 };
		}

		let migratedCount = 0;
		for (const tx of local) {
			const payload = toPayload(tx);
			const response = await ApiService.post<any>(
				'/api/transactions',
				payload
			);
			if (!response.success) {
				throw new Error(
					response.error || `Failed to upload transaction: ${tx.id}`
				);
			}
			migratedCount += 1;
		}

		await saveTransactions([]);
		await AsyncStorage.setItem(MIGRATED_KEY, 'true');
		return { success: true, migratedCount };
	} catch (err: any) {
		const message = err?.message || String(err);
		return {
			success: false,
			migratedCount: 0,
			error: message,
		};
	}
}
