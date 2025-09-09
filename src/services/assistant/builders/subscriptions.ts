// assistant/builders/subscriptions.ts
import { $ } from '../../../components/assistant/shared/format';

export const buildSubsAnswer = (facts: any, question: string) => {
	const subs = facts.recurring ?? [];

	if (!subs.length) {
		return {
			text: 'No recurring bills found. Add one?',
			structuredResponse: {
				actions: [
					{
						label: 'Add bill',
						action: 'OPEN_RECURRING_FORM',
					},
				],
			},
		};
	}

	const monthly = subs.reduce((s: any, x: any) => s + (x.amount || 0), 0);

	return {
		text: `You have ${subs.length} recurring bills totaling ${$(monthly)}/mo.`,
		structuredResponse: {
			cards: subs.slice(0, 5).map((s: any) => ({
				kind: 'LIST_ITEM',
				title: s.name,
				value: $(s.amount),
				subtitle: s.cadence ?? 'monthly',
			})),
			actions: [
				{
					label: 'See all bills',
					action: 'VIEW_RECURRING',
				},
			],
		},
	};
};
