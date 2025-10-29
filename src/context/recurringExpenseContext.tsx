import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useMemo,
	ReactNode,
} from 'react';
import {
	RecurringExpenseService,
	RecurringExpense,
	ApiService,
} from '../services';
import { createLogger } from '../utils/sublogger';

const recurringExpenseContextLog = createLogger('RecurringExpenseContext');

// ==========================================
// Types
// ==========================================
export interface CreateRecurringExpenseData {
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	categories?: string[];
}

export interface UpdateRecurringExpenseData {
	vendor?: string;
	amount?: number;
	frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate?: string;
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	categories?: string[];
}

// ==========================================
// Helpers
// ==========================================

/**
 * Get recurring expense ID - handles both patternId and id
 * Single source of truth for ID access
 */
export const getRecurringExpenseId = (e: {
	id?: string;
	patternId?: string;
}): string => {
	return (e.id ?? e.patternId)!;
};

// ==========================================
// Context
// ==========================================

interface RecurringExpenseContextType {
	expenses: RecurringExpense[];
	isLoading: boolean;
	hasLoaded: boolean;
	refetch: () => Promise<void>;
	addRecurringExpense: (
		data: CreateRecurringExpenseData
	) => Promise<RecurringExpense>;
	updateRecurringExpense: (
		id: string,
		data: UpdateRecurringExpenseData
	) => Promise<RecurringExpense>;
	deleteRecurringExpense: (id: string) => Promise<void>;
}

const RecurringExpenseContext = createContext<RecurringExpenseContextType>({
	expenses: [],
	isLoading: false,
	hasLoaded: false,
	refetch: async () => {},
	addRecurringExpense: async () => {
		throw new Error('addRecurringExpense not implemented');
	},
	updateRecurringExpense: async () => {
		throw new Error('updateRecurringExpense not implemented');
	},
	deleteRecurringExpense: async () => {},
});

export const RecurringExpenseProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	// Abort controller for cancelling stale fetches
	const abortControllerRef = React.useRef<AbortController | null>(null);

	const refetch = useCallback(async () => {
		// Cancel any in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			recurringExpenseContextLog.debug('Aborted previous fetch');
		}

		// Create new abort controller for this fetch
		abortControllerRef.current = new AbortController();

		setIsLoading(true);
		try {
			const data = await RecurringExpenseService.getRecurringExpenses({
				signal: abortControllerRef.current.signal,
			});

			// Normalize: Replace manual_* IDs with real server IDs
			const objectIdRe = /^[0-9a-fA-F]{24}$/;
			const normalized = data.map((e) => {
				const currentId = getRecurringExpenseId(e);

				// If ID is already a valid ObjectId, keep it
				if (currentId && objectIdRe.test(currentId)) {
					return e;
				}

				// If it's a manual_* ID, try to use _id or id field as real identifier
				const realId = (e as any)._id || (e as any).id;
				if (realId) {
					recurringExpenseContextLog.debug(
						`Normalizing: ${currentId} → ${realId}`
					);
					return { ...e, patternId: realId };
				}

				recurringExpenseContextLog.warn(
					`No valid ID found for expense: ${currentId}`
				);
				return e;
			});

			// Dedupe by patternId to handle server duplicates
			const seen = new Set<string>();
			const unique: RecurringExpense[] = [];
			for (const e of normalized) {
				const id = getRecurringExpenseId(e);
				if (!id || seen.has(id)) {
					recurringExpenseContextLog.debug(`Skipping duplicate: ${id}`);
					continue;
				}
				seen.add(id);
				unique.push(e);
			}

			// Use functional update to avoid dropping concurrent optimistic updates
			setExpenses(() => unique);
			setHasLoaded(true);
		} catch (err: any) {
			// Ignore abort errors (expected when a new fetch cancels the old one)
			if (err?.name === 'AbortError') {
				recurringExpenseContextLog.debug('Fetch aborted (new fetch started)');
				return;
			}
			recurringExpenseContextLog.warn(
				'Failed to fetch recurring expenses',
				err
			);
			setExpenses(() => []);
			setHasLoaded(true);
		} finally {
			setIsLoading(false);
			// Clean up abort controller
			abortControllerRef.current = null;
		}
	}, []);

	const addRecurringExpense = useCallback(
		async (data: CreateRecurringExpenseData) => {
			// Create a temporary ID for optimistic update
			const tempId = `temp-${Date.now()}-${Math.random()}`;
			const newExpense: RecurringExpense = {
				patternId: tempId,
				...data,
				confidence: 1.0,
				transactions: [],
			};

			// Optimistically add to UI
			setExpenses((prev) => [newExpense, ...prev]);

			try {
				recurringExpenseContextLog.debug('Creating expense on server...');
				const serverExpense =
					await RecurringExpenseService.createRecurringExpense(data);

				recurringExpenseContextLog.debug('Expense created, replacing temp ID', {
					tempId,
					realId: serverExpense.patternId,
				});

				// Replace the temporary expense with the real one
				setExpenses((prev) => {
					// Defensive: if temp already removed, add server expense
					const hasTempExpense = prev.some((e) => e.patternId === tempId);
					if (!hasTempExpense) {
						recurringExpenseContextLog.warn(
							'Temp expense already removed, adding server expense'
						);
						return [serverExpense, ...prev];
					}
					return prev.map((e) => (e.patternId === tempId ? serverExpense : e));
				});

				// Clear cache to ensure fresh data
				ApiService.clearCacheByPrefix('/api/recurring-expenses');
				recurringExpenseContextLog.debug(
					'Cache cleared after expense creation'
				);

				return serverExpense;
			} catch (error) {
				recurringExpenseContextLog.error('Error adding expense', error);
				// Remove the optimistic expense on error
				setExpenses((prev) => prev.filter((e) => e.patternId !== tempId));
				throw error;
			}
		},
		[]
	);

	const updateRecurringExpense = useCallback(
		async (id: string, updates: UpdateRecurringExpenseData) => {
			// Guard: If ID is manual_*, force create instead of trying to update
			const isManualId = id.startsWith('manual_');
			const objectIdRe = /^[0-9a-fA-F]{24}$/;
			const isValidObjectId = objectIdRe.test(id);

			if (isManualId || !isValidObjectId) {
				recurringExpenseContextLog.warn(
					`Blocking update for invalid ID: ${id}, forcing create...`
				);

				// Build complete payload from current item + updates
				let previousExpense: RecurringExpense | undefined;
				setExpenses((curr) => {
					previousExpense = curr.find((e) => getRecurringExpenseId(e) === id);
					return curr;
				});

				const base = previousExpense ?? {
					vendor: '',
					amount: 0,
					frequency: 'monthly' as const,
					nextExpectedDate: new Date().toISOString().split('T')[0],
				};

				const payload: CreateRecurringExpenseData = {
					vendor: updates.vendor ?? base.vendor,
					amount: updates.amount ?? base.amount,
					frequency: updates.frequency ?? base.frequency,
					nextExpectedDate: updates.nextExpectedDate ?? base.nextExpectedDate,
					appearanceMode:
						updates.appearanceMode ?? (base as any).appearanceMode,
					icon: updates.icon ?? (base as any).icon,
					color: updates.color ?? (base as any).color,
					categories: updates.categories ?? (base as any).categories,
				};

				try {
					const created = await RecurringExpenseService.createRecurringExpense(
						payload
					);

					recurringExpenseContextLog.debug(
						`Created with real ID, replacing ${id} with ${created.patternId}`
					);

					// Replace manual item with server item
					setExpenses((prev) =>
						prev.map((e) => (getRecurringExpenseId(e) === id ? created : e))
					);

					ApiService.clearCacheByPrefix('/api/recurring-expenses');
					return created;
				} catch (createErr) {
					recurringExpenseContextLog.error('Create failed', createErr);
					throw createErr;
				}
			}

			// Normal update flow for valid ObjectIds
			// Optimistic update
			let previousExpense: RecurringExpense | undefined;
			setExpenses((curr) => {
				recurringExpenseContextLog.debug(
					`Applying optimistic update for ${id}`
				);
				return curr.map((e) => {
					if (getRecurringExpenseId(e) === id) {
						previousExpense = e;
						const optimisticExpense = { ...e, ...updates } as RecurringExpense;
						recurringExpenseContextLog.debug(
							'Optimistic expense',
							optimisticExpense
						);
						return optimisticExpense;
					}
					return e;
				});
			});

			try {
				const updatedExpense =
					await RecurringExpenseService.updateRecurringExpense(id, updates);

				recurringExpenseContextLog.debug('Server returned', updatedExpense);

				// Replace optimistic update with server response
				setExpenses((prev) => {
					const updated = prev.map((e) =>
						getRecurringExpenseId(e) === id ? updatedExpense : e
					);
					recurringExpenseContextLog.debug(
						`Updated expenses count: ${updated.length}`
					);
					return updated;
				});

				// Clear cache to ensure fresh data
				ApiService.clearCacheByPrefix('/api/recurring-expenses');
				recurringExpenseContextLog.debug('Cache cleared after expense update');

				return updatedExpense;
			} catch (err: any) {
				recurringExpenseContextLog.error('Failed to update expense', err);

				// Rollback optimistic update
				if (previousExpense) {
					setExpenses((curr) =>
						curr.map((e) =>
							getRecurringExpenseId(e) === id ? previousExpense! : e
						)
					);
				}
				throw err;
			}
		},
		[]
	);

	const deleteRecurringExpense = useCallback(async (id: string) => {
		recurringExpenseContextLog.debug('Deleting expense', { id });

		// Guard: If ID is manual_*, just remove locally (it doesn't exist on server)
		const isManualId = id.startsWith('manual_');
		const objectIdRe = /^[0-9a-fA-F]{24}$/;
		const isValidObjectId = objectIdRe.test(id);

		if (isManualId || !isValidObjectId) {
			recurringExpenseContextLog.warn(
				`Invalid ID ${id}, removing locally only (not on server)`
			);
			setExpenses((prev) =>
				prev.filter((e) => getRecurringExpenseId(e) !== id)
			);
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			return;
		}

		// Normal delete flow for valid ObjectIds
		// Save previous state for rollback
		let previousExpenses: RecurringExpense[] = [];
		setExpenses((prev) => {
			previousExpenses = prev;
			// Optimistically remove from UI
			return prev.filter((e) => getRecurringExpenseId(e) !== id);
		});

		try {
			recurringExpenseContextLog.debug('Calling API delete...');
			await RecurringExpenseService.deleteRecurringExpense(id);

			recurringExpenseContextLog.debug('Delete successful, clearing cache...');
			// Clear cache to ensure fresh data
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			recurringExpenseContextLog.debug('Cache cleared after expense deletion');
		} catch (err) {
			recurringExpenseContextLog.error('Delete failed, rolling back', err);
			// Rollback to previous state
			setExpenses(previousExpenses);

			// Re-throw with user-friendly message
			const errorMsg =
				err instanceof Error
					? err.message
					: 'Failed to delete recurring expense';
			throw new Error(errorMsg);
		}
	}, []);

	// Initial load
	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	// Memoize the context value to prevent unnecessary re-renders
	const value = useMemo(
		() => ({
			expenses,
			isLoading,
			hasLoaded,
			refetch,
			addRecurringExpense,
			updateRecurringExpense,
			deleteRecurringExpense,
		}),
		[
			expenses,
			isLoading,
			hasLoaded,
			refetch,
			addRecurringExpense,
			updateRecurringExpense,
			deleteRecurringExpense,
		]
	);

	return (
		<RecurringExpenseContext.Provider value={value}>
			{children}
		</RecurringExpenseContext.Provider>
	);
};

// Hook to use recurring expense context
export const useRecurringExpense = () => {
	const context = useContext(RecurringExpenseContext);
	if (context === undefined) {
		throw new Error(
			'useRecurringExpense must be used within a RecurringExpenseProvider'
		);
	}
	return context;
};
