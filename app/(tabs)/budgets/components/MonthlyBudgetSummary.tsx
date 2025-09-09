import React from 'react';
import CircularProgressBar from './CircularProgressBar';

interface MonthlyBudgetSummaryProps {
	percentage?: number;
	spent?: number;
	total?: number;
	onPeriodToggle: () => void;
	isActive?: boolean;
}

const MonthlyBudgetSummary = (props: MonthlyBudgetSummaryProps) => {
	const { percentage = 0, spent = 0, total = 0 } = props;

	return (
		<CircularProgressBar
			percent={percentage}
			centerLabel={`$${spent.toFixed(0)}`}
			subtitle={`of $${total.toFixed(0)}`}
			color={percentage > 100 ? '#ef4444' : '#00a2ff'}
		/>
	);
};

export default MonthlyBudgetSummary;
