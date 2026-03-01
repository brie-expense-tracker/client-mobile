export type DebouncedFn<T extends (...args: any[]) => any> = ((
	...args: Parameters<T>
) => void) & { cancel: () => void };

/**
 * Debounce: delay invoking a function until after a wait period has elapsed
 * since the last call.
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	waitMs: number
): DebouncedFn<T> {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const debounced = (...args: Parameters<T>) => {
		if (timeoutId != null) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			timeoutId = null;
			fn(...args);
		}, waitMs);
	};
	debounced.cancel = () => {
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};
	return debounced as DebouncedFn<T>;
}
