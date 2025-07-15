import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
	categories?: Array<{ name: string; color?: string }>;
}

interface Budget {
	id: string;
	name: string;
	amount: number;
	spent?: number;
	color?: string;
	categories?: string[];
}

interface CategoryBreakdownChartProps {
	transactions: Transaction[];
	budgets: Budget[];
	title: string;
	period: 'week' | 'month' | 'quarter';
}

const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
	transactions,
	budgets,
	title,
	period,
}) => {
	const screenWidth = Dimensions.get('window').width;

	// Filter transactions for the period
	const getPeriodStartDate = () => {
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
		return start;
	};

	const periodStart = getPeriodStartDate();
	const periodTransactions = transactions.filter((tx) => {
		const txDate = new Date(tx.date);
		return txDate >= periodStart && tx.type === 'expense';
	});

	// Group expenses by category
	const categoryTotals = periodTransactions.reduce((acc, tx) => {
		const categoryName = tx.categories?.[0]?.name || 'Uncategorized';
		if (!acc[categoryName]) {
			acc[categoryName] = 0;
		}
		acc[categoryName] += tx.amount;
		return acc;
	}, {} as Record<string, number>);

	// Get top 5 categories
	const topCategories = Object.entries(categoryTotals)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	const totalExpenses = Object.values(categoryTotals).reduce(
		(sum, amount) => sum + amount,
		0
	);

	// Prepare pie chart data for gifted-charts
	const pieData = topCategories.map(([category, amount], index) => {
		const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
		return {
			value: amount,
			text: category,
			color: colors[index % colors.length],
			textColor: '#333',
			textSize: 12,
		};
	});

	// Calculate budget variance
	const budgetVariance = budgets.map((budget) => {
		const budgetCategory = budget.categories?.[0] || budget.name;
		const actualSpent = categoryTotals[budgetCategory] || 0;
		const budgetSpent = budget.spent || 0;
		const variance = actualSpent - budgetSpent;
		const variancePercentage =
			budgetSpent > 0 ? (variance / budgetSpent) * 100 : 0;

		return {
			category: budgetCategory,
			budgeted: budgetSpent,
			actual: actualSpent,
			variance,
			variancePercentage,
			color: budget.color || '#2E78B7',
		};
	});

	// Chart configuration for gifted-charts
	const chartConfig = {
		backgroundColor: '#FFFFFF',
		centerLabelComponent: () => (
			<View style={styles.centerLabel}>
				<Text style={styles.centerLabelText}>Total</Text>
				<Text style={styles.centerLabelValue}>${totalExpenses.toFixed(0)}</Text>
			</View>
		),
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>

			{/* Summary */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryCard}>
					<Text style={styles.summaryLabel}>Total Spent</Text>
					<Text style={styles.summaryValue}>${totalExpenses.toFixed(0)}</Text>
				</View>
				<View style={styles.summaryCard}>
					<Text style={styles.summaryLabel}>Categories</Text>
					<Text style={styles.summaryValue}>{topCategories.length}</Text>
				</View>
				<View style={styles.summaryCard}>
					<Text style={styles.summaryLabel}>Avg/Category</Text>
					<Text style={styles.summaryValue}>
						${(totalExpenses / Math.max(topCategories.length, 1)).toFixed(0)}
					</Text>
				</View>
			</View>

			{/* Pie Chart */}
			{topCategories.length > 0 ? (
				<View style={styles.chartContainer}>
					<PieChart
						data={pieData}
						radius={80}
						innerRadius={40}
						centerLabelComponent={chartConfig.centerLabelComponent}
						showText
						textColor="black"
						textSize={12}
						focusOnPress
						showValuesAsLabels
						showTextBackground
						textBackgroundColor="white"
						textBackgroundRadius={10}
					/>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Ionicons name="pie-chart-outline" size={48} color="#CCC" />
					<Text style={styles.emptyText}>No spending data available</Text>
				</View>
			)}

			{/* Category List */}
			<View style={styles.categoryList}>
				<Text style={styles.sectionTitle}>Top Spending Categories</Text>
				{topCategories.map(([category, amount], index) => (
					<View key={category} style={styles.categoryItem}>
						<View style={styles.categoryInfo}>
							<View
								style={[
									styles.categoryDot,
									{ backgroundColor: pieData[index]?.color },
								]}
							/>
							<Text style={styles.categoryName}>{category}</Text>
						</View>
						<View style={styles.categoryAmounts}>
							<Text style={styles.categoryAmount}>${amount.toFixed(0)}</Text>
							<Text style={styles.categoryPercentage}>
								{((amount / totalExpenses) * 100).toFixed(1)}%
							</Text>
						</View>
					</View>
				))}
			</View>

			{/* Budget Variance */}
			{budgetVariance.length > 0 && (
				<View style={styles.varianceSection}>
					<Text style={styles.sectionTitle}>Budget vs Actual</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{budgetVariance.map((item) => (
							<View key={item.category} style={styles.varianceCard}>
								<Text style={styles.varianceCategory}>{item.category}</Text>
								<Text style={styles.varianceAmount}>
									${item.actual.toFixed(0)} / ${item.budgeted.toFixed(0)}
								</Text>
								<View style={styles.varianceIndicator}>
									<Ionicons
										name={item.variance > 0 ? 'arrow-up' : 'arrow-down'}
										size={16}
										color={item.variance > 0 ? '#FF6B6B' : '#4CAF50'}
									/>
									<Text
										style={[
											styles.varianceText,
											{ color: item.variance > 0 ? '#FF6B6B' : '#4CAF50' },
										]}
									>
										{item.variance > 0 ? '+' : ''}$
										{Math.abs(item.variance).toFixed(0)}
									</Text>
								</View>
							</View>
						))}
					</ScrollView>
				</View>
			)}
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
		alignItems: 'center',
		padding: 12,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		marginHorizontal: 4,
	},
	summaryLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#333',
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 16,
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 8,
		color: '#999',
		fontSize: 14,
	},
	categoryList: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
		color: '#333',
	},
	categoryItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	categoryInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	categoryDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 12,
	},
	categoryName: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
	},
	categoryAmounts: {
		alignItems: 'flex-end',
	},
	categoryAmount: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
	},
	categoryPercentage: {
		fontSize: 12,
		color: '#666',
	},
	varianceSection: {
		marginTop: 8,
	},
	varianceCard: {
		backgroundColor: '#F8F9FA',
		padding: 12,
		borderRadius: 8,
		marginRight: 12,
		minWidth: 120,
	},
	varianceCategory: {
		fontSize: 12,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	varianceAmount: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		marginBottom: 4,
	},
	varianceIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	varianceText: {
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 4,
	},
	centerLabel: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerLabelText: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	centerLabelValue: {
		fontSize: 16,
		color: '#333',
		fontWeight: '700',
	},
});

export default CategoryBreakdownChart;
