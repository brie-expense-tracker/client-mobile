type Mode = 'CHAT' | 'INSIGHTS' | 'ACTIONS' | 'ANALYTICS';

export function wantsInsights(intent: string, query: string): boolean {
	return (
		/why|how|forecast|trend|compare|analyze|pattern|insight/i.test(query) ||
		[
			'FORECAST_SPEND',
			'GENERAL_QA',
			'GET_SPENDING_BREAKDOWN',
			'GET_SPENDING_PLAN',
			'GOAL_ALLOCATION',
			'SURPLUS_ALLOCATION',
		].includes(intent)
	);
}

export function wantsActions(intent: string): boolean {
	return [
		'CREATE_BUDGET',
		'ADJUST_LIMIT',
		'MARK_PAID',
		'CREATE_RULE',
		'SET_LIMIT',
	].includes(intent);
}

export function wantsAnalytics(intent: string, query: string): boolean {
	return (
		/compare|breakdown|by week|by category|vs last|detailed|deep dive|chart|graph/i.test(
			query
		) ||
		(intent === 'GET_BUDGET_STATUS' && /compare|vs|breakdown/i.test(query)) ||
		(intent === 'GET_SPENDING_BREAKDOWN' &&
			/compare|trend|over time/i.test(query))
	);
}

export function shouldStayInChat(intent: string, query: string): boolean {
	// Simple questions that don't need mode switching
	return (
		/what|when|where|who|balance|amount|status/i.test(query) &&
		!wantsInsights(intent, query) &&
		!wantsAnalytics(intent, query) &&
		!wantsActions(intent)
	);
}

export function getRecommendedMode(intent: string, query: string): Mode {
	if (wantsAnalytics(intent, query)) return 'ANALYTICS';
	if (wantsActions(intent)) return 'ACTIONS';
	if (wantsInsights(intent, query)) return 'INSIGHTS';
	return 'CHAT';
}

export function canTransitionFrom(from: Mode, to: Mode): boolean {
	// Define allowed transitions
	const allowedTransitions: Record<Mode, Mode[]> = {
		CHAT: ['INSIGHTS', 'ACTIONS', 'ANALYTICS'],
		INSIGHTS: ['CHAT', 'ANALYTICS', 'ACTIONS'],
		ACTIONS: ['CHAT', 'INSIGHTS'],
		ANALYTICS: ['CHAT', 'INSIGHTS', 'ACTIONS'],
	};

	return allowedTransitions[from]?.includes(to) || false;
}

export function getTransitionReason(
	from: Mode,
	to: Mode,
	intent: string,
	query: string
): string {
	if (from === to) return 'no_change';

	if (to === 'INSIGHTS')
		return wantsInsights(intent, query)
			? 'user_wants_insights'
			: 'auto_insights';
	if (to === 'ACTIONS')
		return wantsActions(intent) ? 'user_wants_actions' : 'auto_actions';
	if (to === 'ANALYTICS')
		return wantsAnalytics(intent, query)
			? 'user_wants_analytics'
			: 'auto_analytics';
	if (to === 'CHAT') return 'return_to_chat';

	return 'unknown_transition';
}
