import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HistoricalComparisonProps {
	historicalComparison: {
		previousPeriod: {
			totalIncome: number;
			totalExpenses: number;
			netIncome: number;
			topCategories: Array<{
				name: string;
				amount: number;
				percentage: number;
			}>;
		};
		percentageChanges: {
			income: number;
			expenses: number;
			netIncome: number;
		};
	};
	period: string;
}

export default function HistoricalComparison({
	historicalComparison,
	period,
}: HistoricalComparisonProps) {
	// Add safety checks for undefined or incomplete data
	if (
		!historicalComparison ||
		!historicalComparison.previousPeriod ||
		!historicalComparison.percentageChanges
	) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>
					Comparison with Previous{' '}
					{period.charAt(0).toUpperCase() + period.slice(1)}
				</Text>
				<Text style={styles.bodyText}>
					Historical comparison data is not available for this period.
				</Text>
			</View>
		);
	}

	const { previousPeriod, percentageChanges } = historicalComparison;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatPercentage = (percentage: number) => {
		const sign = percentage >= 0 ? '+' : '';
		return `${sign}${percentage.toFixed(1)}%`;
	};

	const getChangeColor = (percentage: number) => {
		if (percentage > 0) return '#22c55e'; // Green for positive
		if (percentage < 0) return '#ef4444'; // Red for negative
		return '#6b7280'; // Gray for no change
	};

	const getChangeIcon = (percentage: number) => {
		if (percentage > 0) return '↗️';
		if (percentage < 0) return '↘️';
		return '→';
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				Comparison with Previous{' '}
				{period.charAt(0).toUpperCase() + period.slice(1)}
			</Text>

			<View style={styles.comparisonGrid}>
				<View style={styles.comparisonItem}>
					<Text style={styles.label}>Income</Text>
					<Text style={styles.currentValue}>
						{formatCurrency(previousPeriod.totalIncome)}
					</Text>
					<View style={styles.changeContainer}>
						<Text style={styles.changeIcon}>
							{getChangeIcon(percentageChanges.income)}
						</Text>
						<Text
							style={[
								styles.changeValue,
								{ color: getChangeColor(percentageChanges.income) },
							]}
						>
							{formatPercentage(percentageChanges.income)}
						</Text>
					</View>
				</View>

				<View style={styles.comparisonItem}>
					<Text style={styles.label}>Expenses</Text>
					<Text style={styles.currentValue}>
						{formatCurrency(previousPeriod.totalExpenses)}
					</Text>
					<View style={styles.changeContainer}>
						<Text style={styles.changeIcon}>
							{getChangeIcon(percentageChanges.expenses)}
						</Text>
						<Text
							style={[
								styles.changeValue,
								{ color: getChangeColor(percentageChanges.expenses) },
							]}
						>
							{formatPercentage(percentageChanges.expenses)}
						</Text>
					</View>
				</View>

				<View style={styles.comparisonItem}>
					<Text style={styles.label}>Net Income</Text>
					<Text style={styles.currentValue}>
						{formatCurrency(previousPeriod.netIncome)}
					</Text>
					<View style={styles.changeContainer}>
						<Text style={styles.changeIcon}>
							{getChangeIcon(percentageChanges.netIncome)}
						</Text>
						<Text
							style={[
								styles.changeValue,
								{ color: getChangeColor(percentageChanges.netIncome) },
							]}
						>
							{formatPercentage(percentageChanges.netIncome)}
						</Text>
					</View>
				</View>
			</View>

			{previousPeriod.topCategories &&
				previousPeriod.topCategories.length > 0 && (
					<View style={styles.categoriesSection}>
						<Text style={styles.categoriesTitle}>Previous Top Categories</Text>
						{previousPeriod.topCategories.slice(0, 3).map((category, index) => (
							<View key={index} style={styles.categoryItem}>
								<Text style={styles.categoryName}>{category.name}</Text>
								<Text style={styles.categoryAmount}>
									{formatCurrency(category.amount)}
								</Text>
							</View>
						))}
					</View>
				)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	comparisonGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	comparisonItem: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 8,
	},
	label: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 4,
		textAlign: 'center',
	},
	currentValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
		textAlign: 'center',
	},
	changeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	changeIcon: {
		fontSize: 12,
		marginRight: 2,
	},
	changeValue: {
		fontSize: 12,
		fontWeight: '500',
	},
	categoriesSection: {
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		paddingTop: 12,
	},
	categoriesTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	categoryItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	categoryName: {
		fontSize: 13,
		color: '#6b7280',
		flex: 1,
	},
	categoryAmount: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
	},
	bodyText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 16,
	},
});
