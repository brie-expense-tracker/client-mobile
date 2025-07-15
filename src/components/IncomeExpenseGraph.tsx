import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
}

interface IncomeExpenseGraphProps {
	transactions: Transaction[];
	title: string;
	period: 'week' | 'month' | 'quarter';
	chartType?: 'line' | 'bar';
}

const IncomeExpenseGraph: React.FC<IncomeExpenseGraphProps> = ({
	transactions,
	title,
	period,
	chartType = 'line',
}) => {
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = screenWidth - 120;

	// Early return if no transactions
	if (!transactions || transactions.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No transactions available</Text>
					<Text style={styles.emptySubtext}>
						Add some transactions to see your income vs expenses
					</Text>
				</View>
			</View>
		);
	}

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

	// Convert to chart data for gifted-charts
	const chartData = Array.from(groupedByDate.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, data], index) => {
			const dateObj = new Date(date);
			const label =
				period === 'week'
					? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
					: dateObj.toLocaleDateString('en-US', { day: 'numeric' });

			// Show label every 3rd point or at the end
			const shouldShowLabel =
				index % 3 === 0 || index === groupedByDate.size - 1;

			return {
				value: data.income,
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
					? { customDataPoint: incomeDataPoint }
					: { hideDataPoint: true }),
				date,
				income: data.income,
				expense: data.expense,
			};
		});

	const expenseChartData = Array.from(groupedByDate.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, data], index) => {
			const dateObj = new Date(date);
			const label =
				period === 'week'
					? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
					: dateObj.toLocaleDateString('en-US', { day: 'numeric' });

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
					? { customDataPoint: expenseDataPoint }
					: { hideDataPoint: true }),
				date,
				income: data.income,
				expense: data.expense,
			};
		});

	// Custom data point components
	const incomeDataPoint = () => {
		return (
			<View
				style={{
					width: 14,
					height: 14,
					backgroundColor: 'white',
					borderWidth: 3,
					borderRadius: 7,
					borderColor: '#4CAF50',
				}}
			/>
		);
	};

	const expenseDataPoint = () => {
		return (
			<View
				style={{
					width: 14,
					height: 14,
					backgroundColor: 'white',
					borderWidth: 3,
					borderRadius: 7,
					borderColor: '#FF6B6B',
				}}
			/>
		);
	};

	// Calculate totals for summary
	const totalIncome = filteredTransactions
		.filter((tx) => tx.type === 'income')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const totalExpense = filteredTransactions
		.filter((tx) => tx.type === 'expense')
		.reduce((sum, tx) => sum + tx.amount, 0);

	const netIncome = totalIncome - totalExpense;

	// Color scheme
	const colors = {
		income: '#4CAF50',
		expense: '#FF6B6B',
		net: '#2E78B7',
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
					{/* Income Line */}
					<View style={styles.chartWrapper}>
						<LineChart
							isAnimated
							thickness={3}
							color={colors.income}
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
							startFillColor={colors.income + '40'}
							endFillColor={colors.income + '10'}
							startOpacity={0.4}
							endOpacity={0.1}
							spacing={22}
							backgroundColor="#FFFFFF"
							rulesColor="#E0E0E0"
							rulesType="solid"
							initialSpacing={10}
							yAxisColor="#E0E0E0"
							xAxisColor="#E0E0E0"
							width={chartWidth}
							height={220}
						/>
					</View>

					{/* Expense Line (overlay) */}
					<View style={[styles.chartWrapper, styles.overlayChart]}>
						<LineChart
							isAnimated
							thickness={3}
							color={colors.expense}
							maxValue={
								Math.max(
									...expenseChartData.map((d) => Math.max(d.income, d.expense))
								) * 1.2
							}
							noOfSections={4}
							animateOnDataChange
							animationDuration={1000}
							onDataChangeAnimationDuration={300}
							areaChart
							yAxisTextStyle={styles.yAxisText}
							data={expenseChartData}
							hideDataPoints
							startFillColor={colors.expense + '40'}
							endFillColor={colors.expense + '10'}
							startOpacity={0.4}
							endOpacity={0.1}
							spacing={22}
							backgroundColor="transparent"
							rulesColor="transparent"
							rulesType="solid"
							initialSpacing={10}
							yAxisColor="transparent"
							xAxisColor="transparent"
							width={chartWidth}
							height={220}
						/>
					</View>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No data available</Text>
					<Text style={styles.emptySubtext}>
						Add some transactions to see your income vs expenses
					</Text>
				</View>
			)}

			{/* Legend */}
			<View style={styles.legend}>
				<View style={styles.legendItem}>
					<View
						style={[styles.legendDot, { backgroundColor: colors.income }]}
					/>
					<Text style={styles.legendText}>Income</Text>
				</View>
				<View style={styles.legendItem}>
					<View
						style={[styles.legendDot, { backgroundColor: colors.expense }]}
					/>
					<Text style={styles.legendText}>Expenses</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
		color: '#333',
	},
	summaryContainer: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	summaryCard: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		marginHorizontal: 4,
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '700',
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 16,
		position: 'relative',
	},
	chartWrapper: {
		overflow: 'visible',
		borderRadius: 12,
		paddingBottom: 5,
		alignItems: 'center',
	},
	overlayChart: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	yAxisText: {
		fontSize: 11,
		color: '#666',
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 8,
		fontSize: 16,
		fontWeight: '500',
		color: '#666',
	},
	emptySubtext: {
		marginTop: 4,
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	legend: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 24,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	legendDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 8,
	},
	legendText: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
	},
});

export default IncomeExpenseGraph;
