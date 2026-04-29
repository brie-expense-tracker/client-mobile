/**
 * 7-day rollups aligned with `apps/web/src/components/week/week-from-server.tsx`.
 */
import type { Transaction } from '../context/transactionContext';

export type WeekTotals = {
	in: number;
	out: number;
	net: number;
};

export type WeekCategorySlice = {
	category: string;
	amount: number;
	pct: number;
};

function isWithinLastSevenDays(iso?: string): boolean {
	if (!iso) return false;
	const time = new Date(iso).getTime();
	if (!Number.isFinite(time)) return false;
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	return Date.now() - time <= sevenDaysMs;
}

function amountByType(tx: Pick<Transaction, 'amount' | 'type'>): {
	inValue: number;
	outValue: number;
} {
	const raw = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount);
	const safe = Number.isFinite(raw) ? raw : 0;
	if (tx.type === 'income') return { inValue: Math.abs(safe), outValue: 0 };
	if (tx.type === 'expense') return { inValue: 0, outValue: Math.abs(safe) };
	if (safe >= 0) return { inValue: safe, outValue: 0 };
	return { inValue: 0, outValue: Math.abs(safe) };
}

export function summarizeWeekTransactions(txs: Transaction[]): {
	totals: WeekTotals;
	categories: WeekCategorySlice[];
} {
	let totalIn = 0;
	let totalOut = 0;
	const categoryTotals = new Map<string, number>();

	for (const tx of txs) {
		if (!isWithinLastSevenDays(tx.date)) continue;
		const { inValue, outValue } = amountByType(tx);
		totalIn += inValue;
		totalOut += outValue;

		if (outValue > 0) {
			const category = tx.metadata?.category?.trim() || 'Uncategorized';
			categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + outValue);
		}
	}

	const categories = [...categoryTotals.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([category, amount]) => ({
			category,
			amount,
			pct: totalOut > 0 ? Math.round((amount / totalOut) * 100) : 0,
		}));

	return {
		totals: {
			in: totalIn,
			out: totalOut,
			net: totalIn - totalOut,
		},
		categories,
	};
}
