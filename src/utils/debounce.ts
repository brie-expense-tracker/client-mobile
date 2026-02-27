/**
 * Debounce: delay invoking a function until after a wait period has elapsed
 * since the last call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	waitMs: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return (...args: Parameters<T>) => {
		if (timeoutId != null) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			timeoutId = null;
			fn(...args);
		}, waitMs);
	};
}
