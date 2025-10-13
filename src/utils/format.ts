/**
 * Shared formatting utilities for the app
 */

export const currency = (amount: number, currencyCode = 'USD'): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode,
		maximumFractionDigits: 0,
	}).format(amount);
};

export const percent = (value: number): string => {
	return `${Math.round(value)}%`;
};
