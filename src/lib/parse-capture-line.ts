/**
 * Parse a single capture line like `coffee 5.75` or `paycheck 1200`.
 * Keep in sync with `apps/web/src/lib/parse-capture-line.ts`.
 */
const INCOME_HINT = /paycheck|salary|deposit|income|paid me|reimbursement|refund/i;
const NUMBER_IN_TEXT = /-?\$?\d[\d,]*(?:[.,]\d+)?/;

export function parseCaptureLine(line: string): {
	description: string;
	type: 'income' | 'expense';
	amount: number;
} | null {
	const trimmed = line.trim();
	const amountMatch = trimmed.match(NUMBER_IN_TEXT);
	if (!amountMatch || typeof amountMatch.index !== 'number') return null;

	const rawAmountText = amountMatch[0].replace('$', '');
	const amountText =
		rawAmountText.includes(',') && !rawAmountText.includes('.')
			? rawAmountText.replace(',', '.')
			: rawAmountText.replaceAll(',', '');
	const n = Number(amountText);
	const before = trimmed.slice(0, amountMatch.index).trim();
	const after = trimmed
		.slice(amountMatch.index + amountMatch[0].length)
		.trim();
	const description = before || after;
	if (!description || !Number.isFinite(n) || n === 0) return null;

	const isIncome = INCOME_HINT.test(trimmed);
	if (isIncome) {
		return { description, type: 'income', amount: Math.abs(n) };
	}
	return { description, type: 'expense', amount: -Math.abs(n) };
}
