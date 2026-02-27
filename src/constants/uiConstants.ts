/**
 * UI constants and helpers used by app screens.
 */

/** Normalize icon name for Ionicons (e.g. ensure valid format). Returns as-is if already valid. */
export function normalizeIconName(name: string): string {
	if (typeof name !== 'string' || !name.trim()) {
		return 'ellipse-outline';
	}
	const normalized = name.trim();
	// Ionicons expect kebab-case; pass through as-is (callers use valid names like 'trash-outline')
	return normalized;
}
