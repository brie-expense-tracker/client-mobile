/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	immediate?: boolean
): T & { cancel: () => void } {
	let timeout: NodeJS.Timeout | null = null;
	let result: ReturnType<T>;

	const debounced = function (this: any, ...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			if (!immediate) result = func.apply(this, args);
		};

		const callNow = immediate && !timeout;

		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow) result = func.apply(this, args);

		return result;
	};

	debounced.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced as T & { cancel: () => void };
}

/**
 * Throttle utility function
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): T & { cancel: () => void } {
	let timeout: NodeJS.Timeout | null = null;
	let previous = 0;

	const throttled = function (this: any, ...args: Parameters<T>) {
		const now = Date.now();
		const remaining = wait - (now - previous);

		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			return func.apply(this, args);
		} else if (!timeout) {
			timeout = setTimeout(() => {
				previous = Date.now();
				timeout = null;
				func.apply(this, args);
			}, remaining);
		}
	};

	throttled.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		previous = 0;
	};

	return throttled as T & { cancel: () => void };
}
