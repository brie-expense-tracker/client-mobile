import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface FinancialMetrics {
	totalIncome: number;
	totalExpenses: number;
	netSavings: number;
	budgetUtilization: number;
	goalProgress: number;
}

interface FinancialMetricsCardProps {
	metrics: FinancialMetrics;
}

export function FinancialMetricsCard({ metrics }: FinancialMetricsCardProps) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatPercentage = (value: number) => {
		return `${Math.round(value)}%`;
	};

	const getNetSavingsColor = (netSavings: number) => {
		if (netSavings > 0) return '#4CAF50';
		if (netSavings < 0) return '#F44336';
		return '#FF9800';
	};

	const getBudgetUtilizationColor = (utilization: number) => {
		if (utilization <= 80) return '#4CAF50';
		if (utilization <= 100) return '#FF9800';
		return '#F44336';
	};

	const getGoalProgressColor = (progress: number) => {
		if (progress >= 100) return '#4CAF50';
		if (progress >= 75) return '#8BC34A';
		if (progress >= 50) return '#FF9800';
		return '#F44336';
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, dynamicTextStyle]}>Financial Summary</Text>
			<Text style={[styles.subtitle, dynamicTextStyle]}>
				Your financial metrics for this week
			</Text>

			<View style={styles.metricsGrid}>
				{/* Income */}
				<View style={styles.metricCard}>
					<View style={styles.metricHeader}>
						<Ionicons name="trending-up" size={20} color="#4CAF50" />
						<Text style={[styles.metricLabel, dynamicTextStyle]}>Income</Text>
					</View>
					<Text style={[styles.metricValue, dynamicTextStyle]}>
						{formatCurrency(metrics.totalIncome)}
					</Text>
				</View>

				{/* Expenses */}
				<View style={styles.metricCard}>
					<View style={styles.metricHeader}>
						<Ionicons name="trending-down" size={20} color="#F44336" />
						<Text style={[styles.metricLabel, dynamicTextStyle]}>Expenses</Text>
					</View>
					<Text style={[styles.metricValue, dynamicTextStyle]}>
						{formatCurrency(metrics.totalExpenses)}
					</Text>
				</View>

				{/* Net Savings */}
				<View style={styles.metricCard}>
					<View style={styles.metricHeader}>
						<Ionicons
							name="wallet"
							size={20}
							color={getNetSavingsColor(metrics.netSavings)}
						/>
						<Text style={[styles.metricLabel, dynamicTextStyle]}>
							Net Savings
						</Text>
					</View>
					<Text
						style={[
							styles.metricValue,
							dynamicTextStyle,
							{ color: getNetSavingsColor(metrics.netSavings) },
						]}
					>
						{formatCurrency(metrics.netSavings)}
					</Text>
				</View>

				{/* Budget Utilization */}
				<View style={styles.metricCard}>
					<View style={styles.metricHeader}>
						<Ionicons
							name="pie-chart"
							size={20}
							color={getBudgetUtilizationColor(metrics.budgetUtilization)}
						/>
						<Text style={[styles.metricLabel, dynamicTextStyle]}>
							Budget Used
						</Text>
					</View>
					<Text
						style={[
							styles.metricValue,
							dynamicTextStyle,
							{ color: getBudgetUtilizationColor(metrics.budgetUtilization) },
						]}
					>
						{formatPercentage(metrics.budgetUtilization)}
					</Text>
				</View>

				{/* Goal Progress */}
				<View style={styles.metricCard}>
					<View style={styles.metricHeader}>
						<Ionicons
							name="flag"
							size={20}
							color={getGoalProgressColor(metrics.goalProgress)}
						/>
						<Text style={[styles.metricLabel, dynamicTextStyle]}>
							Goal Progress
						</Text>
					</View>
					<Text
						style={[
							styles.metricValue,
							dynamicTextStyle,
							{ color: getGoalProgressColor(metrics.goalProgress) },
						]}
					>
						{formatPercentage(metrics.goalProgress)}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 16,
	},
	metricsGrid: {
		gap: 12,
	},
	metricCard: {
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	metricHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	metricLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
	},
	metricValue: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
	},
});

export default FinancialMetricsCard;
