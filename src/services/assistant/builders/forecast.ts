// assistant/builders/forecast.ts
import { $ } from '../../../components/assistant/shared/format';

export const buildForecastAnswer = (facts: any, question: string) => {
	const days = Math.max(1, facts.daysElapsed ?? 1);
	const spent = facts.totalSpent ?? 0;
	const daily = spent / days;
	const daysInPeriod = facts.daysInPeriod ?? 30;
	const forecast = daily * daysInPeriod;

	return {
		text: `At your current pace (~${$(
			daily
		)}/day), you're on track to spend ~${$(forecast)} this period.`,
		structuredResponse: {
			actions: [
				{
					label: 'See forecast',
					action: 'OPEN_BUDGETS',
					params: { tab: 'forecast' },
				},
			],
		},
	};
};
