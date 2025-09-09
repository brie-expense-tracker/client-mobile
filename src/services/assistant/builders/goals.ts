// assistant/builders/goals.ts
import { $, pct, clamp01 } from '../../../components/assistant/shared/format';

export const buildGoalAnswer = (facts: any, question: string) => {
	const goals = facts.goals ?? [];

	if (!goals.length) {
		return {
			text: "You don't have any goals yet. Want me to create one?",
			structuredResponse: {
				actions: [
					{
						label: 'Create a goal',
						action: 'OPEN_GOAL_WIZARD',
					},
				],
			},
		};
	}

	const cards = goals.map((g: any) => ({
		kind: 'PROGRESS',
		title: g.name,
		value: `${$(g.saved)} / ${$(g.target)}`,
		subtitle: `${pct(g.progress || (100 * g.saved) / (g.target || 1))} • ${$(
			Math.max(0, g.target - g.saved)
		)} left`,
		progress: clamp01((g.progress ?? (100 * g.saved) / (g.target || 1)) / 100),
	}));

	const text = `You're working on ${goals.length} goal${
		goals.length > 1 ? 's' : ''
	}. Here's where you stand.`;

	return {
		text,
		structuredResponse: {
			cards,
			actions: [
				{
					label: 'Manage goals',
					action: 'OPEN_GOAL_WIZARD',
				},
			],
		},
	};
};
