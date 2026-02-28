/**
 * Minimal cache invalidation flags for MVP.
 * No-op stubs so budgetContext (and any other consumers) don't break.
 * Full implementation was moved to legacy and removed from the tree.
 */
export const setCacheInvalidationFlags = {
	onBudgetChange: () => {},
	onNewTransaction: () => {},
};
