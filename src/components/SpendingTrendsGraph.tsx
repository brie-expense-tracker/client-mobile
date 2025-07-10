import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
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
	const chartWidth = screenWidth - 120; // More conservative to ensure it fits

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

	// Convert to chart data with alternating labels
	const chartData = Array.from(groupedByDate.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, data], index) => {
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

			// Show label every 3rd point or at the end
			const shouldShowLabel =
				index % 3 === 0 || index === groupedByDate.size - 1;

			return {
				value: data.expense,
				...(shouldShowLabel && {
					labelComponent: () => (
						<Text
							style={{
								fontSize: 11,
								fontWeight: '500',
								color: '#666',
								textAlign: 'center',
							}}
						>
							{label}
						</Text>
					),
				}),
				...(index % 2 === 0
					? { customDataPoint: dPoint }
					: { hideDataPoint: true }),
				date,
				income: data.income,
				expense: data.expense,
				net: data.income - data.expense,
			};
		});

	// Custom data point component
	const dPoint = () => {
		return (
			<View
				style={{
					width: 14,
					height: 14,
					backgroundColor: 'white',
					borderWidth: 3,
					borderRadius: 7,
					borderColor: colors.expense,
				}}
			/>
		);
	};

	// Calculate summary statistics
	const totalIncome = filteredTransactions
		.filter((tx) => tx.type === 'income')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const totalExpense = filteredTransactions
		.filter((tx) => tx.type === 'expense')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const netIncome = totalIncome - totalExpense;
	const avgDailyExpense = totalExpense / Math.max(chartData.length, 1);

	// Color scheme
	const colors = {
		income: '#4CAF50',
		expense: '#FF6B6B',
		net: '#2E78B7',
		background: '#F8F9FA',
	};

	// Use the full chart width available
	const adjustedChartWidth = chartWidth;

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
					<View style={styles.chartWrapper}>
						<LineChart
							isAnimated
							thickness={3}
							color={colors.expense}
							maxValue={
								Math.max(
									...chartData.map((d) => Math.max(d.income, d.expense))
								) * 1.2
							}
							noOfSections={4}
							animateOnDataChange
							animationDuration={1000}
							onDataChangeAnimationDuration={300}
							areaChart
							yAxisTextStyle={styles.yAxisText}
							data={chartData}
							hideDataPoints
							startFillColor={colors.expense + '40'}
							endFillColor={colors.expense + '10'}
							startOpacity={0.4}
							endOpacity={0.1}
							spacing={22}
							backgroundColor="#FFFFFF"
							rulesColor="#E0E0E0"
							rulesType="solid"
							initialSpacing={10}
							yAxisColor="#E0E0E0"
							xAxisColor="#E0E0E0"
							width={adjustedChartWidth}
							height={220}
						/>
					</View>
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
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
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
		width: '100%',
		overflow: 'visible',
	},
	chartWrapper: {
		overflow: 'visible',
		borderRadius: 12,
		paddingBottom: 5,
		alignItems: 'center',
	},
	yAxisText: {
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
		flexShrink: 1,
	},
	categoryAmount: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
		flexShrink: 1,
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
