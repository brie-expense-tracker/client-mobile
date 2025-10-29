import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createLogger } from '../utils/sublogger';

const dataFetchingLog = createLogger('useDataFetching');

// ==========================================
// Types
// ==========================================
export interface DataFetchingError {
	message: string;
	type: 'network' | 'server' | 'validation' | 'permission' | 'unknown';
	code?: string | number;
	retryable: boolean;
	timestamp: Date;
}

export interface DataFetchingState<T> {
	data: T[];
	isLoading: boolean;
	hasLoaded: boolean;
	error: DataFetchingError | null;
	lastRefreshed: Date | null;
	isOffline: boolean;
	retryCount: number;
	cacheExpiry: Date | null;
	// Pagination state
	hasMore: boolean;
	isLoadingMore: boolean;
	currentPage: number;
	totalPages: number;
	totalItems: number;
}

export interface DataFetchingActions<T> {
	refetch: () => Promise<void>;
	addItem: (item: T) => Promise<T>;
	updateItem: (id: string, updates: Partial<T>) => Promise<T>;
	deleteItem: (id: string) => Promise<void>;
	clearError: () => void;
	retry: () => Promise<void>;
	clearCache: () => void;
	// Pagination actions
	loadMore: () => Promise<void>;
	resetPagination: () => void;
}

export interface PaginatedResponse<T> {
	data: T[];
	page: number;
	totalPages: number;
	totalItems: number;
	hasMore: boolean;
}

export interface UseDataFetchingOptions<T> {
	fetchFunction: () => Promise<T[] | PaginatedResponse<T>>;
	addFunction?: (item: T) => Promise<T>;
	updateFunction?: (id: string, updates: Partial<T>) => Promise<T>;
	deleteFunction?: (id: string) => Promise<void>;
	autoRefresh?: boolean;
	refreshOnFocus?: boolean;
	initialData?: T[];
	transformData?: (data: T[]) => T[];
	cacheTTL?: number; // Cache time-to-live in milliseconds
	maxRetries?: number; // Maximum number of retry attempts
	retryDelay?: number; // Delay between retries in milliseconds
	enableOfflineQueue?: boolean; // Enable offline operation queuing
	// Pagination options
	enablePagination?: boolean; // Enable pagination support
	pageSize?: number; // Number of items per page
	loadMoreFunction?: (
		page: number,
		pageSize: number
	) => Promise<PaginatedResponse<T>>;
}

// ==========================================
// Hook
// ==========================================
export function useDataFetching<T extends { id: string }>(
	options: UseDataFetchingOptions<T>
): DataFetchingState<T> & DataFetchingActions<T> {
	const {
		fetchFunction,
		addFunction,
		updateFunction,
		deleteFunction,
		autoRefresh = true,
		refreshOnFocus = true,
		initialData = [],
		transformData,
		cacheTTL = 5 * 60 * 1000, // 5 minutes default
		maxRetries = 3,
		retryDelay = 1000, // 1 second
		enableOfflineQueue = true,
		enablePagination = false,
		pageSize = 20,
		loadMoreFunction,
	} = options;

	// ==========================================
	// State Management
	// ==========================================
	const [data, setData] = useState<T[]>(initialData);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [error, setError] = useState<DataFetchingError | null>(null);
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
	const [isOffline, setIsOffline] = useState(false);
	const [retryCount, setRetryCount] = useState(0);
	const [cacheExpiry, setCacheExpiry] = useState<Date | null>(null);
	// Pagination state
	const [hasMore, setHasMore] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [totalItems, setTotalItems] = useState(0);

	// Use refs to track if we've already fetched to prevent duplicate calls
	const hasInitialFetch = useRef(false);
	const isInitialMount = useRef(true);
	const isFetching = useRef(false); // Prevent concurrent fetches
	const offlineQueue = useRef<(() => Promise<any>)[]>([]); // Queue for offline operations
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastFetchTime = useRef<number>(0); // Track last fetch time for debouncing
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// ==========================================
	// Helper Functions
	// ==========================================
	const isCacheValid = useCallback(() => {
		if (!cacheExpiry) return false;
		return new Date() < cacheExpiry;
	}, [cacheExpiry]);

	const categorizeError = useCallback((error: any): DataFetchingError => {
		const message =
			error?.message || error?.toString() || 'An unknown error occurred';
		const code = error?.code || error?.status || error?.statusCode;
		const timestamp = new Date();

		// Authentication errors - don't retry, just return empty data
		if (
			error?.message?.includes('User not authenticated') ||
			error?.message?.includes('no Firebase user found') ||
			error?.isAuthError
		) {
			return {
				message: 'User not authenticated',
				type: 'permission',
				code: 401,
				retryable: false,
				timestamp,
			};
		}

		// Network errors
		if (
			error?.code === 'NETWORK_ERROR' ||
			error?.message?.includes('Network Error') ||
			error?.message?.includes('fetch') ||
			error?.message?.includes('timeout') ||
			(error?.name === 'TypeError' && error?.message?.includes('fetch'))
		) {
			return {
				message:
					'Network connection failed. Please check your internet connection.',
				type: 'network',
				code,
				retryable: true,
				timestamp,
			};
		}

		// Server errors (5xx)
		if (code >= 500 && code < 600) {
			return {
				message: 'Server error occurred. Please try again later.',
				type: 'server',
				code,
				retryable: true,
				timestamp,
			};
		}

		// Client errors (4xx)
		if (code >= 400 && code < 500) {
			if (code === 401 || code === 403) {
				return {
					message: 'Access denied. Please check your permissions.',
					type: 'permission',
					code,
					retryable: false,
					timestamp,
				};
			}

			if (code === 422) {
				return {
					message: 'Invalid data provided. Please check your input.',
					type: 'validation',
					code,
					retryable: false,
					timestamp,
				};
			}

			return {
				message: 'Request failed. Please check your input and try again.',
				type: 'server',
				code,
				retryable: false,
				timestamp,
			};
		}

		// Default to unknown error
		return {
			message,
			type: 'unknown',
			code,
			retryable: true,
			timestamp,
		};
	}, []);

	const processOfflineQueue = useCallback(async () => {
		if (offlineQueue.current.length === 0) return;

		dataFetchingLog.debug(`Processing ${offlineQueue.current.length} queued operations...`);
		const operations = [...offlineQueue.current];
		offlineQueue.current = [];

		for (const operation of operations) {
			try {
				await operation();
			} catch (error) {
				dataFetchingLog.error('Failed to process queued operation', error);
			}
		}
	}, []);

	// ==========================================
	// Memoized Data
	// ==========================================
	const transformedData = useMemo(() => {
		return transformData ? transformData(data) : data;
	}, [data, transformData]);

	// ==========================================
	// Core Fetch Function with Deduplication, Caching, and Retry Logic
	// ==========================================
	const refetch = useCallback(
		async (forceRefresh = false) => {
			// Prevent concurrent fetches
			if (isFetching.current) {
				dataFetchingLog.debug('Fetch already in progress, skipping...');
				return;
			}

			// Check cache validity
			if (!forceRefresh && isCacheValid()) {
				dataFetchingLog.debug('Using cached data');
				return;
			}

			try {
				isFetching.current = true;
				setIsLoading(true);
				setError(null);
				setIsOffline(false);

				dataFetchingLog.debug('Fetching data...');
				const result = await fetchFunction();

				// Handle both paginated and non-paginated responses
				if (
					enablePagination &&
					'data' in result &&
					Array.isArray(result.data)
				) {
					// Paginated response
					const paginatedResult = result as PaginatedResponse<T>;
					dataFetchingLog.debug(
						`Paginated data received: ${paginatedResult.data.length} items (page ${paginatedResult.page}/${paginatedResult.totalPages})`
					);
					setData(paginatedResult.data);
					setHasMore(paginatedResult.hasMore);
					setCurrentPage(paginatedResult.page);
					setTotalPages(paginatedResult.totalPages);
					setTotalItems(paginatedResult.totalItems);
				} else {
					// Non-paginated response (array)
					const arrayResult = result as T[];
					dataFetchingLog.debug(`Data received: ${arrayResult.length} items`);
					setData(arrayResult);
					setHasMore(false);
					setCurrentPage(1);
					setTotalPages(1);
					setTotalItems(arrayResult.length);
				}

				setHasLoaded(true);
				setLastRefreshed(new Date());
				setCacheExpiry(new Date(Date.now() + cacheTTL));
				setRetryCount(0);

				// Process any queued offline operations
				await processOfflineQueue();
			} catch (err) {
				dataFetchingLog.error('Error fetching data', err);
				const categorizedError = categorizeError(err);

				// For authentication errors, don't set error state, just return empty data
				if (
					categorizedError.type === 'permission' &&
					categorizedError.code === 401
				) {
					dataFetchingLog.debug('User not authenticated, returning empty data');
					setData([]);
					setHasLoaded(true);
					setError(null); // Don't show error for auth issues
					setRetryCount(0);
					return;
				}

				setError(categorizedError);

				// Check if it's a retryable error
				if (categorizedError.retryable && retryCount < maxRetries) {
					const newRetryCount = retryCount + 1;
					setRetryCount(newRetryCount);

					dataFetchingLog.debug(
						`Retrying in ${retryDelay}ms (attempt ${newRetryCount}/${maxRetries}) - ${categorizedError.type} error`
					);

					retryTimeoutRef.current = setTimeout(() => {
						refetch(true);
					}, retryDelay) as unknown as NodeJS.Timeout;

					return;
				}

				// Set offline state for network errors
				if (categorizedError.type === 'network') {
					setIsOffline(true);
				}

				// Set hasLoaded to true even on error to prevent infinite loading
				setHasLoaded(true);

				// Set empty data on error to show appropriate UI
				setData([]);
			} finally {
				setIsLoading(false);
				isFetching.current = false;
			}
		},
		[
			fetchFunction,
			isCacheValid,
			cacheTTL,
			retryCount,
			maxRetries,
			retryDelay,
			categorizeError,
			processOfflineQueue,
			enablePagination,
		]
	);

	// Debounced refetch to prevent rapid successive calls
	const debouncedRefetch = useCallback(
		(forceRefresh = false) => {
			const now = Date.now();
			const timeSinceLastFetch = now - lastFetchTime.current;
			const minInterval = 2000; // Minimum 2 seconds between fetches

			// Clear any existing debounce timeout
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}

			// If enough time has passed, fetch immediately
			if (timeSinceLastFetch >= minInterval || forceRefresh) {
				lastFetchTime.current = now;
				refetch(forceRefresh);
			} else {
				// Otherwise, debounce the request
				const remainingTime = minInterval - timeSinceLastFetch;
				debounceTimeoutRef.current = setTimeout(() => {
					lastFetchTime.current = Date.now();
					refetch(forceRefresh);
				}, remainingTime);
			}
		},
		[refetch]
	);

	// ==========================================
	// CRUD Operations
	// ==========================================
	const addItem = useCallback(
		async (item: T): Promise<T> => {
			if (!addFunction) {
				throw new Error('Add function not provided');
			}

			// Optimistic update
			const tempId = `temp_${Date.now()}_${Math.random()}`;
			const optimisticItem = { ...item, id: tempId };
			setData((prev) => [...prev, optimisticItem]);

			const performAdd = async () => {
				try {
					setError(null);
					const newItem = await addFunction(item);

					// Replace optimistic update with real data
					setData((prev) =>
						prev.map((existingItem) =>
							existingItem.id === tempId ? newItem : existingItem
						)
					);
					dataFetchingLog.debug('Item added successfully');
					return newItem;
				} catch (err) {
					dataFetchingLog.error('Error adding item', err);

					// Remove optimistic update on error
					setData((prev) =>
						prev.filter((existingItem) => existingItem.id !== tempId)
					);

					const categorizedError = categorizeError(err);

					if (categorizedError.type === 'network' && enableOfflineQueue) {
						// Queue for retry when online
						offlineQueue.current.push(performAdd);
						setIsOffline(true);
						dataFetchingLog.debug('Queued add operation for when online');
						return optimisticItem; // Return optimistic item for UI
					}

					setError(categorizedError);
					throw err;
				}
			};

			return performAdd();
		},
		[addFunction, categorizeError, enableOfflineQueue]
	);

	const updateItem = useCallback(
		async (id: string, updates: Partial<T>): Promise<T> => {
			if (!updateFunction) {
				throw new Error('Update function not provided');
			}

			// Find the original item for optimistic update
			// Check both id and _id fields to handle MongoDB _id fields
			const originalItem = data.find(
				(item) => item.id === id || (item as any)._id === id
			);
			if (!originalItem) {
				dataFetchingLog.error('Item not found for update', {
					searchingForId: id,
					availableIds: data.map((item) => ({
						id: item.id,
						_id: (item as any)._id,
					})),
				});
				throw new Error('Item not found');
			}

			// Optimistic update
			const optimisticItem = { ...originalItem, ...updates };
			setData((prev) =>
				prev.map((item) =>
					item.id === id || (item as any)._id === id ? optimisticItem : item
				)
			);

			const performUpdate = async () => {
				try {
					setError(null);
					const updatedItem = await updateFunction(id, updates);

					// Replace optimistic update with real data
					setData((prev) =>
						prev.map((item) =>
							item.id === id || (item as any)._id === id ? updatedItem : item
						)
					);
					dataFetchingLog.debug('Item updated successfully');
					return updatedItem;
				} catch (err) {
					dataFetchingLog.error('Error updating item', err);

					// Revert optimistic update on error
					setData((prev) =>
						prev.map((item) =>
							item.id === id || (item as any)._id === id ? originalItem : item
						)
					);

					const categorizedError = categorizeError(err);

					if (categorizedError.type === 'network' && enableOfflineQueue) {
						// Queue for retry when online
						offlineQueue.current.push(performUpdate);
						setIsOffline(true);
						dataFetchingLog.debug('Queued update operation for when online');
						return optimisticItem; // Return optimistic item for UI
					}

					setError(categorizedError);
					throw err;
				}
			};

			return performUpdate();
		},
		[updateFunction, data, categorizeError, enableOfflineQueue]
	);

	const deleteItem = useCallback(
		async (id: string): Promise<void> => {
			if (!deleteFunction) {
				throw new Error('Delete function not provided');
			}

			// Find the original item for potential rollback
			// Check both id and _id fields to handle MongoDB _id fields
			const originalItem = data.find(
				(item) => item.id === id || (item as any)._id === id
			);
			if (!originalItem) {
				dataFetchingLog.error('Item not found for deletion', {
					searchingForId: id,
					availableIds: data.map((item) => ({
						id: item.id,
						_id: (item as any)._id,
					})),
				});
				throw new Error('Item not found');
			}

			// Optimistic update
			setData((prev) =>
				prev.filter((item) => item.id !== id && (item as any)._id !== id)
			);

			const performDelete = async () => {
				try {
					setError(null);
					await deleteFunction(id);
					dataFetchingLog.debug('Item deleted successfully');
				} catch (err) {
					dataFetchingLog.error('Error deleting item', err);

					// Revert optimistic update on error
					setData((prev) => [...prev, originalItem]);

					const categorizedError = categorizeError(err);

					if (categorizedError.type === 'network' && enableOfflineQueue) {
						// Queue for retry when online
						offlineQueue.current.push(performDelete);
						setIsOffline(true);
						dataFetchingLog.debug('Queued delete operation for when online');
						return; // Don't throw error for offline queued operations
					}

					setError(categorizedError);
					throw err;
				}
			};

			return performDelete();
		},
		[deleteFunction, data, categorizeError, enableOfflineQueue]
	);

	const clearError = useCallback(() => {
		setError(null);
		setRetryCount(0);
	}, []);

	const retry = useCallback(async () => {
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		setRetryCount(0);
		await refetch(true);
	}, [refetch]);

	const clearCache = useCallback(() => {
		setCacheExpiry(null);
		setData(initialData);
		setHasLoaded(false);
		setLastRefreshed(null);
	}, [initialData]);

	const loadMore = useCallback(async () => {
		if (!enablePagination || !loadMoreFunction || !hasMore || isLoadingMore) {
			return;
		}

		try {
			setIsLoadingMore(true);
			setError(null);

			const nextPage = currentPage + 1;
			dataFetchingLog.debug(`Loading more data (page ${nextPage})...`);

			const result = await loadMoreFunction(nextPage, pageSize);

			dataFetchingLog.debug(
				`More data received: ${result.data.length} items (page ${result.page}/${result.totalPages})`
			);

			// Append new data to existing data
			setData((prev) => [...prev, ...result.data]);
			setHasMore(result.hasMore);
			setCurrentPage(result.page);
			setTotalPages(result.totalPages);
			setTotalItems(result.totalItems);
		} catch (err) {
			dataFetchingLog.error('Error loading more data', err);
			const categorizedError = categorizeError(err);
			setError(categorizedError);
		} finally {
			setIsLoadingMore(false);
		}
	}, [
		enablePagination,
		loadMoreFunction,
		hasMore,
		isLoadingMore,
		currentPage,
		pageSize,
		categorizeError,
	]);

	const resetPagination = useCallback(() => {
		setCurrentPage(1);
		setHasMore(true);
		setIsLoadingMore(false);
		setTotalPages(0);
		setTotalItems(0);
	}, []);

	// ==========================================
	// Auto-refresh Logic - Only run once on mount
	// ==========================================
	useEffect(() => {
		if (autoRefresh && !hasInitialFetch.current) {
			hasInitialFetch.current = true;
			refetch();
		}
	}, [autoRefresh, refetch]);

	// ==========================================
	// Focus-based Refresh using React Navigation
	// ==========================================
	useFocusEffect(
		useCallback(() => {
			if (refreshOnFocus && hasLoaded && !isInitialMount.current) {
				// Only refresh if cache is expired or data is stale
				if (
					!isCacheValid() ||
					!lastRefreshed ||
					Date.now() - lastRefreshed.getTime() > cacheTTL
				) {
					dataFetchingLog.debug('Component focused, refreshing data...');
					debouncedRefetch();
				} else {
					dataFetchingLog.debug('Using cached data');
				}
			}
			if (isInitialMount.current) {
				isInitialMount.current = false;
			}
		}, [
			refreshOnFocus,
			hasLoaded,
			debouncedRefetch,
			isCacheValid,
			lastRefreshed,
			cacheTTL,
		])
	);

	// ==========================================
	// Cleanup on unmount
	// ==========================================
	useEffect(() => {
		return () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	// ==========================================
	// Return State and Actions
	// ==========================================
	return {
		data: transformedData,
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,
		isOffline,
		retryCount,
		cacheExpiry,
		// Pagination state
		hasMore,
		isLoadingMore,
		currentPage,
		totalPages,
		totalItems,
		// Actions
		refetch,
		debouncedRefetch,
		addItem,
		updateItem,
		deleteItem,
		clearError,
		retry,
		clearCache,
		// Pagination actions
		loadMore,
		resetPagination,
	};
}
