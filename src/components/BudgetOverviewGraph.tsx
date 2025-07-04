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
	const chartWidth = screenWidth - 40; // 20px padding on each side

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
				<BarChart
					data={chartData}
					width={chartWidth}
					height={200}
					barWidth={22}
					spacing={24}
					roundedTop
					roundedBottom
					hideRules
					xAxisLabelTextStyle={styles.xAxisLabel}
					yAxisTextStyle={styles.yAxisText}
					yAxisColor="#E0E0E0"
					xAxisColor="#E0E0E0"
					noOfSections={4}
					maxValue={maxValue * 1.2}
					initialSpacing={20}
					endSpacing={20}
					showVerticalLines
					verticalLinesColor="#F0F0F0"
					showGradient
					gradientColor={budgets[0]?.color || '#2E78B7'}
				/>
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
	chartContainer: {
		alignItems: 'center',
		marginBottom: 20,
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
	},
	legendSubtitle: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	legendPercentage: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2E78B7',
	},
});

export default BudgetOverviewGraph;
