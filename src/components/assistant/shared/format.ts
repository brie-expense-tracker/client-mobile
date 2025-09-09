// assistant/format.ts - Reusable formatting utilities
export const $ = (n: number, c = 'USD') =>
	new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: c,
		maximumFractionDigits: 0,
	}).format(n);

export const pct = (n: number) => `${Math.round(n)}%`;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x ?? 0));
