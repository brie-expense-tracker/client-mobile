// assistant/composeAnswer.ts - Central composer + registry
import { buildBudgetAnswer } from '../../../services/assistant/builders/budget';
import { buildBalanceAnswer } from '../../../services/assistant/builders/balance';
import { buildGoalAnswer } from '../../../services/assistant/builders/goals';
import { buildSubsAnswer } from '../../../services/assistant/builders/subscriptions';
import { buildForecastAnswer } from '../../../services/assistant/builders/forecast';

export type Answer = {
	text: string; // short human sentence
	structuredResponse?: {
		// cards + actions the UI can render
		cards?: any[];
		actions?: { label: string; action: string; params?: any }[];
		details?: string; // DEV only
	};
};

type Facts = Record<string, any>;
type Builder = (facts: Facts, question: string) => Answer;

const builders: Record<string, Builder> = {
	GET_BUDGET_STATUS: buildBudgetAnswer,
	GET_BALANCE: buildBalanceAnswer,
	GET_GOAL_PROGRESS: buildGoalAnswer,
	LIST_SUBSCRIPTIONS: buildSubsAnswer,
	FORECAST_SPEND: buildForecastAnswer,
};

export function composeAnswer(
	intent: string,
	facts: Facts,
	question: string,
	dev = false
): Answer {
	const builder = builders[intent] ?? buildBalanceAnswer; // safe default
	const ans = builder(facts, question);

	// Never dump JSON in chat; keep it in DEV-only details.
	if (dev) {
		ans.structuredResponse = {
			...(ans.structuredResponse ?? {}),
			details: JSON.stringify({ intent, facts }, null, 2),
		};
	}
	return ans;
}
