/**
 * Local transaction storage - MVP no-login mode.
 * Data stays on device. Optional cloud sync can be added later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '../context/transactionContext';

const STORAGE_KEY = 'brie_transactions';

function formatFromStorage(raw: any): Transaction {
	const amount =
		raw.amount != null ? Number(raw.amount) : raw.type === 'income' ? 0 : 0;
	return {
		id: raw.id ?? '',
		description: raw.description,
		amount,
		date: raw.date ?? new Date().toISOString().split('T')[0],
		type: raw.type ?? (amount < 0 ? 'expense' : 'income'),
		target: raw.target,
		targetModel: raw.targetModel,
		updatedAt: raw.updatedAt ?? new Date().toISOString(),
		recurringPattern: raw.recurringPattern,
		notes: raw.notes,
		source: raw.source ?? 'manual',
		vendor: raw.vendor,
		metadata: raw.metadata,
	};
}

export async function loadTransactions(): Promise<Transaction[]> {
	try {
		const json = await AsyncStorage.getItem(STORAGE_KEY);
		if (!json) return [];
		const parsed = JSON.parse(json);
		const arr = Array.isArray(parsed) ? parsed : [];
		return arr.map(formatFromStorage);
	} catch (err) {
		console.warn('[LocalTransactionStorage] load failed:', err);
		return [];
	}
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
	try {
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
	} catch (err) {
		console.warn('[LocalTransactionStorage] save failed:', err);
		throw err;
	}
}

export function generateLocalId(): string {
	return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
