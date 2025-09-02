import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ==========================================
// Types
// ==========================================
export interface DataFetchingState<T> {
	data: T[];
	isLoading: boolean;
	hasLoaded: boolean;
	error: string | null;
	lastRefreshed: Date | null;
}

export interface DataFetchingActions<T> {
	refetch: () => Promise<void>;
	addItem: (item: T) => Promise<T>;
	updateItem: (id: string, updates: Partial<T>) => Promise<T>;
	deleteItem: (id: string) => Promise<void>;
	clearError: () => void;
}

export interface UseDataFetchingOptions<T> {
	fetchFunction: () => Promise<T[]>;
	addFunction?: (item: T) => Promise<T>;
	updateFunction?: (id: string, updates: Partial<T>) => Promise<T>;
	deleteFunction?: (id: string) => Promise<void>;
	autoRefresh?: boolean;
	refreshOnFocus?: boolean;
	initialData?: T[];
	transformData?: (data: T[]) => T[];
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
	} = options;

	// ==========================================
	// State Management
	// ==========================================
	const [data, setData] = useState<T[]>(initialData);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

	// Use refs to track if we've already fetched to prevent duplicate calls
	const hasInitialFetch = useRef(false);
	const isInitialMount = useRef(true);
	const isFetching = useRef(false); // Prevent concurrent fetches

	// ==========================================
	// Memoized Data
	// ==========================================
	const transformedData = useMemo(() => {
		return transformData ? transformData(data) : data;
	}, [data, transformData]);

	// ==========================================
	// Core Fetch Function with Deduplication
	// ==========================================
	const refetch = useCallback(async () => {
		// Prevent concurrent fetches
		if (isFetching.current) {
			console.log('🔄 Fetch already in progress, skipping...');
			return;
		}

		try {
			isFetching.current = true;
			setIsLoading(true);
			setError(null);

			console.log('🔄 Fetching data...');
			const result = await fetchFunction();

			console.log(`✅ Data received: ${result.length} items`);
			setData(result);
			setHasLoaded(true);
			setLastRefreshed(new Date());
		} catch (err) {
			console.error('❌ Error fetching data:', err);
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to fetch data';
			setError(errorMessage);

			// Set hasLoaded to true even on error to prevent infinite loading
			setHasLoaded(true);

			// Set empty data on error to show appropriate UI
			setData([]);
		} finally {
			setIsLoading(false);
			isFetching.current = false;
		}
	}, [fetchFunction]);

	// ==========================================
	// CRUD Operations
	// ==========================================
	const addItem = useCallback(
		async (item: T): Promise<T> => {
			if (!addFunction) {
				throw new Error('Add function not provided');
			}

			try {
				setError(null);
				const newItem = await addFunction(item);

				// Optimistic update
				setData((prev) => [...prev, newItem]);
				console.log('✅ Item added successfully');
				return newItem;
			} catch (err) {
				console.error('❌ Error adding item:', err);
				setError(err instanceof Error ? err.message : 'Failed to add item');
				throw err;
			}
		},
		[addFunction]
	);

	const updateItem = useCallback(
		async (id: string, updates: Partial<T>): Promise<T> => {
			if (!updateFunction) {
				throw new Error('Update function not provided');
			}

			try {
				setError(null);
				const updatedItem = await updateFunction(id, updates);

				// Optimistic update
				setData((prev) =>
					prev.map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item
					)
				);
				return updatedItem;
			} catch (err) {
				console.error('[useDataFetching] Error updating item:', err);
				setError(err instanceof Error ? err.message : 'Failed to update item');
				throw err;
			}
		},
		[updateFunction]
	);

	const deleteItem = useCallback(
		async (id: string): Promise<void> => {
			if (!deleteFunction) {
				throw new Error('Delete function not provided');
			}

			try {
				setError(null);
				await deleteFunction(id);

				// Optimistic update
				setData((prev) => prev.filter((item) => item.id !== id));
			} catch (err) {
				console.error('[useDataFetching] Error deleting item:', err);
				setError(err instanceof Error ? err.message : 'Failed to delete item');
				throw err;
			}
		},
		[deleteFunction]
	);

	const clearError = useCallback(() => {
		setError(null);
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
	// Component Mount Refresh - Only run when component gains focus after initial load
	// ==========================================
	useEffect(() => {
		if (refreshOnFocus && hasLoaded && !isInitialMount.current) {
			console.log('[useDataFetching] Component focused, refreshing data...');
			refetch();
		}
		if (isInitialMount.current) {
			isInitialMount.current = false;
		}
	}, [refreshOnFocus, hasLoaded, refetch]);

	// ==========================================
	// Return State and Actions
	// ==========================================
	return {
		data: transformedData,
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,
		refetch,
		addItem,
		updateItem,
		deleteItem,
		clearError,
	};
}
