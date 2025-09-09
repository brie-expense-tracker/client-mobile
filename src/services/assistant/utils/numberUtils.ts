// Robust number and currency parsing utilities
// Handles international formats, percentages, and various number representations

export interface NumberParseResult {
	value: number;
	original: string;
	currency?: string;
	percentage?: number;
}

/**
 * Convert raw string to number, handling currency symbols, commas, and various formats
 */
export function toNumber(raw: string): number | null {
	if (!raw) return null;

	const cleaned = raw
		.replace(/[$€£¥₹, ]/g, '') // remove currency symbols, commas, spaces
		.replace(/[–—]/g, '-') // normalize dashes
		.replace(/k$/i, '000') // handle "5k" -> "5000"
		.replace(/m$/i, '000000') // handle "2m" -> "2000000"
		.trim();

	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

/**
 * Extract percentage from string (supports "15%", "15 percent", "15 pct")
 */
export function extractPercent(s: string): number | null {
	const m = s.match(/(\d+(?:\.\d+)?)\s*(%|percent|pct)\b/i);
	return m ? Number(m[1]) : null;
}

/**
 * Parse currency amount with symbol detection
 */
export function parseCurrency(raw: string): NumberParseResult | null {
	if (!raw) return null;

	// Extract currency symbol
	const currencyMatch = raw.match(/^([$€£¥₹])\s*(.+)$/);
	const currency = currencyMatch?.[1];
	const amountStr = currencyMatch?.[2] || raw;

	const value = toNumber(amountStr);
	if (value === null) return null;

	return {
		value,
		original: raw,
		currency: currency || undefined,
	};
}

/**
 * Parse percentage calculation like "15% of 2000"
 */
export function parsePercentageCalculation(
	text: string
): { percent: number; amount: number } | null {
	const match = text.match(
		/what(?:'s| is)?\s+(\d+(?:\.\d+)?)\s*(?:%|percent|pct)\s+of\s+\$?([\d.,]+)/i
	);
	if (!match) return null;

	const percent = Number(match[1]);
	const amount = toNumber(match[2]);

	if (amount === null) return null;

	return { percent, amount };
}

/**
 * Parse emergency fund calculation like "3-month emergency fund"
 */
export function parseEmergencyFund(text: string): { months: number } | null {
	const match = text.match(
		/(?:how much|what).*(\d+|one|two|three|four|five|six)\s*[- ]?(?:mo|month|months)/i
	);
	if (!match) return null;

	const months = wordToNumber(match[1]);
	return months ? { months } : null;
}

/**
 * Convert word numbers to digits
 */
function wordToNumber(word: string): number | null {
	const wordMap: Record<string, number> = {
		one: 1,
		two: 2,
		three: 3,
		four: 4,
		five: 5,
		six: 6,
		seven: 7,
		eight: 8,
		nine: 9,
		ten: 10,
	};

	const lower = word.toLowerCase();
	return wordMap[lower] || Number(word) || null;
}

/**
 * Format number with locale and currency
 */
export function formatCurrency(
	amount: number,
	locale: string = 'en-US',
	currency: string = 'USD'
): string {
	const formatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});

	return formatter.format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Normalize text for consistent parsing
 */
export function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
		.replace(/\s+/g, ' ') // collapse multiple spaces
		.trim();
}
