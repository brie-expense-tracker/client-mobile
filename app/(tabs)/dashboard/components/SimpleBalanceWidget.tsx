import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Transaction } from '../../../../src/data/transactions';
import StatWidget from './StatWidget';

interface BalanceWidgetProps {
	transactions: Transaction[];
}

const SimpleBalanceWidget: React.FC<BalanceWidgetProps> = ({
	transactions,
}) => {
	const { totalIncome, totalExpense } = useMemo(() => {
		console.log(
			'[SimpleBalanceWidget] Calculating income/expense from transactions:',
			transactions.length
		);

		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((s, t) => {
				const amount = isNaN(t.amount) ? 0 : t.amount;
				console.log(
					`[SimpleBalanceWidget] Income transaction ${t.id}: ${t.amount} -> ${amount}`
				);
				return s + amount;
			}, 0);

		const expense = transactions
			.filter((t) => t.type === 'expense')
			.reduce((s, t) => {
				const amount = isNaN(t.amount) ? 0 : t.amount;
				console.log(
					`[SimpleBalanceWidget] Expense transaction ${t.id}: ${t.amount} -> ${amount}`
				);
				return s + amount;
			}, 0);

		console.log('[SimpleBalanceWidget] Calculated totals:', {
			totalIncome: income,
			totalExpense: expense,
		});
		return { totalIncome: income, totalExpense: expense } as const;
	}, [transactions]);

	const max = Math.max(totalIncome, totalExpense);

	return (
		<View style={styles.simpleStatsContainer}>
			<View style={styles.simpleStatsRow}>
				<StatWidget
					label="Income"
					value={totalIncome}
					icon="trending-up-outline"
					color="#333"
					iconColor="#16ae05"
					progressValue={totalIncome}
					totalValue={max}
				/>
				<StatWidget
					label="Expense"
					value={totalExpense}
					icon="trending-down-outline"
					color="#333"
					iconColor="#dc2626"
					progressValue={totalExpense}
					totalValue={max}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	simpleStatsContainer: { marginTop: 16 },
	simpleStatsRow: { flexDirection: 'row', gap: 12 },
});

export default SimpleBalanceWidget;
