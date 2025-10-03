import { NotificationData } from '../index';

/**
 * Normalized response shape for notifications
 */
export type NotificationsPage = {
	items: NotificationData[];
	nextPage?: number; // undefined = no more pages
	total?: number;
	hasMore: boolean;
};

/**
 * Normalize notifications API response to handle various response shapes
 * This prevents "length of undefined" crashes
 */
export function normalizeNotificationsResponse(
	raw: any,
	currentPage: number
): NotificationsPage {
	// Accept multiple possible shapes safely
	const items = Array.isArray(raw?.items)
		? raw.items
		: Array.isArray(raw?.notifications)
		? raw.notifications
		: Array.isArray(raw?.data)
		? raw.data
		: Array.isArray(raw)
		? raw
		: [];

	// Detect pagination hints across shapes
	const total = typeof raw?.total === 'number' ? raw.total : undefined;

	// Try common patterns for "has more"
	const hasMore =
		raw?.hasMore === true ||
		typeof raw?.nextPage === 'number' ||
		(typeof raw?.meta?.hasMore === 'boolean'
			? raw.meta.hasMore
			: items.length > 0); // Default: if we got items, assume there might be more

	const nextPage =
		typeof raw?.nextPage === 'number'
			? raw.nextPage
			: raw?.meta?.nextPage ?? (hasMore ? currentPage + 1 : undefined);

	return { items, nextPage, total, hasMore };
}

/**
 * Normalize unread count response
 */
export function normalizeUnreadCountResponse(raw: any): number {
	if (typeof raw?.count === 'number') return raw.count;
	if (typeof raw?.unreadCount === 'number') return raw.unreadCount;
	if (typeof raw?.total === 'number') return raw.total;
	if (typeof raw === 'number') return raw;
	return 0;
}

/**
 * Safe array length check - never throws
 */
export function safeArrayLength(arr: any): number {
	if (!Array.isArray(arr)) return 0;
	return arr.length;
}

/**
 * Safe property access - prevents undefined crashes
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
	try {
		const keys = path.split('.');
		let result = obj;
		for (const key of keys) {
			if (result == null) return defaultValue;
			result = result[key];
		}
		return result ?? defaultValue;
	} catch {
		return defaultValue;
	}
}
