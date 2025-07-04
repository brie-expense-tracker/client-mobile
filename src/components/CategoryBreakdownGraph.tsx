import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
	category?: string;
}

interface CategoryBreakdownGraphProps {
	transactions: Transaction[];
	title?: string;
	period?: 'week' | 'month' | 'quarter' | 'year';
}

const CategoryBreakdownGraph: React.FC<CategoryBreakdownGraphProps> = ({
	transactions,
	title = 'Category Breakdown',
	period = 'month',
}) => {
	const screenWidth = Dimensions.get('window').width;
	const chartSize = Math.min(screenWidth - 120, 250); // Account for parent ScrollView padding (40px) + component padding (40px) + extra margin (40px)

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

	// Filter expense transactions within the date range
	const filteredTransactions = transactions.filter((tx) => {
		const txDate = new Date(tx.date);
		return tx.type === 'expense' && txDate >= start && txDate <= end;
	});

	// Group transactions by category
	const categorySpending = new Map<string, number>();
	filteredTransactions.forEach((tx) => {
		const category = tx.category || 'Uncategorized';
		const current = categorySpending.get(category) || 0;
		categorySpending.set(category, current + tx.amount);
	});

	// Color palette for categories
	const colorPalette = [
		'#FF6B6B',
		'#4ECDC4',
		'#45B7D1',
		'#96CEB4',
		'#FFEAA7',
		'#DDA0DD',
		'#98D8C8',
		'#F7DC6F',
		'#BB8FCE',
		'#85C1E9',
		'#F8C471',
		'#82E0AA',
		'#F1948A',
		'#85C1E9',
		'#D7BDE2',
	];

	// Transform data for pie chart
	const pieData = Array.from(categorySpending.entries())
		.sort(([, a], [, b]) => b - a) // Sort by amount descending
		.map(([category, amount], index) => ({
			value: amount,
			text: category,
			color: colorPalette[index % colorPalette.length],
			textColor: '#FFFFFF',
			textSize: 12,
			fontWeight: '600',
		}));

	// Calculate total spending
	const totalSpending = filteredTransactions.reduce(
		(sum, tx) => sum + tx.amount,
		0
	);

	// Get top 5 categories for detailed breakdown
	const topCategories = Array.from(categorySpending.entries())
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	// Calculate average spending per category
	const avgPerCategory = totalSpending / Math.max(categorySpending.size, 1);

	// Find the category with highest spending
	const highestCategory = topCategories[0];
	const highestPercentage = highestCategory
		? (highestCategory[1] / totalSpending) * 100
		: 0;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>

			{/* Summary Stats */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Total Spent</Text>
					<Text style={styles.summaryValue}>${totalSpending.toFixed(0)}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Categories</Text>
					<Text style={styles.summaryValue}>{categorySpending.size}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Avg/Category</Text>
					<Text style={styles.summaryValue}>${avgPerCategory.toFixed(0)}</Text>
				</View>
			</View>

			{/* Pie Chart */}
			{pieData.length > 0 ? (
				<View style={styles.chartContainer}>
					<View style={styles.chartWrapper}>
						<PieChart
							data={pieData}
							radius={chartSize / 2}
							innerRadius={chartSize / 3}
							centerLabelComponent={() => (
								<View style={styles.centerLabel}>
									<Text style={styles.centerLabelText}>
										{categorySpending.size}
									</Text>
									<Text style={styles.centerLabelSubtext}>Categories</Text>
								</View>
							)}
							showText
							textColor="white"
							textSize={12}
							fontWeight="600"
							strokeWidth={2}
							strokeColor="white"
							showGradient
							gradientCenterColor="#FFFFFF"
						/>
					</View>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No spending data</Text>
					<Text style={styles.emptySubtext}>
						Add some expense transactions to see category breakdown
					</Text>
				</View>
			)}

			{/* Category Breakdown List */}
			{topCategories.length > 0 && (
				<View style={styles.breakdownContainer}>
					<Text style={styles.breakdownTitle}>Top Categories</Text>
					{topCategories.map(([category, amount], index) => {
						const percentage = (amount / totalSpending) * 100;
						const color = colorPalette[index % colorPalette.length];

						return (
							<View key={category} style={styles.categoryItem}>
								<View style={styles.categoryHeader}>
									<View
										style={[styles.categoryDot, { backgroundColor: color }]}
									/>
									<View style={styles.categoryInfo}>
										<Text style={styles.categoryName}>{category}</Text>
										<Text style={styles.categoryAmount}>
											${amount.toFixed(0)}
										</Text>
									</View>
									<View style={styles.categoryStats}>
										<Text style={styles.categoryPercentage}>
											{percentage.toFixed(1)}%
										</Text>
										<Text style={styles.categoryRank}>#{index + 1}</Text>
									</View>
								</View>

								{/* Progress Bar */}
								<View style={styles.progressBarContainer}>
									<View style={styles.progressBarBackground}>
										<View
											style={[
												styles.progressBarFill,
												{
													width: `${percentage}%`,
													backgroundColor: color,
												},
											]}
										/>
									</View>
								</View>
							</View>
						);
					})}
				</View>
			)}

			{/* Insights */}
			{highestCategory && (
				<View style={styles.insightsContainer}>
					<Text style={styles.insightsTitle}>💡 Insights</Text>
					<View style={styles.insightItem}>
						<Text style={styles.insightText}>
							<Text style={styles.insightHighlight}>{highestCategory[0]}</Text>{' '}
							is your top spending category at{' '}
							<Text style={styles.insightHighlight}>
								{highestPercentage.toFixed(1)}%
							</Text>{' '}
							of total expenses.
						</Text>
					</View>
					{highestPercentage > 50 && (
						<View style={styles.insightItem}>
							<Text style={styles.insightText}>
								Consider reviewing your{' '}
								<Text style={styles.insightHighlight}>
									{highestCategory[0]}
								</Text>{' '}
								spending - it's over half your total expenses!
							</Text>
						</View>
					)}
					{categorySpending.size > 5 && (
						<View style={styles.insightItem}>
							<Text style={styles.insightText}>
								You're tracking expenses across{' '}
								<Text style={styles.insightHighlight}>
									{categorySpending.size} categories
								</Text>
								. Great organization!
							</Text>
						</View>
					)}
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
		justifyContent: 'space-around',
		marginBottom: 20,
		paddingVertical: 15,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
	},
	summaryItem: {
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#2E78B7',
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 20,
		width: '100%',
		overflow: 'hidden',
	},
	chartWrapper: {
		overflow: 'hidden',
		borderRadius: 12,
	},
	centerLabel: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerLabelText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#2E78B7',
	},
	centerLabelSubtext: {
		fontSize: 10,
		color: '#666',
		marginTop: 2,
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
	breakdownContainer: {
		marginTop: 10,
	},
	breakdownTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 16,
	},
	categoryItem: {
		marginBottom: 16,
	},
	categoryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	categoryDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 12,
	},
	categoryInfo: {
		flex: 1,
	},
	categoryName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 2,
		flexShrink: 1,
	},
	categoryAmount: {
		fontSize: 14,
		color: '#666',
		flexShrink: 1,
	},
	categoryStats: {
		alignItems: 'flex-end',
	},
	categoryPercentage: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2E78B7',
		marginBottom: 2,
	},
	categoryRank: {
		fontSize: 12,
		color: '#999',
	},
	progressBarContainer: {
		marginLeft: 24, // Align with category info
	},
	progressBarBackground: {
		height: 6,
		backgroundColor: '#E0E0E0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 3,
	},
	insightsContainer: {
		marginTop: 20,
		padding: 16,
		backgroundColor: '#F0F8FF',
		borderRadius: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#2E78B7',
	},
	insightsTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 12,
	},
	insightItem: {
		marginBottom: 8,
	},
	insightText: {
		fontSize: 14,
		color: '#333',
		lineHeight: 20,
	},
	insightHighlight: {
		fontWeight: '700',
		color: '#2E78B7',
	},
});

export default CategoryBreakdownGraph;
