import React, { useMemo, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { TransactionContext } from '../../../../../src/context/transactionContext';
import CardWrapper from '../shared/CardWrapper';
import CardHeader from '../shared/CardHeader';
import StatPill from '../shared/StatPill';

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
});

const formatCurrency = (amount?: number | null) => {
	if (typeof amount !== 'number' || Number.isNaN(amount)) {
		return '—';
	}
	return currencyFormatter.format(amount);
};

function TransactionsSummaryCard() {
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);

	const transactionsSummary = useMemo(() => {
		if (transactionsLoading) {
			return {
				subtitle: 'Loading transactions…',
				total: '—',
				income: '—',
				expenses: '—',
			};
		}

		if (!transactions.length) {
			return {
				subtitle: 'No transactions yet',
				total: formatCurrency(0),
				income: formatCurrency(0),
				expenses: formatCurrency(0),
			};
		}

		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
		const expenses = transactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
		const net = income - expenses;

		return {
			subtitle: `${transactions.length} ${
				transactions.length === 1 ? 'transaction' : 'transactions'
			}`,
			total: formatCurrency(net),
			income: formatCurrency(income),
			expenses: formatCurrency(expenses),
		};
	}, [transactionsLoading, transactions]);

	return (
		<CardWrapper
			onPress={() => router.push('/(tabs)/dashboard/ledger')}
			accessibilityLabel="Open transactions view"
		>
			<View>
				<CardHeader
					title="Transactions"
					subtitle={transactionsSummary.subtitle}
					actionLabel="View All"
					icon="receipt-outline"
				/>

				<View style={styles.statRow}>
					<StatPill label="Net" value={transactionsSummary.total} />
					<StatPill label="Income" value={transactionsSummary.income} />
					<StatPill label="Expenses" value={transactionsSummary.expenses} />
				</View>
			</View>
		</CardWrapper>
	);
}

const styles = StyleSheet.create({
	statRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
	},
});

export default TransactionsSummaryCard;
