/**
 * CSV export aligned with `apps/web/src/lib/export-csv.ts`.
 */
import type { Transaction } from '../context/transactionContext';

export type ExportableTransaction = {
	_id: string;
	description?: string;
	amount: number;
	type?: 'income' | 'expense';
	date?: string;
	metadata?: { category?: string; account?: string };
};

function csvEscape(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function line(cells: string[]): string {
	return cells.map(csvEscape).join(',');
}

function categoryFor(tx: ExportableTransaction): string {
	return (
		tx.metadata?.category || (tx.type === 'income' ? 'Income' : 'Expense')
	);
}

/** UTF-8 with BOM so Excel opens special characters reliably. */
export function transactionsToCsv(rows: ExportableTransaction[]): string {
	const header = [
		'id',
		'date',
		'description',
		'amount',
		'type',
		'category',
		'account',
	];
	const lines = [line(header)];
	for (const tx of rows) {
		const amount =
			typeof tx.amount === 'number' ? tx.amount : Number(tx.amount);
		lines.push(
			line([
				String(tx._id),
				tx.date ?? '',
				(tx.description ?? '').trim() || 'Entry',
				Number.isFinite(amount) ? String(amount) : '',
				tx.type ?? '',
				categoryFor(tx),
				tx.metadata?.account ?? '',
			]),
		);
	}
	return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function transactionToExportable(tx: Transaction): ExportableTransaction {
	return {
		_id: tx.id,
		description: tx.description,
		amount: tx.amount,
		type: tx.type,
		date: tx.date,
		metadata: tx.metadata
			? {
					category: tx.metadata.category,
					account: undefined,
				}
			: undefined,
	};
}

function startOfDayLocal(ymd: string): Date {
	const [y, m, d] = ymd.split('-').map((n) => Number(n));
	return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function endOfDayLocal(ymd: string): Date {
	const [y, m, d] = ymd.split('-').map((n) => Number(n));
	return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
}

export function sortByDateDesc(
	txs: ExportableTransaction[],
): ExportableTransaction[] {
	return [...txs].sort((a, b) => {
		const ta = a.date ? new Date(a.date).getTime() : NaN;
		const tb = b.date ? new Date(b.date).getTime() : NaN;
		const aVal = Number.isFinite(ta) ? ta : 0;
		const bVal = Number.isFinite(tb) ? tb : 0;
		if (bVal !== aVal) return bVal - aVal;
		return String(b._id).localeCompare(String(a._id));
	});
}

export function filterExportByRange(
	rows: ExportableTransaction[],
	fromYmd: string,
	toYmd: string,
): ExportableTransaction[] {
	const from = fromYmd.trim();
	const to = toYmd.trim();
	if (!from && !to) return rows;

	const fromMs = from ? startOfDayLocal(from).getTime() : -Infinity;
	const toMs = to ? endOfDayLocal(to).getTime() : Infinity;

	return rows.filter((tx) => {
		if (!tx.date) return false;
		const t = new Date(tx.date).getTime();
		if (!Number.isFinite(t)) return false;
		return t >= fromMs && t <= toMs;
	});
}

export function stampForFilename(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
