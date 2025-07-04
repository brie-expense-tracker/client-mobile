import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Budget } from '../context/budgetContext';

interface BudgetOverviewGraphProps {
	budgets: Budget[];
	title?: string;
}

const BudgetOverviewGraph: React.FC<BudgetOverviewGraphProps> = ({
	budgets,
	title = 'Budget Overview',
}) => {
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = screenWidth - 100; // More conservative to ensure x-axis fits

	// Transform budget data for the chart
	const chartData = budgets.map((budget) => {
		const spentPercentage =
			budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;
		const isOverBudget = spentPercentage > 100;

		return {
			value: budget.spent,
			label: budget.category,
			frontColor: isOverBudget ? '#FF6B6B' : budget.color,
			topLabelComponent: () => (
				<View style={styles.topLabel}>
					<Text style={styles.topLabelText}>${budget.spent.toFixed(0)}</Text>
				</View>
			),
			topLabelContainerStyle: {
				width: 60,
				height: 20,
			},
		};
	});

	// Calculate max value for chart scaling
	const maxValue = Math.max(
		...budgets.map((b) => Math.max(b.spent, b.allocated)),
		100 // Minimum value to ensure chart is visible
	);

	// Ensure we have enough space for the chart
	const minRequiredWidth = chartData.length * 50; // Minimum 50px per bar
	const adjustedChartWidth = Math.min(
		chartWidth,
		Math.max(minRequiredWidth, chartWidth * 0.8)
	);

	// Create legend data
	const legendData = budgets.map((budget) => ({
		title: budget.category,
		color: budget.color,
		allocated: budget.allocated,
		spent: budget.spent,
	}));

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>

			<View style={styles.chartContainer}>
				<View style={styles.chartWrapper}>
					{adjustedChartWidth >= minRequiredWidth ? (
						<BarChart
							data={chartData}
							width={adjustedChartWidth}
							height={200}
							barWidth={Math.min(
								22,
								adjustedChartWidth / (chartData.length + 2)
							)}
							spacing={Math.min(
								24,
								adjustedChartWidth / (chartData.length + 4)
							)}
							roundedTop
							roundedBottom
							hideRules
							xAxisLabelTextStyle={styles.xAxisLabel}
							yAxisTextStyle={styles.yAxisText}
							yAxisColor="#E0E0E0"
							xAxisColor="#E0E0E0"
							noOfSections={4}
							maxValue={maxValue * 1.2}
							initialSpacing={Math.min(20, adjustedChartWidth * 0.05)}
							endSpacing={Math.min(20, adjustedChartWidth * 0.05)}
							showVerticalLines
							verticalLinesColor="#F0F0F0"
							showGradient
							gradientColor={budgets[0]?.color || '#2E78B7'}
						/>
					) : (
						<View style={styles.chartWarning}>
							<Text style={styles.chartWarningText}>
								Chart too wide for screen. Please rotate device or view on
								larger screen.
							</Text>
						</View>
					)}
				</View>
			</View>

			{/* Legend */}
			<View style={styles.legendContainer}>
				{legendData.map((item, index) => (
					<View key={index} style={styles.legendItem}>
						<View
							style={[styles.legendColor, { backgroundColor: item.color }]}
						/>
						<View style={styles.legendTextContainer}>
							<Text style={styles.legendTitle}>{item.title}</Text>
							<Text style={styles.legendSubtitle}>
								${item.spent.toFixed(0)} / ${item.allocated.toFixed(0)}
							</Text>
						</View>
						<Text style={styles.legendPercentage}>
							{((item.spent / item.allocated) * 100).toFixed(0)}%
						</Text>
					</View>
				))}
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
	chartContainer: {
		alignItems: 'center',
		marginBottom: 20,
		width: '100%',
		overflow: 'hidden',
	},
	chartWrapper: {
		overflow: 'hidden',
	},
	topLabel: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	topLabelText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#666',
	},
	xAxisLabel: {
		fontSize: 11,
		fontWeight: '500',
		color: '#666',
	},
	yAxisText: {
		fontSize: 11,
		fontWeight: '500',
		color: '#666',
	},
	legendContainer: {
		marginTop: 10,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		paddingVertical: 4,
	},
	legendColor: {
		width: 16,
		height: 16,
		borderRadius: 8,
		marginRight: 12,
	},
	legendTextContainer: {
		flex: 1,
	},
	legendTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1A1A1A',
		flexShrink: 1,
	},
	legendSubtitle: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
		flexShrink: 1,
	},
	legendPercentage: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2E78B7',
	},
	chartWarning: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	chartWarningText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
	},
});

export default BudgetOverviewGraph;
