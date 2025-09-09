// Strong typing for actions to prevent UI wiring bugs and enable telemetry

export enum ActionType {
	// Budget actions
	OPEN_BUDGETS = 'OPEN_BUDGETS',
	CREATE_BUDGET = 'CREATE_BUDGET',
	OPEN_BUDGET_FORM = 'OPEN_BUDGET_FORM',
	OPEN_BUDGET_WIZARD = 'OPEN_BUDGET_WIZARD',
	CREATE_50_30_20_BUDGET = 'CREATE_50_30_20_BUDGET',
	ADJUST_LIMIT = 'ADJUST_LIMIT',

	// Goal actions
	OPEN_GOAL_WIZARD = 'OPEN_GOAL_WIZARD',
	OPEN_GOAL_FORM = 'OPEN_GOAL_FORM',
	ADJUST_GOAL_PRIORITY = 'ADJUST_GOAL_PRIORITY',
	SETUP_AUTO_TRANSFER = 'SETUP_AUTO_TRANSFER',

	// Transaction actions
	OPEN_TRANSACTION_FORM = 'OPEN_TRANSACTION_FORM',
	OPEN_TRANSACTIONS_TAB = 'OPEN_TRANSACTIONS_TAB',
	MARK_PAID = 'MARK_PAID',
	CATEGORIZE = 'CATEGORIZE',

	// Income & Recurring actions
	OPEN_INCOME_FORM = 'OPEN_INCOME_FORM',
	OPEN_RECURRING_FORM = 'OPEN_RECURRING_FORM',
	OPEN_RECURRING_TAB = 'OPEN_RECURRING_TAB',
	VIEW_RECURRING = 'VIEW_RECURRING',

	// Account actions
	CONNECT_ACCOUNT = 'CONNECT_ACCOUNT',
	LINK_BANK = 'LINK_BANK',

	// Analytics & Planning
	OPEN_ANALYTICS_TAB = 'OPEN_ANALYTICS_TAB',
	OPEN_PLAN_TUNER = 'OPEN_PLAN_TUNER',
	MAKE_BUDGETS_FROM_PLAN = 'MAKE_BUDGETS_FROM_PLAN',

	// Allocation actions
	ALLOCATE_REMAINING = 'ALLOCATE_REMAINING',
	GOAL_ALLOCATION = 'GOAL_ALLOCATION',

	// Utility actions
	PICK_TIME_WINDOW = 'PICK_TIME_WINDOW',
	SET_LIMIT = 'SET_LIMIT',
	CREATE_RULE = 'CREATE_RULE',
	OPEN_COMPOUND_CALCULATOR = 'OPEN_COMPOUND_CALCULATOR',
	OPEN_SETUP_WIZARD = 'OPEN_SETUP_WIZARD',

	// HYSA Research actions
	FETCH_HYSA_PICKS = 'FETCH_HYSA_PICKS',
	OPEN_ARTICLE = 'OPEN_ARTICLE',
	OPEN_LINKS = 'OPEN_LINKS',
	OPEN_TRANSFER_PLANNER = 'OPEN_TRANSFER_PLANNER',
}

export interface QuickAction {
	label: string;
	action: ActionType;
	params?: Record<string, unknown>;
}

export interface ActionTelemetry {
	action: ActionType;
	timestamp: number;
	context?: string;
	success?: boolean;
}

/**
 * Validate action type at runtime
 */
export function isValidAction(action: string): action is ActionType {
	return Object.values(ActionType).includes(action as ActionType);
}

/**
 * Get action display name for telemetry
 */
export function getActionDisplayName(action: ActionType): string {
	const displayNames: Record<ActionType, string> = {
		[ActionType.OPEN_BUDGETS]: 'View Budgets',
		[ActionType.CREATE_BUDGET]: 'Create Budget',
		[ActionType.OPEN_BUDGET_FORM]: 'Open Budget Form',
		[ActionType.OPEN_BUDGET_WIZARD]: 'Open Budget Wizard',
		[ActionType.CREATE_50_30_20_BUDGET]: 'Create 50/30/20 Budget',
		[ActionType.ADJUST_LIMIT]: 'Adjust Budget Limit',
		[ActionType.OPEN_GOAL_WIZARD]: 'Open Goal Wizard',
		[ActionType.OPEN_GOAL_FORM]: 'Open Goal Form',
		[ActionType.ADJUST_GOAL_PRIORITY]: 'Adjust Goal Priority',
		[ActionType.SETUP_AUTO_TRANSFER]: 'Setup Auto Transfer',
		[ActionType.OPEN_TRANSACTION_FORM]: 'Add Transaction',
		[ActionType.OPEN_TRANSACTIONS_TAB]: 'View Transactions',
		[ActionType.MARK_PAID]: 'Mark as Paid',
		[ActionType.CATEGORIZE]: 'Categorize Transaction',
		[ActionType.OPEN_INCOME_FORM]: 'Add Income',
		[ActionType.OPEN_RECURRING_FORM]: 'Add Recurring Expense',
		[ActionType.OPEN_RECURRING_TAB]: 'View Recurring Expenses',
		[ActionType.VIEW_RECURRING]: 'View Recurring Details',
		[ActionType.CONNECT_ACCOUNT]: 'Connect Account',
		[ActionType.LINK_BANK]: 'Link Bank Account',
		[ActionType.OPEN_ANALYTICS_TAB]: 'View Analytics',
		[ActionType.OPEN_PLAN_TUNER]: 'Open Plan Tuner',
		[ActionType.MAKE_BUDGETS_FROM_PLAN]: 'Create Budgets from Plan',
		[ActionType.ALLOCATE_REMAINING]: 'Allocate Remaining',
		[ActionType.GOAL_ALLOCATION]: 'Allocate to Goals',
		[ActionType.PICK_TIME_WINDOW]: 'Pick Time Window',
		[ActionType.SET_LIMIT]: 'Set Limit',
		[ActionType.CREATE_RULE]: 'Create Rule',
		[ActionType.OPEN_COMPOUND_CALCULATOR]: 'Open Compound Calculator',
		[ActionType.OPEN_SETUP_WIZARD]: 'Open Setup Wizard',
		[ActionType.FETCH_HYSA_PICKS]: 'Fetch Current HYSA Picks',
		[ActionType.OPEN_ARTICLE]: 'Open Article',
		[ActionType.OPEN_LINKS]: 'Open Bank Pages',
		[ActionType.OPEN_TRANSFER_PLANNER]: 'Plan Monthly Transfer',
	};

	return displayNames[action] || action;
}
