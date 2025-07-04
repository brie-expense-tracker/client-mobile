import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, LineChartBicolor } from 'react-native-gifted-charts';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
	category?: string;
}

interface SpendingTrendsGraphProps {
	transactions: Transaction[];
	title?: string;
	period?: 'week' | 'month' | 'quarter' | 'year';
}

const SpendingTrendsGraph: React.FC<SpendingTrendsGraphProps> = ({
	transactions,
	title = 'Spending Trends',
	period = 'month',
}) => {
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = screenWidth - 40;

	// Get date range based on period
	const getDateRange = () => {
		const now = new Date();
		const start = new Date();

		switch (period) {
			case 'week':
				start.setDate(now.getDate() - 7);
				break;
			case 'month':
				start.setMonth(now.getMonth() - 1);
				break;
			case 'quarter':
				start.setMonth(now.getMonth() - 3);
				break;
			case 'year':
				start.setFullYear(now.getFullYear() - 1);
				break;
		}

		return { start, end: now };
	};

	const { start, end } = getDateRange();

	// Filter transactions within the date range
	const filteredTransactions = transactions.filter((tx) => {
		const txDate = new Date(tx.date);
		return txDate >= start && txDate <= end;
	});

	// Group transactions by date
	const groupedByDate = new Map<string, { income: number; expense: number }>();

	// Initialize all dates in range
	let currentDate = new Date(start);
	while (currentDate <= end) {
		const dateKey = currentDate.toISOString().split('T')[0];
		groupedByDate.set(dateKey, { income: 0, expense: 0 });
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Aggregate transactions by date
	filteredTransactions.forEach((tx) => {
		const dateKey = new Date(tx.date).toISOString().split('T')[0];
		const existing = groupedByDate.get(dateKey) || { income: 0, expense: 0 };

		if (tx.type === 'income') {
			existing.income += tx.amount;
		} else {
			existing.expense += tx.amount;
		}

		groupedByDate.set(dateKey, existing);
	});

	// Convert to chart data
	const chartData = Array.from(groupedByDate.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, data]) => {
			const dateObj = new Date(date);
			const label =
				period === 'week'
					? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
					: period === 'month'
					? dateObj.toLocaleDateString('en-US', { day: 'numeric' })
					: dateObj.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
					  });

			return {
				value: data.expense,
				label,
				date,
				income: data.income,
				expense: data.expense,
				net: data.income - data.expense,
			};
		});

	// Calculate summary statistics
	const totalIncome = filteredTransactions
		.filter((tx) => tx.type === 'income')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const totalExpense = filteredTransactions
		.filter((tx) => tx.type === 'expense')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const netIncome = totalIncome - totalExpense;
	const avgDailyExpense = totalExpense / Math.max(chartData.length, 1);

	// Get top spending categories
	const categorySpending = new Map<string, number>();
	filteredTransactions
		.filter((tx) => tx.type === 'expense' && tx.category)
		.forEach((tx) => {
			const current = categorySpending.get(tx.category!) || 0;
			categorySpending.set(tx.category!, current + tx.amount);
		});

	const topCategories = Array.from(categorySpending.entries())
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);

	// Color scheme
	const colors = {
		income: '#4CAF50',
		expense: '#FF6B6B',
		net: '#2E78B7',
		background: '#F8F9FA',
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>

			{/* Summary Cards */}
			<View style={styles.summaryContainer}>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: colors.income + '15' },
					]}
				>
					<Text style={[styles.summaryLabel, { color: colors.income }]}>
						Income
					</Text>
					<Text style={[styles.summaryValue, { color: colors.income }]}>
						${totalIncome.toFixed(0)}
					</Text>
				</View>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: colors.expense + '15' },
					]}
				>
					<Text style={[styles.summaryLabel, { color: colors.expense }]}>
						Expenses
					</Text>
					<Text style={[styles.summaryValue, { color: colors.expense }]}>
						${totalExpense.toFixed(0)}
					</Text>
				</View>
				<View
					style={[styles.summaryCard, { backgroundColor: colors.net + '15' }]}
				>
					<Text style={[styles.summaryLabel, { color: colors.net }]}>Net</Text>
					<Text style={[styles.summaryValue, { color: colors.net }]}>
						${netIncome.toFixed(0)}
					</Text>
				</View>
			</View>

			{/* Chart */}
			{chartData.length > 0 ? (
				<View style={styles.chartContainer}>
					<LineChartBicolor
						data={chartData}
						width={chartWidth}
						height={200}
						thickness={3}
						color={colors.expense}
						colorNegative={colors.income}
						maxValue={
							Math.max(...chartData.map((d) => Math.max(d.income, d.expense))) *
							1.2
						}
						noOfSections={4}
						areaChart
						curved
						startFillColor={colors.expense + '40'}
						endFillColor={colors.expense + '10'}
						startOpacity={0.4}
						endOpacity={0.1}
						spacing={chartWidth / (chartData.length - 1)}
						initialSpacing={20}
						endSpacing={20}
						yAxisTextStyle={styles.yAxisText}
						xAxisLabelTextStyle={styles.xAxisLabel}
						yAxisColor="#E0E0E0"
						xAxisColor="#E0E0E0"
						hideRules
						showVerticalLines
						verticalLinesColor="#F0F0F0"
						dataPointsHeight={8}
						dataPointsWidth={8}
						dataPointsColor={colors.expense}
						dataPointsRadius={4}
						hideDataPoints={false}
					/>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No data available</Text>
					<Text style={styles.emptySubtext}>
						Add some transactions to see your spending trends
					</Text>
				</View>
			)}

			{/* Additional Metrics */}
			<View style={styles.metricsContainer}>
				<View style={styles.metricItem}>
					<Text style={styles.metricLabel}>Avg Daily Expense</Text>
					<Text style={styles.metricValue}>${avgDailyExpense.toFixed(0)}</Text>
				</View>

				{topCategories.length > 0 && (
					<View style={styles.metricItem}>
						<Text style={styles.metricLabel}>Top Category</Text>
						<Text style={styles.metricValue}>{topCategories[0][0]}</Text>
						<Text style={styles.metricSubtext}>
							${topCategories[0][1].toFixed(0)}
						</Text>
					</View>
				)}
			</View>

			{/* Top Categories */}
			{topCategories.length > 0 && (
				<View style={styles.categoriesContainer}>
					<Text style={styles.categoriesTitle}>Top Spending Categories</Text>
					{topCategories.map(([category, amount], index) => (
						<View key={category} style={styles.categoryItem}>
							<View style={styles.categoryRank}>
								<Text style={styles.categoryRankText}>{index + 1}</Text>
							</View>
							<View style={styles.categoryInfo}>
								<Text style={styles.categoryName}>{category}</Text>
								<Text style={styles.categoryAmount}>${amount.toFixed(0)}</Text>
							</View>
							<View style={styles.categoryPercentage}>
								<Text style={styles.categoryPercentageText}>
									{((amount / totalExpense) * 100).toFixed(1)}%
								</Text>
							</View>
						</View>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
		marginHorizontal: 20,
		marginVertical: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 20,
		textAlign: 'center',
	},
	summaryContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	summaryCard: {
		flex: 1,
		padding: 12,
		borderRadius: 12,
		alignItems: 'center',
		marginHorizontal: 4,
	},
	summaryLabel: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '700',
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 20,
	},
	yAxisText: {
		fontSize: 11,
		color: '#666',
	},
	xAxisLabel: {
		fontSize: 11,
		color: '#666',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	metricsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
		paddingVertical: 15,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
	},
	metricItem: {
		alignItems: 'center',
	},
	metricLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	metricValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2E78B7',
	},
	metricSubtext: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	categoriesContainer: {
		marginTop: 10,
	},
	categoriesTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 12,
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		paddingVertical: 8,
	},
	categoryRank: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#2E78B7',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	categoryRankText: {
		color: 'white',
		fontSize: 12,
		fontWeight: '700',
	},
	categoryInfo: {
		flex: 1,
	},
	categoryName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1A1A1A',
	},
	categoryAmount: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	categoryPercentage: {
		alignItems: 'flex-end',
	},
	categoryPercentageText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2E78B7',
	},
});

export default SpendingTrendsGraph;
