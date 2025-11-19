import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AICoachProps {
	onCoachAction: (action: string) => void;
	userFinancialState: {
		budgets: any[];
		goals: any[];
		transactions: any[];
		recurringExpenses: any[];
	};
}

export default function AICoach({
	onCoachAction,
	userFinancialState,
}: AICoachProps) {
	const router = useRouter();
	const [expandedSection, setExpandedSection] = useState<string | null>(null);

	const toggleSection = (section: string) => {
		setExpandedSection(expandedSection === section ? null : section);
	};

	const handleCoachAction = useCallback(
		(action: string) => {
			onCoachAction(action);
		},
		[onCoachAction]
	);

	const getFinancialHealthScore = () => {
		const { budgets, goals, transactions, recurringExpenses } =
			userFinancialState;

		let score = 0;
		let maxScore = 100;

		// Budget utilization (25 points)
		if (budgets.length > 0) {
			const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
			const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
			if (totalBudget > 0) {
				const utilization = (totalSpent / totalBudget) * 100;
				if (utilization <= 80) score += 25;
				else if (utilization <= 90) score += 17;
				else if (utilization <= 100) score += 8;
			}
		}

		// Goal progress (20 points)
		if (goals.length > 0) {
			const avgProgress =
				goals.reduce((sum, g) => sum + (g.percent || 0), 0) / goals.length;
			if (avgProgress >= 70) score += 20;
			else if (avgProgress >= 50) score += 15;
			else if (avgProgress >= 30) score += 10;
			else score += 5;
		}

		// Transaction tracking (20 points)
		if (transactions.length >= 20) score += 20;
		else if (transactions.length >= 10) score += 15;
		else if (transactions.length >= 5) score += 10;
		else if (transactions.length > 0) score += 5;

		// Recurring expense tracking (15 points)
		if (recurringExpenses && recurringExpenses.length > 0) {
			// Give points for tracking recurring expenses
			score += 5;
			// Check if they're up to date (no overdue)
			const overdueCount = recurringExpenses.filter((exp: any) => {
				const dueDate = new Date(exp.nextExpectedDate);
				return dueDate < new Date();
			}).length;
			if (overdueCount === 0) score += 10; // All bills on time
			else if (overdueCount <= 2) score += 5; // Few overdue
		}

		// Financial foundation (20 points)
		const hasRecurring = recurringExpenses && recurringExpenses.length > 0;
		if (budgets.length >= 3 && goals.length >= 1 && hasRecurring) score += 20;
		else if (
			(budgets.length >= 2 && goals.length >= 1) ||
			(budgets.length >= 1 && hasRecurring)
		)
			score += 15;
		else if (budgets.length >= 2 || goals.length >= 1) score += 12;
		else if (budgets.length >= 1) score += 8;

		return Math.min(score, maxScore);
	};

	const getFinancialHealthColor = (score: number) => {
		if (score >= 80) return '#10b981'; // Green
		if (score >= 60) return '#f59e0b'; // Yellow
		return '#ef4444'; // Red
	};

	const getFinancialHealthLabel = (score: number) => {
		if (score >= 80) return 'Excellent';
		if (score >= 60) return 'Good';
		if (score >= 40) return 'Fair';
		return 'Needs Improvement';
	};

	const getActionableAdvice = () => {
		const { budgets, goals, transactions } = userFinancialState;
		const advice = [];

		if (budgets.length === 0) {
			advice.push({
				title: 'Create Your First Budget',
				description:
					'Start with essential categories like food and transportation',
				action: 'add_budget',
				priority: 'high',
			});
		}

		if (goals.length === 0) {
			advice.push({
				title: 'Set a Savings Goal',
				description: 'Create an emergency fund goal to start building wealth',
				action: 'add_goal',
				priority: 'high',
			});
		}

		if (transactions.length < 10) {
			advice.push({
				title: 'Track More Expenses',
				description: 'Log at least 10 transactions to see spending patterns',
				action: 'add_expense',
				priority: 'medium',
			});
		}

		if (budgets.length > 0) {
			const overBudget = budgets.filter(
				(b) => (b.spent || 0) > (b.amount || 0)
			);
			if (overBudget.length > 0) {
				advice.push({
					title: 'Review Over-Budget Categories',
					description: `${overBudget.length} budget(s) exceeded - time to adjust`,
					action: 'review_budgets',
					priority: 'high',
				});
			}
		}

		return advice;
	};

	const healthScore = getFinancialHealthScore();
	const advice = getActionableAdvice();

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="school" size={24} color="#3b82f6" />
				<Text style={styles.headerTitle}>AI Financial Coach</Text>
			</View>

			{/* Financial Health Score */}
			<View style={styles.scoreCard}>
				<Text style={styles.scoreTitle}>Your Financial Health Score</Text>
				<View style={styles.scoreDisplay}>
					<Text
						style={[
							styles.scoreNumber,
							{ color: getFinancialHealthColor(healthScore) },
						]}
					>
						{healthScore}
					</Text>
					<Text style={styles.scoreMax}>/100</Text>
				</View>
				<Text
					style={[
						styles.scoreLabel,
						{ color: getFinancialHealthColor(healthScore) },
					]}
				>
					{getFinancialHealthLabel(healthScore)}
				</Text>
			</View>

			{/* Actionable Advice */}
			<View style={styles.adviceSection}>
				<Text style={styles.sectionTitle}>🎯 Actionable Advice</Text>
				{advice.map((item, index) => (
					<TouchableOpacity
						key={index}
						style={[
							styles.adviceCard,
							{
								borderLeftColor:
									item.priority === 'high' ? '#ef4444' : '#f59e0b',
							},
						]}
						onPress={() => handleCoachAction(item.action)}
					>
						<View style={styles.adviceHeader}>
							<Text style={styles.adviceTitle}>{item.title}</Text>
							<View
								style={[
									styles.priorityBadge,
									{
										backgroundColor:
											item.priority === 'high' ? '#fef2f2' : '#fffbeb',
									},
								]}
							>
								<Text
									style={[
										styles.priorityText,
										{ color: item.priority === 'high' ? '#dc2626' : '#d97706' },
									]}
								>
									{item.priority === 'high' ? 'High' : 'Medium'}
								</Text>
							</View>
						</View>
						<Text style={styles.adviceDescription}>{item.description}</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Learning Resources */}
			<View style={styles.resourcesSection}>
				<TouchableOpacity
					style={styles.resourceHeader}
					onPress={() => toggleSection('resources')}
				>
					<Text style={styles.sectionTitle}>📚 Learning Resources</Text>
					<Ionicons
						name={
							expandedSection === 'resources' ? 'chevron-up' : 'chevron-down'
						}
						size={20}
						color="#6b7280"
					/>
				</TouchableOpacity>

				{expandedSection === 'resources' && (
					<View style={styles.resourcesContent}>
						<TouchableOpacity
							style={styles.resourceCard}
							onPress={() => handleCoachAction('budgeting_basics')}
						>
							<Ionicons name="calculator" size={20} color="#3b82f6" />
							<Text style={styles.resourceTitle}>Budgeting Basics</Text>
							<Text style={styles.resourceDescription}>
								Learn the 50/30/20 rule and more
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.resourceCard}
							onPress={() => handleCoachAction('savings_strategies')}
						>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<Text style={styles.resourceTitle}>Savings Strategies</Text>
							<Text style={styles.resourceDescription}>
								Build emergency funds and save for goals
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.resourceCard}
							onPress={() => handleCoachAction('expense_tracking')}
						>
							<Ionicons name="receipt" size={20} color="#f59e0b" />
							<Text style={styles.resourceTitle}>Expense Tracking</Text>
							<Text style={styles.resourceDescription}>
								Master the art of tracking every dollar
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>

			{/* Quick Actions */}
			<View style={styles.quickActions}>
				<Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
				<View style={styles.actionGrid}>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(stack)/budgets/new')}
					>
						<Ionicons name="add-circle" size={24} color="#3b82f6" />
						<Text style={styles.actionText}>Add Budget</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(stack)/goals/new')}
					>
						<Ionicons name="flag" size={24} color="#10b981" />
						<Text style={styles.actionText}>Add Goal</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(tabs)/transaction/expense')}
					>
						<Ionicons name="receipt" size={24} color="#f59e0b" />
						<Text style={styles.actionText}>Add Expense</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(stack)/settings/budgets')}
					>
						<Ionicons name="settings" size={24} color="#6b7280" />
						<Text style={styles.actionText}>Settings</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		margin: 16,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1f2937',
		marginLeft: 12,
	},
	scoreCard: {
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		marginBottom: 20,
	},
	scoreTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	scoreDisplay: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 8,
	},
	scoreNumber: {
		fontSize: 48,
		fontWeight: '800',
	},
	scoreMax: {
		fontSize: 20,
		fontWeight: '600',
		color: '#6b7280',
		marginLeft: 4,
	},
	scoreLabel: {
		fontSize: 18,
		fontWeight: '600',
	},
	adviceSection: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 16,
	},
	adviceCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#3b82f6',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	adviceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	adviceTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		flex: 1,
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	priorityText: {
		fontSize: 12,
		fontWeight: '600',
	},
	adviceDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	resourcesSection: {
		marginBottom: 20,
	},
	resourceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	resourcesContent: {
		marginTop: 12,
	},
	resourceCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	resourceTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginLeft: 12,
		flex: 1,
	},
	resourceDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginLeft: 12,
		flex: 1,
	},
	quickActions: {
		marginBottom: 20,
	},
	actionGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	actionButton: {
		width: '48%',
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	actionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginTop: 8,
		textAlign: 'center',
	},
});
