/**
 * Input sanitization utilities
 * Provides safe input cleaning and validation for user inputs
 */

/**
 * Sanitize amount input - removes non-numeric characters except decimal point
 * and ensures only one decimal point with max 2 decimal places
 */
export function sanitizeAmount(input: string): string {
	// Remove all non-numeric except decimal point
	let cleaned = input.replace(/[^0-9.]/g, '');

	// Ensure only one decimal point
	const parts = cleaned.split('.');
	if (parts.length > 2) {
		cleaned = parts[0] + '.' + parts.slice(1).join('');
	}

	// Limit to 2 decimal places
	if (parts.length === 2 && parts[1].length > 2) {
		cleaned = parts[0] + '.' + parts[1].substring(0, 2);
	}

	return cleaned;
}

/**
 * Sanitize text input - removes potentially harmful characters
 * and limits length
 */
export function sanitizeText(input: string, maxLength: number = 100): string {
	// Remove potentially harmful characters (brackets, backslashes)
	// Note: We remove < > { } [ ] \ characters
	let cleaned = input
		.replace(/[<>{}[\]\\]/g, '') // Remove brackets and backslashes
		.trim();

	// Limit length
	if (cleaned.length > maxLength) {
		cleaned = cleaned.substring(0, maxLength);
	}

	return cleaned;
}

/**
 * Sanitize item description - specialized for purchase descriptions
 */
export function sanitizeDescription(input: string): string {
	return sanitizeText(input, 50);
}

/**
 * Format amount for display - adds currency formatting
 */
export function formatAmountForDisplay(value: string): string {
	if (!value || value.trim().length === 0) {
		return '';
	}

	// Remove any non-numeric except decimal
	const cleaned = value.replace(/[^0-9.]/g, '');

	// If nothing numeric left after cleaning, return original
	if (!cleaned || cleaned === '.' || cleaned.length === 0) {
		return value;
	}

	// Parse and format
	const num = parseFloat(cleaned);
	if (isNaN(num)) {
		// Return original if can't parse (e.g., "abc")
		return value;
	}

	// Format to 2 decimal places
	return num.toFixed(2);
}
