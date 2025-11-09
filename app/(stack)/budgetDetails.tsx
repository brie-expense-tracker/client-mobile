import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	ActivityIndicator,
	RefreshControl,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useBudget, Budget } from '../../src/context/budgetContext';
import LinearProgressBar from '../(tabs)/wallet/components/LinearProgressBar';
import {
	BudgetAnalysisService,
	BudgetAnalysis,
} from '../../src/services/feature/budgetAnalysisService';
import {
	FinancialSnapshotService,
	BudgetHistoryItem,
} from '../../src/services/feature/financialSnapshotService';
import { useProfile } from '../../src/context/profileContext';

const BudgetSummaryScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const budgetId = params.id as string;
	const { budgets } = useBudget();
	const { profile } = useProfile();
	const [budget, setBudget] = useState<Budget | null>(null);
	const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
	const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	// Calculate budget period information dynamically
	const budgetPeriodInfo = useMemo(() => {
		if (!budget || !profile?.preferences?.budgetSettings) return null;

		const settings = profile.preferences.budgetSettings;
		const now = new Date();

		let periodStart: Date;
		let periodEnd: Date;
		let daysUntilReset: number;

		if (budget.period === 'weekly') {
			// Calculate weekly period based on user's week start day
			const weekStartDay = budget.weekStartDay ?? settings.cycleStart ?? 0;
			const currentDayOfWeek = now.getDay();
			const daysSinceStart = (currentDayOfWeek - weekStartDay + 7) % 7;

			periodStart = new Date(now);
			periodStart.setDate(now.getDate() - daysSinceStart);
			periodStart.setHours(0, 0, 0, 0);

			periodEnd = new Date(periodStart);
			periodEnd.setDate(periodEnd.getDate() + 6);
			periodEnd.setHours(23, 59, 59, 999);

			// Calculate days until next reset
			const nextReset = new Date(periodEnd);
			nextReset.setDate(nextReset.getDate() + 1);
			daysUntilReset = Math.ceil(
				(nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
		} else {
			// Calculate monthly period based on user's month start day
			const monthStartDay = budget.monthStartDay ?? settings.cycleStart ?? 1;
			periodStart = new Date(now.getFullYear(), now.getMonth(), monthStartDay);

			if (periodStart > now) {
				periodStart = new Date(
					now.getFullYear(),
					now.getMonth() - 1,
					monthStartDay
				);
			}

			periodEnd = new Date(periodStart);
			periodEnd.setMonth(periodEnd.getMonth() + 1);
			periodEnd.setDate(periodEnd.getDate() - 1);

			// Calculate days until next reset
			const nextReset = new Date(periodEnd);
			nextReset.setDate(nextReset.getDate() + 1);
			daysUntilReset = Math.ceil(
				(nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
		}

		return {
			periodStart,
			periodEnd,
			daysUntilReset,
			periodType: budget.period,
		};
	}, [budget, profile?.preferences?.budgetSettings]);

	// Use real historical data from snapshots
	const historicalData = useMemo(() => {
		if (!budgetHistory.length || !budget) return [];

		// Get the most recent 3 periods from budget history
		const recentHistory = budgetHistory.slice(0, 3);

		return recentHistory.map((item, index) => {
			const periodLabel =
				index === 0
					? 'Last Period'
					: index === 1
					? 'Two Periods Ago'
					: 'Three Periods Ago';

			return {
				period: periodLabel,
				amount: item.spentAmount,
				startDate: new Date(item.periodStart),
				endDate: new Date(item.periodEnd),
				utilization: item.utilizationPercentage,
				health:
					typeof item.periodHealth === 'string'
						? parseInt(item.periodHealth)
						: item.periodHealth,
			};
		});
	}, [budgetHistory, budget]);

	// Generate dynamic recommendations based on spending data
	const recommendations = useMemo(() => {
		if (
			!analysis?.spendingBreakdown ||
			analysis.spendingBreakdown.length === 0
		) {
			return 'Start tracking your expenses to get personalized recommendations.';
		}

		const topCategory = analysis.spendingBreakdown[0];
		const totalSpent = analysis.totalSpent;
		const budgetAmount = budget?.amount || 0;
		const remainingBudget = budgetAmount - totalSpent;

		if (remainingBudget < 0) {
			return `You're over budget by $${Math.abs(remainingBudget).toFixed(
				2
			)}. Focus on reducing ${topCategory.category.toLowerCase()} expenses, which account for ${
				topCategory.percentage
			}% of your spending.`;
		} else if (totalSpent > budgetAmount * 0.8) {
			return `You're approaching your budget limit. Consider reducing ${topCategory.category.toLowerCase()} expenses (${
				topCategory.percentage
			}% of spending) to stay within budget.`;
		} else {
			return `Great job staying within budget! Your top spending category is ${topCategory.category.toLowerCase()} at ${
				topCategory.percentage
			}%.`;
		}
	}, [analysis?.spendingBreakdown, analysis?.totalSpent, budget?.amount]);

	// Calculate budget values for use in callbacks
	const spent = budget?.spent || 0;
	const leftRaw = (budget?.amount || 0) - spent;
	const over = leftRaw < 0;
	const left = Math.abs(leftRaw);
	const percent =
		(budget?.amount || 0) > 0
			? Math.min((spent / (budget?.amount || 1)) * 100, 100)
			: 0;

	const loadData = useCallback(async () => {
		if (budgetId && budgets.length > 0) {
			const foundBudget = budgets.find((b) => b.id === budgetId);
			if (foundBudget) {
				setBudget(foundBudget);

				try {
					setLoading(true);

					// Try to load budget analysis and history, but don't fail if they're not available
					try {
						const [analysisData, historyData] = await Promise.all([
							BudgetAnalysisService.getBudgetAnalysis(budgetId),
							FinancialSnapshotService.getBudgetHistory(budgetId, 12),
						]);

						setAnalysis(analysisData);
						setBudgetHistory(historyData);
					} catch (analysisError) {
						logger.warn(
							'Budget analysis not available, using basic budget data:',
							analysisError
						);
						// Create a basic analysis from the budget data
						const basicAnalysis: BudgetAnalysis = {
							id: foundBudget.id,
							budgetId: foundBudget.id,
							spent: foundBudget.spent || 0,
							remaining: Math.max(
								0,
								foundBudget.amount - (foundBudget.spent || 0)
							),
							percentageUsed:
								foundBudget.amount > 0
									? ((foundBudget.spent || 0) / foundBudget.amount) * 100
									: 0,
							trend: 'stable',
							recommendations: [],
							lastUpdated: new Date(),
							spendingBreakdown: [],
							totalSpent: foundBudget.spent || 0,
							transactionCount: 0,
							averageSpent: 0,
						};
						setAnalysis(basicAnalysis);
						setBudgetHistory([]);
					}

					setError(null);
					setLastUpdated(new Date());
				} catch (err) {
					logger.error('Error loading budget data:', err);
					const errorMessage =
						err instanceof Error ? err.message : 'Failed to load budget data';
					setError(`Unable to load budget data: ${errorMessage}`);
				} finally {
					setLoading(false);
				}
			} else {
				setError(`Budget with ID ${budgetId} not found`);
				setLoading(false);
			}
		}
	}, [budgetId, budgets]);

	// Load budget data and analysis when component mounts
	useEffect(() => {
		loadData();
	}, [loadData]);

	// Refresh data when budgets change (e.g., after transactions are added)
	useEffect(() => {
		if (budget && budgets.length > 0) {
			const currentBudget = budgets.find((b) => b.id === budgetId);
			if (currentBudget && currentBudget.spent !== budget.spent) {
				// Budget spent amount changed, refresh analysis
				loadData();
			}
		}
	}, [budgets, budget?.spent, budget, budgetId, loadData]);

	// Auto-refresh budget data every 30 seconds to keep it live
	useEffect(() => {
		const interval = setInterval(() => {
			if (budget && !loading && !refreshing) {
				// Only refresh if we're not already loading or refreshing
				const currentBudget = budgets.find((b) => b.id === budgetId);
				if (currentBudget && currentBudget.spent !== budget.spent) {
					loadData();
				}
			}
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
	}, [budget, budgets, loading, refreshing, budgetId, loadData]);

	const onRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	const generateBudgetReport = useCallback(() => {
		if (!budget || !analysis) return '';

		const report = `
BUDGET REPORT - ${budget.name}
Generated: ${new Date().toLocaleDateString()}

OVERVIEW
--------
Budget Amount: $${budget.amount.toFixed(2)}
Amount Spent: $${spent.toFixed(2)}
Remaining: $${left.toFixed(2)}
Utilization: ${percent.toFixed(1)}%

PERIOD INFORMATION
------------------
Period Type: ${budget.period === 'weekly' ? 'Weekly' : 'Monthly'}
${
	budgetPeriodInfo ? `Days Until Reset: ${budgetPeriodInfo.daysUntilReset}` : ''
}

SPENDING BREAKDOWN
------------------
${
	analysis.spendingBreakdown && analysis.spendingBreakdown.length > 0
		? analysis.spendingBreakdown
				.map(
					(item) =>
						`${item.category}: $${item.amount.toFixed(2)} (${item.percentage}%)`
				)
				.join('\n')
		: 'No spending data available'
}

ANALYSIS
--------
${
	analysis.transactionCount > 0
		? `Total Transactions: ${analysis.transactionCount}
Average per Transaction: $${analysis.averageSpent.toFixed(2)}`
		: 'No transaction data available'
}

KEY INSIGHTS
------------
${recommendations}

HISTORICAL PERFORMANCE
---------------------
${
	historicalData.length > 0
		? historicalData
				.map(
					(item) =>
						`${item.period}: $${item.amount.toFixed(
							2
						)} (${item.utilization.toFixed(0)}% utilized)`
				)
				.join('\n')
		: 'No historical data available'
}

---
Report generated by Brie - Your Personal Finance Assistant
		`.trim();

		return report;
	}, [
		budget,
		analysis,
		spent,
		left,
		percent,
		budgetPeriodInfo,
		recommendations,
		historicalData,
	]);

	const handleExportReport = useCallback(async () => {
		try {
			const report = generateBudgetReport();
			if (!report) {
				Alert.alert('Error', 'Unable to generate report. Please try again.');
				return;
			}

			const fileName = `budget-report-${budget?.name
				?.replace(/\s+/g, '-')
				.toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
			const fileUri = FileSystem.documentDirectory + fileName;

			await FileSystem.writeAsStringAsync(fileUri, report, {
				encoding: FileSystem.EncodingType.UTF8,
			});

			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(fileUri, {
					mimeType: 'text/plain',
					dialogTitle: 'Export Budget Report',
				});
			} else {
				Alert.alert(
					'Sharing not available',
					'Sharing is not available on this device.'
				);
			}
		} catch (error) {
			logger.error('Error exporting report:', error);
			Alert.alert(
				'Export Failed',
				'Failed to export report. Please try again.'
			);
		}
	}, [generateBudgetReport, budget?.name]);

	const handleShareSummary = useCallback(async () => {
		try {
			if (!budget) return;

			const summary = `${budget.name} Budget Summary

Budget: $${budget.amount.toFixed(2)}
Spent: $${spent.toFixed(2)}
${over ? 'Over by' : 'Left'} $${left.toFixed(2)}
Utilization: ${percent.toFixed(1)}%

${
	analysis?.spendingBreakdown && analysis.spendingBreakdown.length > 0
		? `Top spending category: ${analysis.spendingBreakdown[0].category} (${analysis.spendingBreakdown[0].percentage}%)`
		: 'No spending data yet'
}

${
	budgetPeriodInfo
		? `⏰ ${budget.period === 'weekly' ? 'Week' : 'Month'} resets in ${
				budgetPeriodInfo.daysUntilReset
		  } days`
		: ''
}

#PersonalFinance #Budgeting #Brie`;

			if (await Sharing.isAvailableAsync()) {
				// Create a temporary file for sharing
				const fileName = `budget-summary-${budget.name
					?.replace(/\s+/g, '-')
					.toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
				const fileUri = FileSystem.documentDirectory + fileName;

				await FileSystem.writeAsStringAsync(fileUri, summary, {
					encoding: FileSystem.EncodingType.UTF8,
				});

				await Sharing.shareAsync(fileUri, {
					mimeType: 'text/plain',
					dialogTitle: 'Share Budget Summary',
				});
			} else {
				Alert.alert(
					'Sharing not available',
					'Sharing is not available on this device.'
				);
			}
		} catch (error) {
			logger.error('Error sharing summary:', error);
			Alert.alert('Share Failed', 'Failed to share summary. Please try again.');
		}
	}, [
		budget,
		spent,
		left,
		over,
		percent,
		analysis?.spendingBreakdown,
		budgetPeriodInfo,
	]);

	if (!budget) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Budget Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading budget...</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Show loading state for analysis
	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Budget Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading budget analysis...</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Show error state only if budget is not found, not for analysis errors
	if (error && !budget) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Budget Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>{error}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={() => {
							setError(null);
							loadData();
						}}
						accessibilityLabel="Retry loading budget data"
						accessibilityRole="button"
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					accessibilityLabel="Go back"
					accessibilityRole="button"
				>
					<Ionicons name="chevron-back" size={24} color="#222" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Budget Details</Text>
				<TouchableOpacity
					style={styles.refreshButton}
					onPress={onRefresh}
					disabled={refreshing}
					accessibilityLabel="Refresh budget data"
					accessibilityRole="button"
					accessibilityState={{ disabled: refreshing }}
				>
					{refreshing ? (
						<ActivityIndicator size="small" color="#00a2ff" />
					) : (
						<Ionicons name="refresh" size={20} color="#00a2ff" />
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={['#00a2ff']}
						tintColor="#00a2ff"
					/>
				}
			>
				{/* Budget Overview Card */}
				<View style={styles.overviewCard}>
					<View style={styles.budgetHeader}>
						<View
							style={[
								styles.iconBubble,
								{ backgroundColor: (budget.color ?? '#18181b') + '12' },
							]}
						>
							<Ionicons
								name={(budget.icon as any) ?? 'wallet-outline'}
								size={24}
								color={budget.color ?? '#18181b'}
							/>
						</View>
						<View style={styles.budgetInfo}>
							<Text style={styles.budgetName}>{budget.name}</Text>
							<Text style={styles.budgetPeriod}>
								{budget.period === 'weekly' ? 'Weekly' : 'Monthly'} Budget
							</Text>
						</View>
					</View>

					<View
						style={styles.progressSection}
						accessibilityLabel={`Budget progress: ${percent.toFixed(
							1
						)}% used, $${spent.toFixed(
							2
						)} spent out of $${budget.amount.toFixed(2)}`}
						accessibilityRole="progressbar"
					>
						<LinearProgressBar
							percent={percent}
							height={8}
							color={budget.color ?? '#18181b'}
							trackColor="#f3f4f6"
							animated={true}
							leftLabel={`$${spent.toFixed(2)} / $${budget.amount.toFixed(2)}`}
							rightLabel={`${percent.toFixed(1)}%`}
						/>
					</View>

					<View style={styles.amountsRow}>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Spent</Text>
							<Text style={styles.amountValue}>${spent.toFixed(2)}</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Budget</Text>
							<Text style={styles.amountValue}>
								${budget.amount.toFixed(2)}
							</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>{over ? 'Over' : 'Left'}</Text>
							<Text
								style={[
									styles.amountValue,
									over ? styles.overBudget : styles.underBudget,
								]}
							>
								${left.toFixed(2)}
							</Text>
						</View>
					</View>
				</View>

				{/* Live Data Indicator */}
				{lastUpdated && (
					<View style={styles.liveIndicator}>
						<View style={styles.liveDot} />
						<Text style={styles.liveText}>Live data</Text>
					</View>
				)}

				{/* Spending Breakdown */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Spending Breakdown</Text>
					<View style={styles.breakdownCard}>
						{analysis?.spendingBreakdown &&
						analysis.spendingBreakdown.length > 0 ? (
							analysis.spendingBreakdown.map((item, index) => (
								<View key={index} style={styles.breakdownItem}>
									<View style={styles.breakdownLeft}>
										<View
											style={[
												styles.categoryDot,
												{ backgroundColor: item.color },
											]}
										/>
										<Text style={styles.categoryName}>{item.category}</Text>
									</View>
									<View style={styles.breakdownRight}>
										<Text style={styles.categoryAmount}>
											${item.amount.toFixed(2)}
										</Text>
										<Text style={styles.categoryPercentage}>
											{item.percentage}%
										</Text>
									</View>
								</View>
							))
						) : (
							<View style={styles.emptyState}>
								<Text style={styles.emptyStateText}>
									No spending data available
								</Text>
								<Text style={styles.emptyStateSubtext}>
									{analysis?.transactionCount === 0
										? 'No transactions found for this budget yet. Add some transactions or link existing ones to see your spending breakdown.'
										: 'Spending breakdown will appear when transactions are linked to this budget.'}
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Analysis Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Analysis</Text>
					<View style={styles.analysisCard}>
						<View style={styles.analysisItem}>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<Text style={styles.analysisText}>
								You&apos;re spending {percent.toFixed(0)}% of your budget
							</Text>
						</View>
						<View style={styles.analysisItem}>
							<Ionicons name="calendar" size={20} color="#3b82f6" />
							<Text style={styles.analysisText}>
								{budgetPeriodInfo
									? `${
											budgetPeriodInfo.periodType === 'weekly'
												? 'Week'
												: 'Month'
									  } resets in ${budgetPeriodInfo.daysUntilReset} days`
									: `${
											budget.period === 'weekly' ? 'Week' : 'Month'
									  } resets soon`}
							</Text>
						</View>
						{over && (
							<View style={styles.analysisItem}>
								<Ionicons name="warning" size={20} color="#f59e0b" />
								<Text style={styles.analysisText}>
									You&apos;re ${left.toFixed(2)} over budget
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Key Insights */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Key Insights</Text>
					<View style={styles.insightsCard}>
						<View style={styles.insightItem}>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<View style={styles.insightContent}>
								<Text style={styles.insightTitle}>Spending Pattern</Text>
								<Text style={styles.insightText}>
									{analysis?.transactionCount && analysis.transactionCount > 0
										? `You have ${
												analysis.transactionCount
										  } transactions with an average spending of $${analysis.averageSpent.toFixed(
												2
										  )} per transaction. ${
												analysis.transactionCount > 5
													? 'Your spending pattern shows consistent activity.'
													: "You're just getting started with this budget."
										  }`
										: 'No spending data available yet. This budget is new and ready for transactions!'}
								</Text>
							</View>
						</View>
						<View style={styles.insightItem}>
							<Ionicons name="alert-circle" size={20} color="#f59e0b" />
							<View style={styles.insightContent}>
								<Text style={styles.insightTitle}>Budget Management</Text>
								<Text style={styles.insightText}>
									You&apos;re currently using {percent.toFixed(0)}% of your
									budget.
									{over
										? ` Consider reducing spending to stay within budget.`
										: percent > 80
										? ` You're approaching your limit - stay mindful of spending.`
										: percent > 50
										? ` You're managing your budget well with room to spare.`
										: ` Excellent! You have plenty of budget remaining.`}
								</Text>
							</View>
						</View>
						<View style={styles.insightItem}>
							<Ionicons name="bulb" size={20} color="#3b82f6" />
							<View style={styles.insightContent}>
								<Text style={styles.insightTitle}>Recommendations</Text>
								<Text style={styles.insightText}>{recommendations}</Text>
							</View>
						</View>
					</View>
				</View>

				{/* History Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Recent History</Text>
					<View style={styles.historyCard}>
						{historicalData.length > 0 ? (
							historicalData.map((item, index) => (
								<View key={index} style={styles.historyItem}>
									<View style={styles.historyIcon}>
										<Ionicons
											name="time"
											size={16}
											color={
												item.health >= 80
													? '#10b981'
													: item.health >= 60
													? '#f59e0b'
													: '#ef4444'
											}
										/>
									</View>
									<View style={styles.historyContent}>
										<Text style={styles.historyTitle}>{item.period}</Text>
										<Text style={styles.historyAmount}>
											${item.amount.toFixed(2)} spent
										</Text>
										<Text style={styles.historyUtilization}>
											{item.utilization.toFixed(0)}% utilized
										</Text>
									</View>
									<View style={styles.historyHealth}>
										<View
											style={[
												styles.healthIndicator,
												{
													backgroundColor:
														item.health >= 80
															? '#10b981'
															: item.health >= 60
															? '#f59e0b'
															: '#ef4444',
												},
											]}
										/>
									</View>
								</View>
							))
						) : (
							<View style={styles.emptyState}>
								<Text style={styles.emptyStateText}>
									No historical data available
								</Text>
								<Text style={styles.emptyStateSubtext}>
									{analysis?.transactionCount === 0
										? 'No transactions found for this budget yet. Add some transactions to see your spending history.'
										: 'Historical data will appear once you have transactions across multiple budget periods.'}
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Action Buttons */}
				<View style={styles.section}>
					<View style={styles.actionButtons}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={handleExportReport}
							accessibilityLabel="Export budget report"
							accessibilityHint="Export a detailed budget report as a text file"
						>
							<Ionicons name="download" size={20} color="#00a2ff" />
							<Text style={styles.actionButtonText}>Export Report</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={handleShareSummary}
							accessibilityLabel="Share budget summary"
							accessibilityHint="Share a summary of your budget performance"
						>
							<Ionicons name="share" size={20} color="#00a2ff" />
							<Text style={styles.actionButtonText}>Share Summary</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Last Updated Indicator */}
				{lastUpdated && (
					<View style={styles.lastUpdatedSection}>
						<Text style={styles.lastUpdatedText}>
							Last updated: {lastUpdated.toLocaleTimeString()}
						</Text>
						<Text style={styles.lastUpdatedSubtext}>Pull down to refresh</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		width: 40,
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: 600,
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	placeholderButton: {
		width: 40,
	},
	refreshButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 20,
	},
	content: {
		flex: 1,
	},
	overviewCard: {
		margin: 16,
		padding: 20,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	budgetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	iconBubble: {
		width: 48,
		height: 48,
		borderRadius: 12,
		marginRight: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	budgetInfo: {
		flex: 1,
	},
	budgetName: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 4,
	},
	budgetPeriod: {
		fontSize: 14,
		color: '#6b7280',
	},
	progressSection: {
		marginBottom: 20,
	},
	amountsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	amountItem: {
		alignItems: 'center',
		flex: 1,
	},
	amountLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	amountValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
	},
	overBudget: {
		color: '#e11d48',
	},
	underBudget: {
		color: '#10b981',
	},
	section: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 12,
	},
	breakdownCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	breakdownItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	breakdownLeft: {
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
		fontWeight: '600',
		color: '#374151',
	},
	breakdownRight: {
		alignItems: 'flex-end',
	},
	categoryAmount: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0a0a0a',
	},
	categoryPercentage: {
		fontSize: 12,
		color: '#6b7280',
	},
	analysisCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	analysisItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	analysisText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 12,
		flex: 1,
	},
	insightsCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	insightItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	insightContent: {
		flex: 1,
		marginLeft: 12,
	},
	insightTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
	},
	insightText: {
		fontSize: 13,
		color: '#6b7280',
		lineHeight: 18,
	},
	historyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	historyIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	historyContent: {
		flex: 1,
	},
	historyTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 2,
	},
	historyAmount: {
		fontSize: 12,
		color: '#6b7280',
	},
	historyUtilization: {
		fontSize: 10,
		color: '#9ca3af',
		marginTop: 2,
	},
	historyHealth: {
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
	healthIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#00a2ff',
		backgroundColor: '#ffffff',
		gap: 8,
	},
	actionButtonText: {
		color: '#00a2ff',
		fontSize: 14,
		fontWeight: '600',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
	},
	retryButton: {
		backgroundColor: '#00a2ff',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginTop: 16,
	},
	retryButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 24,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6b7280',
		marginBottom: 8,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
	},
	lastUpdatedSection: {
		alignItems: 'center',
		paddingVertical: 16,
		marginHorizontal: 16,
		marginBottom: 24,
	},
	lastUpdatedText: {
		fontSize: 12,
		color: '#9ca3af',
		marginBottom: 4,
	},
	lastUpdatedSubtext: {
		fontSize: 11,
		color: '#d1d5db',
	},
	liveIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		marginBottom: 16,
	},
	liveDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#10b981',
		marginRight: 8,
	},
	liveText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
});

export default BudgetSummaryScreen;
