/**
 * Fixed ledger categories (Cash Out / Cash In) and per-category icon + accent color.
 * Keep Records in sync with UI pickers and row display.
 */
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../ui/theme';

export const CASH_CATEGORIES = [
	'Food',
	'Groceries',
	'Drinks',
	'Transportation',
	'Entertainment',
	'Shopping',
	'Personal care',
	'Bills & utilities',
	'Household',
	'Health',
	'Gifts & donations',
	'Other',
] as const;

export const INCOME_CATEGORIES = [
	'Paycheck',
	'Freelance',
	'Bonus',
	'Refund',
	'Interest',
	'Investment',
	'Gift',
	'Other',
] as const;

export type LedgerExpenseCategory = (typeof CASH_CATEGORIES)[number];
export type LedgerIncomeCategory = (typeof INCOME_CATEGORIES)[number];

type IconName = keyof typeof Ionicons.glyphMap;

const EXPENSE_CATEGORY_VISUAL: Record<
	LedgerExpenseCategory,
	{ icon: IconName; color: string }
> = {
	Food: { icon: 'restaurant-outline', color: palette.warning },
	Groceries: { icon: 'basket-outline', color: palette.warning },
	Drinks: { icon: 'cafe-outline', color: palette.primaryMuted },
	Transportation: { icon: 'car-outline', color: palette.primary },
	Entertainment: { icon: 'game-controller-outline', color: palette.primaryMuted },
	Shopping: { icon: 'bag-outline', color: palette.danger },
	'Personal care': { icon: 'sparkles-outline', color: palette.primary },
	'Bills & utilities': { icon: 'receipt-outline', color: palette.textMuted },
	Household: { icon: 'home-outline', color: palette.primaryMuted },
	Health: { icon: 'medical-outline', color: palette.danger },
	'Gifts & donations': { icon: 'gift-outline', color: palette.warning },
	Other: { icon: 'apps-outline', color: palette.textMuted },
};

const INCOME_CATEGORY_VISUAL: Record<
	LedgerIncomeCategory,
	{ icon: IconName; color: string }
> = {
	Paycheck: { icon: 'briefcase-outline', color: palette.success },
	Freelance: { icon: 'laptop-outline', color: palette.primary },
	Bonus: { icon: 'ribbon-outline', color: palette.warning },
	Refund: { icon: 'arrow-back-outline', color: palette.success },
	Interest: { icon: 'cash-outline', color: palette.primaryMuted },
	Investment: { icon: 'trending-up-outline', color: palette.primaryMuted },
	Gift: { icon: 'gift-outline', color: palette.warning },
	Other: { icon: 'ellipse-outline', color: palette.textMuted },
};

/** Normalize API / storage values (e.g. "Income", undefined) to ledger buckets. */
export function normalizeLedgerType(
	type: string | undefined | null,
): 'income' | 'expense' {
	return String(type ?? '')
		.trim()
		.toLowerCase() === 'income'
		? 'income'
		: 'expense';
}

function lookupCategoryKeys(trimmed: string): {
	expense?: LedgerExpenseCategory;
	income?: LedgerIncomeCategory;
} {
	const expense = (CASH_CATEGORIES as readonly string[]).find(
		(c) => c.toLowerCase() === trimmed.toLowerCase(),
	) as LedgerExpenseCategory | undefined;
	const income = (INCOME_CATEGORIES as readonly string[]).find(
		(c) => c.toLowerCase() === trimmed.toLowerCase(),
	) as LedgerIncomeCategory | undefined;
	return { expense, income };
}

/**
 * Canonical picker label for a stored category string, or null if unknown.
 * Prefer matching the expense vs income list by label; use `type` only when both lists have the same name ("Other").
 */
export function resolveCanonicalLedgerCategory(
	type: string | undefined | null,
	raw: string | undefined | null,
): LedgerExpenseCategory | LedgerIncomeCategory | null {
	const trimmed = typeof raw === 'string' ? raw.trim() : '';
	if (!trimmed) return null;
	const { expense, income } = lookupCategoryKeys(trimmed);

	if (expense && !income) return expense;
	if (income && !expense) return income;
	if (expense && income) {
		return normalizeLedgerType(type) === 'income' ? income : expense;
	}
	return null;
}

/**
 * Icon + color for a known MVP category, or null.
 * Labels that exist only on the expense list (e.g. "Entertainment") still resolve even if `type` from the server is wrong.
 */
export function getLedgerCategoryVisual(
	type: string | undefined | null,
	category: string,
): { icon: IconName; color: string } | null {
	const trimmed = typeof category === 'string' ? category.trim() : '';
	if (!trimmed) return null;
	const { expense, income } = lookupCategoryKeys(trimmed);

	if (expense && !income) return EXPENSE_CATEGORY_VISUAL[expense];
	if (income && !expense) return INCOME_CATEGORY_VISUAL[income];
	if (expense && income) {
		return normalizeLedgerType(type) === 'income'
			? INCOME_CATEGORY_VISUAL[income]
			: EXPENSE_CATEGORY_VISUAL[expense];
	}
	return null;
}
