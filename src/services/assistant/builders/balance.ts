// assistant/builders/balance.ts
import { $ } from '../../../components/assistant/shared/format';

export const buildBalanceAnswer = (facts: any, question: string) => {
	const inc = facts.totalIncome ?? 0;
	const out = facts.totalSpent ?? 0;
	const net = inc - out;
	const text = `So far this period: ${$(inc)} in, ${$(out)} out — net ${$(
		net
	)}.`;

	return {
		text,
		structuredResponse: {
			cards: [
				{
					kind: 'KPI_ROW',
					items: [
						{ label: 'Income', value: $(inc) },
						{ label: 'Spending', value: $(out) },
						{ label: 'Net', value: $(net) },
					],
				},
			],
			actions: [
				{
					label: 'Open Insights',
					action: 'OPEN_BUDGETS',
					params: { period: 'mtd' },
				},
			],
		},
	};
};
