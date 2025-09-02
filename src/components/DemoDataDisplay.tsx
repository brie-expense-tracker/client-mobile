// DemoDataDisplay.tsx - Displays demo data information and statistics
import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDemoData } from '../context/demoDataContext';

export default function DemoDataDisplay() {
	const {
		isDemoMode,
		transactions,
		budgets,
		goals,
		recurringExpenses,
		loading,
	} = useDemoData();
	const [expanded, setExpanded] = useState(false);

	if (!isDemoMode || loading) {
		return null;
	}

	const totalIncome = transactions
		.filter((t) => t.type === 'income')
		.reduce((sum, t) => sum + t.amount, 0);

	const totalExpenses = transactions
		.filter((t) => t.type === 'expense')
		.reduce((sum, t) => sum + Math.abs(t.amount), 0);

	const netSavings = totalIncome - totalExpenses;

	const topCategories = transactions
		.filter((t) => t.type === 'expense')
		.reduce((acc, t) => {
			acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
			return acc;
		}, {} as Record<string, number>);

	const sortedCategories = Object.entries(topCategories)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.header}
				onPress={() => setExpanded(!expanded)}
				activeOpacity={0.8}
			>
				<View style={styles.headerContent}>
					<Ionicons name="analytics" size={20} color="#007ACC" />
					<Text style={styles.headerTitle}>Demo Data Overview</Text>
				</View>
				<Ionicons
					name={expanded ? 'chevron-up' : 'chevron-down'}
					size={20}
					color="#007ACC"
				/>
			</TouchableOpacity>

			{expanded && (
				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Summary Cards */}
					<View style={styles.summaryRow}>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Total Income</Text>
							<Text style={styles.summaryValue}>
								${totalIncome.toLocaleString()}
							</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Total Expenses</Text>
							<Text style={styles.summaryValue}>
								${totalExpenses.toLocaleString()}
							</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Net Savings</Text>
							<Text
								style={[
									styles.summaryValue,
									{ color: netSavings >= 0 ? '#10B981' : '#EF4444' },
								]}
							>
								${netSavings.toLocaleString()}
							</Text>
						</View>
					</View>

					{/* Data Counts */}
					<View style={styles.dataCounts}>
						<View style={styles.dataItem}>
							<Ionicons name="card" size={16} color="#6B7280" />
							<Text style={styles.dataText}>
								{transactions.length} Transactions
							</Text>
						</View>
						<View style={styles.dataItem}>
							<Ionicons name="pie-chart" size={16} color="#6B7280" />
							<Text style={styles.dataText}>{budgets.length} Budgets</Text>
						</View>
						<View style={styles.dataItem}>
							<Ionicons name="flag" size={16} color="#6B7280" />
							<Text style={styles.dataText}>{goals.length} Goals</Text>
						</View>
						<View style={styles.dataItem}>
							<Ionicons name="repeat" size={16} color="#6B7280" />
							<Text style={styles.dataText}>
								{recurringExpenses.length} Recurring
							</Text>
						</View>
					</View>

					{/* Top Spending Categories */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Top Spending Categories</Text>
						{sortedCategories.map(([category, amount], index) => (
							<View key={category} style={styles.categoryRow}>
								<View style={styles.categoryInfo}>
									<Text style={styles.categoryRank}>#{index + 1}</Text>
									<Text style={styles.categoryName}>{category}</Text>
								</View>
								<Text style={styles.categoryAmount}>
									${amount.toLocaleString()}
								</Text>
							</View>
						))}
					</View>

					{/* Recent Transactions Preview */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Recent Transactions</Text>
						{transactions.slice(0, 5).map((transaction) => (
							<View key={transaction.id} style={styles.transactionRow}>
								<View style={styles.transactionInfo}>
									<Text style={styles.transactionDescription}>
										{transaction.description}
									</Text>
									<Text style={styles.transactionCategory}>
										{transaction.category}
									</Text>
								</View>
								<Text
									style={[
										styles.transactionAmount,
										{
											color:
												transaction.type === 'income' ? '#10B981' : '#EF4444',
										},
									]}
								>
									{transaction.type === 'income' ? '+' : '-'}$
									{Math.abs(transaction.amount).toLocaleString()}
								</Text>
							</View>
						))}
					</View>

					{/* Demo Notice */}
					<View style={styles.demoNotice}>
						<Ionicons name="information-circle" size={16} color="#6B7280" />
						<Text style={styles.demoNoticeText}>
							This is sample data for demonstration purposes. All transactions,
							budgets, and goals are generated automatically.
						</Text>
					</View>
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginHorizontal: 16,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
		marginLeft: 8,
	},
	content: {
		maxHeight: 400,
	},
	summaryRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 8,
	},
	summaryCard: {
		flex: 1,
		backgroundColor: '#F9FAFB',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		color: '#6B7280',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},
	dataCounts: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 12,
	},
	dataItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	dataText: {
		fontSize: 14,
		color: '#6B7280',
	},
	section: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
		marginBottom: 12,
	},
	categoryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	categoryInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	categoryRank: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6B7280',
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	categoryName: {
		fontSize: 14,
		color: '#1F2937',
	},
	categoryAmount: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1F2937',
	},
	transactionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	transactionInfo: {
		flex: 1,
	},
	transactionDescription: {
		fontSize: 14,
		color: '#1F2937',
		marginBottom: 2,
	},
	transactionCategory: {
		fontSize: 12,
		color: '#6B7280',
	},
	transactionAmount: {
		fontSize: 14,
		fontWeight: '600',
	},
	demoNotice: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		padding: 16,
		backgroundColor: '#F9FAFB',
		marginHorizontal: 16,
		marginBottom: 16,
		borderRadius: 8,
	},
	demoNoticeText: {
		flex: 1,
		fontSize: 12,
		color: '#6B7280',
		lineHeight: 16,
	},
});
