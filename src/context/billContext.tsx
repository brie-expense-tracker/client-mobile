import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useMemo,
	ReactNode,
} from 'react';
import { BillService, Bill, ApiService } from '../services';
import { createLogger } from '../utils/sublogger';

const billContextLog = createLogger('BillContext');

// ==========================================
// Types
// ==========================================
export interface CreateBillData {
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	autoPay?: boolean; // Default to false (manual payment)
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	category?: string; // Single category that will be applied to each generated transaction
}

export interface UpdateBillData {
	vendor?: string;
	amount?: number;
	frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate?: string;
	autoPay?: boolean;
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	category?: string; // Single category that will be applied to each generated transaction
}

// ==========================================
// Helpers
// ==========================================

/**
 * Get bill ID - handles both patternId and id
 * Single source of truth for ID access
 */
export const getBillId = (e: { id?: string; patternId?: string }): string => {
	return (e.id ?? e.patternId)!;
};

// ==========================================
// Context
// ==========================================

interface BillContextType {
	expenses: Bill[];
	isLoading: boolean;
	hasLoaded: boolean;
	refetch: () => Promise<void>;
	addBill: (data: CreateBillData) => Promise<Bill>;
	updateBill: (id: string, data: UpdateBillData) => Promise<Bill>;
	deleteBill: (id: string) => Promise<void>;
}

const BillContext = createContext<BillContextType>({
	expenses: [],
	isLoading: false,
	hasLoaded: false,
	refetch: async () => {},
	addBill: async () => {
		throw new Error('addBill not implemented');
	},
	updateBill: async () => {
		throw new Error('updateBill not implemented');
	},
	deleteBill: async () => {},
});

export const BillProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [expenses, setExpenses] = useState<Bill[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	// Abort controller for cancelling stale fetches
	const abortControllerRef = React.useRef<AbortController | null>(null);

	const refetch = useCallback(async () => {
		// Cancel any in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			billContextLog.debug('Aborted previous fetch');
		}

		// Create new abort controller for this fetch
		abortControllerRef.current = new AbortController();

		setIsLoading(true);
		try {
			const data = await BillService.getRecurringExpenses({
				signal: abortControllerRef.current.signal,
			});

			// Normalize: Replace manual_* IDs with real server IDs
			const objectIdRe = /^[0-9a-fA-F]{24}$/;
			const normalized = data.map((e) => {
				const currentId = getBillId(e);

				// If ID is already a valid ObjectId, keep it
				if (currentId && objectIdRe.test(currentId)) {
					return e;
				}

				// If it's a manual_* ID, try to use _id or id field as real identifier
				const realId = (e as any)._id || (e as any).id;
				if (realId) {
					billContextLog.debug(`Normalizing: ${currentId} → ${realId}`);
					return { ...e, patternId: realId };
				}

				billContextLog.warn(`No valid ID found for bill: ${currentId}`);
				return e;
			});

			// Dedupe by patternId to handle server duplicates
			const seen = new Set<string>();
			const unique: Bill[] = [];
			for (const e of normalized) {
				const id = getBillId(e);
				if (!id || seen.has(id)) {
					billContextLog.debug(`Skipping duplicate: ${id}`);
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
				billContextLog.debug('Fetch aborted (new fetch started)');
				return;
			}
			billContextLog.warn('Failed to fetch bills', err);
			setExpenses(() => []);
			setHasLoaded(true);
		} finally {
			setIsLoading(false);
			// Clean up abort controller
			abortControllerRef.current = null;
		}
	}, []);

	const addBill = useCallback(
		async (data: CreateBillData) => {
			// Create a temporary ID for optimistic update
			const tempId = `temp-${Date.now()}-${Math.random()}`;
			const newExpense: Bill = {
				patternId: tempId,
				...data,
				confidence: 1.0,
				transactions: [],
			};

			// Optimistically add to UI
			setExpenses((prev) => [newExpense, ...prev]);

			try {
				billContextLog.debug('Creating bill on server...');
				const serverExpense = await BillService.createRecurringExpense(data);

				billContextLog.debug('Bill created, replacing temp ID', {
					tempId,
					realId: serverExpense.patternId,
				});

				// Replace the temporary expense with the real one
				setExpenses((prev) => {
					// Check if temp expense still exists (might have been removed by another operation)
					const hasTempExpense = prev.some((e) => e.patternId === tempId);
					if (!hasTempExpense) {
						billContextLog.warn(
							'⚠️ [BillContext] Temp bill already removed, adding server bill'
						);
						// Ensure we don't duplicate the expense
						const existingExpense = prev.find(
							(e) => e.patternId === serverExpense.patternId
						);
						if (existingExpense) {
							billContextLog.warn(
								'Server bill already exists, updating instead'
							);
							return prev.map((e) =>
								e.patternId === serverExpense.patternId ? serverExpense : e
							);
						}
						return [serverExpense, ...prev];
					}

					const updated = prev.map((e) =>
						e.patternId === tempId ? serverExpense : e
					);
					billContextLog.info('Replaced temp bill with server bill', {
						tempId,
						realId: serverExpense.patternId,
						count: updated.length,
					});
					return updated;
				});

				// Ensure hasLoaded is set to true after first bill creation
				if (!hasLoaded) {
					setHasLoaded(true);
				}

				// Clear cache to ensure fresh data
				ApiService.clearCacheByPrefix('/api/recurring-expenses');
				billContextLog.debug('Cache cleared after bill creation');

				return serverExpense;
			} catch (error) {
				billContextLog.error('Error adding bill', error);
				// Remove the optimistic expense on error
				setExpenses((prev) => {
					const updated = prev.filter((e) => e.patternId !== tempId);
					billContextLog.debug('Removed optimistic bill on error', {
						count: updated.length,
					});
					return updated;
				});
				throw error;
			}
		},
		[hasLoaded]
	);

	const updateBill = useCallback(
		async (id: string, updates: UpdateBillData) => {
			// Guard: If ID is manual_*, force create instead of trying to update
			const isManualId = id.startsWith('manual_');
			const objectIdRe = /^[0-9a-fA-F]{24}$/;
			const isValidObjectId = objectIdRe.test(id);

			if (isManualId || !isValidObjectId) {
				billContextLog.warn(
					`Blocking update for invalid ID: ${id}, forcing create...`
				);

				// Build complete payload from current item + updates
				let previousExpense: Bill | undefined;
				setExpenses((curr) => {
					previousExpense = curr.find((e) => getBillId(e) === id);
					return curr;
				});

				const base = previousExpense ?? {
					vendor: '',
					amount: 0,
					frequency: 'monthly' as const,
					nextExpectedDate: new Date().toISOString().split('T')[0],
				};

				const payload: CreateBillData = {
					vendor: updates.vendor ?? base.vendor,
					amount: updates.amount ?? base.amount,
					frequency: updates.frequency ?? base.frequency,
					nextExpectedDate: updates.nextExpectedDate ?? base.nextExpectedDate,
					appearanceMode:
						updates.appearanceMode ?? (base as any).appearanceMode,
					icon: updates.icon ?? (base as any).icon,
					color: updates.color ?? (base as any).color,
					category: updates.category ?? (base as any).category,
				};

				try {
					const created = await BillService.createRecurringExpense(payload);

					billContextLog.debug(
						`Created with real ID, replacing ${id} with ${created.patternId}`
					);

					// Replace manual item with server item
					setExpenses((prev) =>
						prev.map((e) => (getBillId(e) === id ? created : e))
					);

					ApiService.clearCacheByPrefix('/api/recurring-expenses');
					return created;
				} catch (createErr) {
					billContextLog.error('Create failed', createErr);
					throw createErr;
				}
			}

			// Normal update flow for valid ObjectIds
			// Optimistic update
			let previousExpense: Bill | undefined;
			setExpenses((curr) => {
				billContextLog.debug(`Applying optimistic update for ${id}`);
				return curr.map((e) => {
					if (getBillId(e) === id) {
						previousExpense = e;
						const optimisticExpense = { ...e, ...updates } as Bill;
						billContextLog.debug('Optimistic bill', optimisticExpense);
						return optimisticExpense;
					}
					return e;
				});
			});

			try {
				const updatedExpense = await BillService.updateRecurringExpense(
					id,
					updates
				);

				billContextLog.debug('Server returned', updatedExpense);

				// Replace optimistic update with server response
				setExpenses((prev) => {
					const updated = prev.map((e) =>
						getBillId(e) === id ? updatedExpense : e
					);
					billContextLog.debug(`Updated bills count: ${updated.length}`);
					return updated;
				});

				// Clear cache to ensure fresh data
				ApiService.clearCacheByPrefix('/api/recurring-expenses');
				billContextLog.debug('Cache cleared after bill update');

				return updatedExpense;
			} catch (err: any) {
				billContextLog.error('Failed to update bill', err);

				// Rollback optimistic update
				if (previousExpense) {
					setExpenses((curr) =>
						curr.map((e) => (getBillId(e) === id ? previousExpense! : e))
					);
				}
				throw err;
			}
		},
		[]
	);

	const deleteBill = useCallback(async (id: string) => {
		billContextLog.debug('Deleting bill', { id });

		// Guard: If ID is manual_*, just remove locally (it doesn't exist on server)
		const isManualId = id.startsWith('manual_');
		const objectIdRe = /^[0-9a-fA-F]{24}$/;
		const isValidObjectId = objectIdRe.test(id);

		if (isManualId || !isValidObjectId) {
			billContextLog.warn(
				`Invalid ID ${id}, removing locally only (not on server)`
			);
			setExpenses((prev) => prev.filter((e) => getBillId(e) !== id));
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			return;
		}

		// Normal delete flow for valid ObjectIds
		// Save previous state for rollback
		let previousExpenses: Bill[] = [];
		setExpenses((prev) => {
			previousExpenses = prev;
			// Optimistically remove from UI
			return prev.filter((e) => getBillId(e) !== id);
		});

		try {
			billContextLog.debug('Calling API delete...');
			await BillService.deleteRecurringExpense(id);

			billContextLog.debug('Delete successful, clearing cache...');
			// Clear cache to ensure fresh data
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			billContextLog.debug('Cache cleared after bill deletion');
		} catch (err) {
			billContextLog.error('Delete failed, rolling back', err);
			// Rollback to previous state
			setExpenses(previousExpenses);

			// Re-throw with user-friendly message
			const errorMsg =
				err instanceof Error ? err.message : 'Failed to delete bill';
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
			addBill,
			updateBill,
			deleteBill,
		}),
		[expenses, isLoading, hasLoaded, refetch, addBill, updateBill, deleteBill]
	);

	return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
};

// Hook to use bill context
export const useBills = () => {
	const context = useContext(BillContext);
	if (context === undefined) {
		throw new Error('useBills must be used within a BillProvider');
	}
	return context;
};
