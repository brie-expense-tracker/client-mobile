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

/** Resolved style for a known MVP category, or null if the string is not a fixed category. */
export function getLedgerCategoryVisual(
	type: 'income' | 'expense',
	category: string,
): { icon: IconName; color: string } | null {
	if (type === 'expense') {
		if ((CASH_CATEGORIES as readonly string[]).includes(category)) {
			return EXPENSE_CATEGORY_VISUAL[category as LedgerExpenseCategory];
		}
		return null;
	}
	if ((INCOME_CATEGORIES as readonly string[]).includes(category)) {
		return INCOME_CATEGORY_VISUAL[category as LedgerIncomeCategory];
	}
	return null;
}
