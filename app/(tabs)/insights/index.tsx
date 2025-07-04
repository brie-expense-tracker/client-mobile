// app/(tabs)/insights.tsx

import React, { useEffect, useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	Text,
	Pressable,
	StyleSheet,
	ActivityIndicator,
	Alert,
	View,
	TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import useAuth from '../../../src/context/AuthContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { ApiService } from '../../../src/services/apiService';
import {
	BudgetOverviewGraph,
	GoalsProgressGraph,
	SpendingTrendsGraph,
	CategoryBreakdownGraph,
} from '../../../src/components';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
	category?: string;
}

export default function InsightsHubScreen() {
	const router = useRouter();
	const { user, firebaseUser, profile } = useAuth();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState<
		'week' | 'month' | 'quarter'
	>('month');
	const [showGraphs, setShowGraphs] = useState(false);

	useEffect(() => {
		fetchInsights();
		fetchTransactions();
	}, []);

	async function fetchTransactions() {
		try {
			const response = await ApiService.get<any>('/transactions');

			if (response.success && response.data) {
				const transactionData = response.data.data || response.data;
				const formattedTransactions: Transaction[] = transactionData.map(
					(tx: any) => ({
						id: tx._id || tx.id,
						type: tx.type,
						amount: Number(tx.amount) || 0,
						date: tx.date,
						category: tx.category || tx.categories?.[0]?.name,
					})
				);
				setTransactions(formattedTransactions);
			}
		} catch (error) {
			console.error('Error fetching transactions:', error);
		}
	}

	async function fetchInsights() {
		try {
			setLoading(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
			});

			// Try to get existing insights with timeout
			const insightsPromise = Promise.allSettled([
				InsightsService.getInsights('daily'),
				InsightsService.getInsights('weekly'),
				InsightsService.getInsights('monthly'),
			]);

			const results = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as PromiseSettledResult<any>[];

			const [dailyResponse, weeklyResponse, monthlyResponse] = results.map(
				(result: PromiseSettledResult<any>) =>
					result.status === 'fulfilled'
						? result.value
						: {
								success: false,
								data: [],
								error: result.reason?.message || 'Request failed',
						  }
			);

			// Log responses for debugging
			console.log('Daily insights response:', dailyResponse);
			console.log('Weekly insights response:', weeklyResponse);
			console.log('Monthly insights response:', monthlyResponse);

			const allInsights = [
				...(dailyResponse.success &&
				dailyResponse.data &&
				Array.isArray(dailyResponse.data)
					? dailyResponse.data.slice(0, 1) // Only take 1 insight per period
					: []),
				...(weeklyResponse.success &&
				weeklyResponse.data &&
				Array.isArray(weeklyResponse.data)
					? weeklyResponse.data.slice(0, 1)
					: []),
				...(monthlyResponse.success &&
				monthlyResponse.data &&
				Array.isArray(monthlyResponse.data)
					? monthlyResponse.data.slice(0, 1)
					: []),
			];

			// Sort by most recent
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			// Take the most recent 3 insights
			const recentInsights = allInsights.slice(0, 3);

			if (recentInsights.length === 0) {
				// Check if any of the responses had specific errors
				const errors = [
					dailyResponse.error,
					weeklyResponse.error,
					monthlyResponse.error,
				].filter(Boolean);

				if (errors.length > 0) {
					console.log('Insights fetch errors:', errors);
					// Don't show alert, just set empty insights
					setInsights([]);
				} else {
					// Only generate one insight quickly instead of all three
					await generateQuickInsight();
				}
			} else {
				setInsights(recentInsights);
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			// Don't show alert, just set empty insights
			setInsights([]);
		} finally {
			setLoading(false);
		}
	}

	async function generateQuickInsight() {
		try {
			setGenerating(true);
			// Only generate one insight quickly (weekly is usually fastest)
			const response = await InsightsService.generateInsights('weekly');
			console.log('Quick insight generation response:', response);

			if (response.success && response.data && Array.isArray(response.data)) {
				setInsights(response.data.slice(0, 1));
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating quick insight:', error);
			setInsights([]);
		} finally {
			setGenerating(false);
		}
	}

	async function generateNewInsights() {
		try {
			setGenerating(true);
			const [dailyGen, weeklyGen, monthlyGen] = await Promise.all([
				InsightsService.generateInsights('daily'),
				InsightsService.generateInsights('weekly'),
				InsightsService.generateInsights('monthly'),
			]);

			const allInsights = [
				...(dailyGen.success && dailyGen.data && Array.isArray(dailyGen.data)
					? dailyGen.data
					: []),
				...(weeklyGen.success && weeklyGen.data && Array.isArray(weeklyGen.data)
					? weeklyGen.data
					: []),
				...(monthlyGen.success &&
				monthlyGen.data &&
				Array.isArray(monthlyGen.data)
					? monthlyGen.data
					: []),
			];

			// Sort by most recent and take top 3
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);
			setInsights(allInsights.slice(0, 3));
		} catch (error) {
			console.error('Error generating insights:', error);
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setGenerating(false);
		}
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>AI Coach</Text>
				<TouchableOpacity
					style={styles.graphToggle}
					onPress={() => setShowGraphs(!showGraphs)}
				>
					<Ionicons
						name={showGraphs ? 'list' : 'analytics'}
						size={24}
						color="#2E78B7"
					/>
				</TouchableOpacity>
			</View>

			<ScrollView contentContainerStyle={styles.container}>
				{showGraphs ? (
					// Graph View
					<View>
						{/* Period Selector */}
						<View style={styles.periodSelector}>
							{[
								{ key: 'week', label: 'Week', icon: 'calendar-outline' },
								{ key: 'month', label: 'Month', icon: 'calendar' },
								{ key: 'quarter', label: 'Quarter', icon: 'calendar-clear' },
							].map((option) => (
								<TouchableOpacity
									key={option.key}
									style={[
										styles.periodOption,
										selectedPeriod === option.key && styles.periodOptionActive,
									]}
									onPress={() => setSelectedPeriod(option.key as any)}
								>
									<Ionicons
										name={option.icon as any}
										size={16}
										color={selectedPeriod === option.key ? '#FFFFFF' : '#666'}
									/>
									<Text
										style={[
											styles.periodOptionText,
											selectedPeriod === option.key &&
												styles.periodOptionTextActive,
										]}
									>
										{option.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Spending Trends Graph */}
						{transactions.length > 0 && (
							<SpendingTrendsGraph
								transactions={transactions}
								title={`${
									selectedPeriod.charAt(0).toUpperCase() +
									selectedPeriod.slice(1)
								}ly Spending Trends`}
								period={selectedPeriod}
							/>
						)}

						{/* Category Breakdown Graph */}
						{transactions.length > 0 && (
							<CategoryBreakdownGraph
								transactions={transactions}
								title="Category Breakdown"
								period={selectedPeriod}
							/>
						)}

						{/* Budget Overview Graph */}
						{budgets.length > 0 && (
							<BudgetOverviewGraph budgets={budgets} title="Budget Overview" />
						)}

						{/* Goals Progress Graph */}
						{goals.length > 0 && (
							<GoalsProgressGraph goals={goals} title="Goals Progress" />
						)}

						{/* Empty State for Graphs */}
						{transactions.length === 0 &&
							budgets.length === 0 &&
							goals.length === 0 && (
								<View style={styles.emptyState}>
									<Ionicons name="analytics-outline" size={64} color="#CCC" />
									<Text style={styles.emptyText}>No Financial Data</Text>
									<Text style={styles.emptySubtext}>
										Add some transactions, budgets, and goals to see your
										financial insights here.
									</Text>
								</View>
							)}
					</View>
				) : (
					// AI Insights View
					<View>
						{insights && insights.length > 0 ? (
							insights.map((insight) => (
								<Pressable
									key={insight._id}
									style={styles.card}
									onPress={() => {
										router.push(`/insights/${insight.period}`);
									}}
								>
									<Text style={styles.periodLabel}>
										{insight.period.charAt(0).toUpperCase() +
											insight.period.slice(1)}
									</Text>
									<Text style={styles.message}>{insight.message}</Text>
									<Text style={styles.cta}>Tap to explore →</Text>
								</Pressable>
							))
						) : (
							<View style={styles.emptyState}>
								<Text style={styles.emptyText}>No insights available yet.</Text>
								<Text style={styles.emptySubtext}>
									Add some transactions to generate insights.
								</Text>

								<Pressable
									style={[
										styles.generateButton,
										generating && styles.generateButtonDisabled,
									]}
									onPress={generateNewInsights}
									disabled={generating}
								>
									{generating ? (
										<ActivityIndicator size="small" color="#fff" />
									) : (
										<Text style={styles.generateButtonText}>
											Generate Insights
										</Text>
									)}
								</Pressable>
							</View>
						)}
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#f9f9f9' },
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '600',
	},
	graphToggle: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#F0F8FF',
	},
	container: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	periodSelector: {
		flexDirection: 'row',
		marginBottom: 20,
	},
	periodOption: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginHorizontal: 4,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	periodOptionActive: {
		backgroundColor: '#2E78B7',
		borderColor: '#2E78B7',
	},
	periodOptionText: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
	},
	periodOptionTextActive: {
		color: '#FFFFFF',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	periodLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	message: {
		fontSize: 16,
		fontWeight: '400',
		marginBottom: 12,
	},
	cta: {
		fontSize: 14,
		fontWeight: '500',
		color: '#2e78b7',
	},
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '500',
		color: '#666',
		marginBottom: 8,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	generateButton: {
		backgroundColor: '#2e78b7',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	generateButtonDisabled: {
		opacity: 0.6,
	},
	generateButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
});
