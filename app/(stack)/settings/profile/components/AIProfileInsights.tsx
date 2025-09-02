import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileUpdateService from '../../../../src/services/feature/profileUpdateService';

interface Profile {
	monthlyIncome?: number;
	savings?: number;
	debt?: number;
	expenses?: {
		housing?: number;
		transportation?: number;
		food?: number;
		utilities?: number;
		entertainment?: number;
		other?: number;
	};
	firstName?: string;
	lastName?: string;
}

interface AIProfileInsightsProps {
	profile: Profile;
	onAction: (action: string) => void;
}

interface Insight {
	id: string;
	type: 'warning' | 'info' | 'suggestion' | 'success';
	title: string;
	message: string;
	priority: 'low' | 'medium' | 'high';
	action?: string;
	actionLabel?: string;
}

export default function AIProfileInsights({
	profile,
	onAction,
}: AIProfileInsightsProps) {
	const [insights, setInsights] = useState<Insight[]>([]);
	const [lastProfileUpdate, setLastProfileUpdate] = useState<Date | null>(null);

	useEffect(() => {
		generateInsights();
		checkProfileUpdates();
	}, [profile]);

	const checkProfileUpdates = async () => {
		try {
			const lastUpdate = await AsyncStorage.getItem('lastProfileUpdate');
			if (lastUpdate) {
				setLastProfileUpdate(new Date(lastUpdate));
			}
		} catch (error) {
			console.log('Error checking profile updates:', error);
		}
	};

	const generateInsights = () => {
		const newInsights: Insight[] = [];

		// Income analysis
		if (!profile.monthlyIncome || profile.monthlyIncome === 0) {
			newInsights.push({
				id: 'income_missing',
				type: 'warning',
				title: 'Income Not Set',
				message:
					'Setting your monthly income helps create accurate budgets and financial plans.',
				priority: 'high',
				action: 'optimize_income',
				actionLabel: 'Set Income',
			});
		} else if (profile.monthlyIncome < 2000) {
			newInsights.push({
				id: 'income_low',
				type: 'info',
				title: 'Income Optimization Opportunity',
				message:
					'Consider exploring side hustles or skill development to increase your income.',
				priority: 'medium',
				action: 'optimize_income',
				actionLabel: 'Learn More',
			});
		}

		// Savings analysis
		if (!profile.savings || profile.savings === 0) {
			newInsights.push({
				id: 'savings_missing',
				type: 'warning',
				title: 'No Emergency Fund',
				message:
					'Building an emergency fund is crucial for financial security. Aim for 3-6 months of expenses.',
				priority: 'high',
				action: 'set_savings_goal',
				actionLabel: 'Set Goal',
			});
		} else if (profile.savings < (profile.monthlyIncome || 0) * 3) {
			newInsights.push({
				id: 'savings_low',
				type: 'suggestion',
				title: 'Increase Emergency Fund',
				message:
					'Your emergency fund could be stronger. Consider increasing it to 6 months of expenses.',
				priority: 'medium',
				action: 'set_savings_goal',
				actionLabel: 'Adjust Goal',
			});
		} else {
			newInsights.push({
				id: 'savings_good',
				type: 'success',
				title: 'Great Emergency Fund!',
				message:
					'You have a solid emergency fund. Consider investing excess savings for growth.',
				priority: 'low',
				action: 'financial_planning',
				actionLabel: 'Get Advice',
			});
		}

		// Debt analysis
		if (profile.debt && profile.debt > 0) {
			if (profile.debt > (profile.monthlyIncome || 0) * 12) {
				newInsights.push({
					id: 'debt_high',
					type: 'warning',
					title: 'High Debt Level',
					message:
						'Your debt is high relative to income. Focus on debt reduction strategies.',
					priority: 'high',
					action: 'debt_strategy',
					actionLabel: 'Get Strategy',
				});
			} else if (profile.debt > (profile.monthlyIncome || 0) * 6) {
				newInsights.push({
					id: 'debt_medium',
					type: 'suggestion',
					title: 'Moderate Debt',
					message:
						'Consider creating a debt payoff plan while maintaining savings.',
					priority: 'medium',
					action: 'debt_strategy',
					actionLabel: 'Create Plan',
				});
			}
		}

		// Expense analysis
		if (profile.expenses) {
			const totalExpenses = Object.values(profile.expenses).reduce(
				(sum, exp) => sum + (exp || 0),
				0
			);
			const income = profile.monthlyIncome || 0;

			if (totalExpenses > 0 && income > 0) {
				const expenseRatio = (totalExpenses / income) * 100;

				if (expenseRatio > 80) {
					newInsights.push({
						id: 'expenses_high',
						type: 'warning',
						title: 'High Expense Ratio',
						message: `Your expenses are ${expenseRatio.toFixed(
							0
						)}% of income. Look for areas to reduce spending.`,
						priority: 'high',
						action: 'reduce_expenses',
						actionLabel: 'Review Expenses',
					});
				} else if (expenseRatio > 60) {
					newInsights.push({
						id: 'expenses_medium',
						type: 'suggestion',
						title: 'Moderate Expenses',
						message:
							'Your expenses are reasonable. Consider creating a budget to optimize spending.',
						priority: 'medium',
						action: 'create_budget',
						actionLabel: 'Create Budget',
					});
				}
			}
		}

		// Budget recommendation
		if (!profile.expenses || Object.keys(profile.expenses).length === 0) {
			newInsights.push({
				id: 'no_budget',
				type: 'info',
				title: 'Create Your First Budget',
				message: 'A budget helps track spending and achieve financial goals.',
				priority: 'medium',
				action: 'create_budget',
				actionLabel: 'Start Budgeting',
			});
		}

		setInsights(newInsights);
	};

	const handleInsightAction = async (insight: Insight) => {
		if (insight.action) {
			// Store this action for AI assistant context
			try {
				const aiContext = {
					lastAction: insight.action,
					actionTaken: true,
					timestamp: new Date().toISOString(),
					profileSnapshot: {
						income: profile.monthlyIncome,
						savings: profile.savings,
						debt: profile.debt,
						expenses: profile.expenses,
					},
				};

				await AsyncStorage.setItem(
					'aiProfileContext',
					JSON.stringify(aiContext)
				);
				console.log('AI context updated:', aiContext);
			} catch (error) {
				console.log('Error updating AI context:', error);
			}

			onAction(insight.action);
		}
	};

	const getInsightIcon = (type: string) => {
		switch (type) {
			case 'warning':
				return 'warning';
			case 'info':
				return 'information-circle';
			case 'suggestion':
				return 'bulb';
			case 'success':
				return 'checkmark-circle';
			default:
				return 'sparkles';
		}
	};

	const getInsightColor = (type: string) => {
		switch (type) {
			case 'warning':
				return '#ef4444';
			case 'info':
				return '#3b82f6';
			case 'suggestion':
				return '#f59e0b';
			case 'success':
				return '#10b981';
			default:
				return '#3b82f6';
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high':
				return '#ef4444';
			case 'medium':
				return '#f59e0b';
			case 'low':
				return '#10b981';
			default:
				return '#6b7280';
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="sparkles" size={20} color="#3b82f6" />
				<Text style={styles.headerTitle}>AI-Powered Insights</Text>
			</View>

			{insights.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="checkmark-circle" size={48} color="#10b981" />
					<Text style={styles.emptyStateText}>Your profile looks great!</Text>
					<Text style={styles.emptyStateSubtext}>
						Keep up the good financial habits.
					</Text>
				</View>
			) : (
				<ScrollView
					style={styles.insightsList}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled={true}
				>
					{insights.map((insight) => (
						<View key={insight.id} style={styles.insightCard}>
							<View style={styles.insightHeader}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.type) as any}
										size={20}
										color={getInsightColor(insight.type)}
									/>
								</View>
								<View style={styles.insightTitleContainer}>
									<Text style={styles.insightTitle}>{insight.title}</Text>
									<View
										style={[
											styles.priorityBadge,
											{ backgroundColor: getPriorityColor(insight.priority) },
										]}
									>
										<Text style={styles.priorityText}>
											{insight.priority.toUpperCase()}
										</Text>
									</View>
								</View>
							</View>

							<Text style={styles.insightMessage}>{insight.message}</Text>

							{insight.action && (
								<TouchableOpacity
									style={[
										styles.actionButton,
										{ borderColor: getInsightColor(insight.type) },
									]}
									onPress={() => handleInsightAction(insight)}
								>
									<Text
										style={[
											styles.actionButtonText,
											{ color: getInsightColor(insight.type) },
										]}
									>
										{insight.actionLabel || 'Take Action'}
									</Text>
									<Ionicons
										name="arrow-forward"
										size={16}
										color={getInsightColor(insight.type)}
									/>
								</TouchableOpacity>
							)}
						</View>
					))}
				</ScrollView>
			)}

			{lastProfileUpdate && (
				<View style={styles.lastUpdateContainer}>
					<Text style={styles.lastUpdateText}>
						Last updated: {lastProfileUpdate.toLocaleDateString()}
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#666',
		marginTop: 4,
		textAlign: 'center',
	},
	insightsList: {
		maxHeight: 400,
	},
	insightCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#e2e8f0',
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	insightIconContainer: {
		marginRight: 12,
	},
	insightTitleContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		flex: 1,
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		marginLeft: 8,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
	},
	insightMessage: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginBottom: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500',
		marginRight: 8,
	},
	lastUpdateContainer: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
	},
	lastUpdateText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
	},
});
