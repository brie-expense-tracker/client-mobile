/**
 * Intent Sufficiency Service
 * Non-throwing service that waits for data and gracefully handles errors
 */

import { MissingInfoChip } from '../../components/assistant/cards/MissingInfoCard';

export type Intent =
	| 'GET_SPENDING_PLAN'
	| 'GOAL_ALLOCATION'
	| 'AFFORDABILITY_CHECK'
	| 'BILL_CALENDAR'
	| 'SAVINGS_RUNWAY'
	| 'DEBT_PAYOFF'
	| 'BUDGET_ANALYSIS'
	| 'EXPENSE_TRACKING'
	| 'INVESTMENT_ADVICE'
	| 'RETIREMENT_PLANNING';

export type Sufficiency = {
	sufficient: boolean;
	missing: string[];
	error?: string;
	confidence?: number;
};

export interface DataSnapshot {
	budgets?: any[];
	goals?: any[];
	transactions?: any[];
	profile?: any | null;
	isInitialized: boolean;
}

const REQUIRED: Record<Intent, string[]> = {
	GET_SPENDING_PLAN: ['budgets', 'transactions', 'profile'],
	GOAL_ALLOCATION: ['goals', 'transactions', 'profile'],
	AFFORDABILITY_CHECK: ['budgets', 'transactions', 'profile'],
	BILL_CALENDAR: ['transactions', 'profile'],
	SAVINGS_RUNWAY: ['transactions', 'profile'],
	DEBT_PAYOFF: ['transactions', 'profile'],
	BUDGET_ANALYSIS: ['budgets', 'transactions'],
	EXPENSE_TRACKING: ['transactions'],
	INVESTMENT_ADVICE: ['profile'],
	RETIREMENT_PLANNING: ['profile', 'goals'],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDataReady(
	isReady: () => boolean,
	timeoutMs = 2500
): Promise<boolean> {
	const start = Date.now();
	while (!isReady()) {
		if (Date.now() - start > timeoutMs) return false;
		await sleep(75);
	}
	return true;
}

export async function evaluateAnswerability(
	intent: Intent,
	snapshot: DataSnapshot
): Promise<Sufficiency> {
	try {
		// Wait for first load; don't block forever
		const dataReady = await waitForDataReady(
			() => snapshot.isInitialized,
			2500
		);

		if (!dataReady) {
			console.warn(
				'Data not ready within timeout, proceeding with available data'
			);
		}

		const req = REQUIRED[intent] ?? [];
		const have = {
			budgets: Array.isArray(snapshot.budgets) && snapshot.budgets.length >= 0,
			goals: Array.isArray(snapshot.goals) && snapshot.goals.length >= 0,
			transactions:
				Array.isArray(snapshot.transactions) &&
				snapshot.transactions.length >= 0,
			profile: !!snapshot.profile,
		};

		const missing = req.filter((k) => !have[k as keyof typeof have]);
		const confidence =
			req.length > 0 ? (req.length - missing.length) / req.length : 1;

		return {
			sufficient: missing.length === 0,
			missing,
			confidence,
		};
	} catch (e: any) {
		// Never throw - allow the chat to continue
		console.error('evaluateAnswerability error', e);
		return {
			sufficient: true,
			missing: [],
			error: String(e?.message ?? e),
			confidence: 0.5,
		};
	}
}

export function getDataSnapshot(
	budgets: any[] = [],
	goals: any[] = [],
	transactions: any[] = [],
	profile: any | null = null,
	isInitialized: boolean = false
): DataSnapshot {
	return {
		budgets,
		goals,
		transactions,
		profile,
		isInitialized,
	};
}

export function convertMissingToChips(missing: string[]): MissingInfoChip[] {
	const chipMap: Record<string, Omit<MissingInfoChip, 'id'>> = {
		budgets: {
			label: 'Budget Information',
			description: 'I need to see your budget categories and spending limits',
			required: true,
			priority: 'high',
			examples: ['Groceries: $500/month', 'Entertainment: $200/month'],
			placeholder: 'Enter budget details',
			inputType: 'text',
		},
		goals: {
			label: 'Financial Goals',
			description: 'What are you trying to achieve financially?',
			required: true,
			priority: 'high',
			examples: ['Save $10,000 for emergency fund', 'Buy a house in 2 years'],
			placeholder: 'Describe your financial goals',
			inputType: 'text',
		},
		transactions: {
			label: 'Transaction History',
			description: 'I need to see your spending patterns to give better advice',
			required: true,
			priority: 'high',
			examples: ['Recent purchases', 'Monthly expenses'],
			placeholder: 'Add transaction data',
			inputType: 'text',
		},
		profile: {
			label: 'Profile Information',
			description: 'I need basic info about your financial situation',
			required: true,
			priority: 'high',
			examples: ['Monthly income', 'Current savings', 'Debt amount'],
			placeholder: 'Enter profile information',
			inputType: 'text',
		},
	};

	return missing.map((item, index) => ({
		id: `${item}_${index}`,
		...chipMap[item],
	}));
}
