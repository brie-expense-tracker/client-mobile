import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../../../../src/services/recurringExpenseService';

interface RecurringExpensesListProps {
	title?: string;
	showUpcomingOnly?: boolean;
	onExpensePress?: (expense: RecurringExpense) => void;
}

const RecurringExpensesList: React.FC<RecurringExpensesListProps> = ({
	title = 'Recurring Expenses',
	showUpcomingOnly = false,
	onExpensePress,
}) => {
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		loadExpenses();
	}, []);

	const loadExpenses = async () => {
		try {
			setLoading(true);
			const data = await RecurringExpenseService.getRecurringExpenses();

			if (showUpcomingOnly) {
				// Filter for expenses due within 7 days
				const upcoming = data.filter((expense) => {
					const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
						expense.nextExpectedDate
					);
					return daysUntilDue <= 7;
				});
				setExpenses(upcoming);
			} else {
				setExpenses(data);
			}
		} catch (error) {
			console.error('[RecurringExpensesList] Error loading expenses:', error);
			Alert.alert('Error', 'Failed to load recurring expenses');
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await loadExpenses();
		setRefreshing(false);
	};

	const handleExpensePress = (expense: RecurringExpense) => {
		if (onExpensePress) {
			onExpensePress(expense);
		}
	};

	const renderExpenseItem = (expense: RecurringExpense) => {
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);
		const statusColor = RecurringExpenseService.getStatusColor(daysUntilDue);
		const statusText = RecurringExpenseService.getStatusText(daysUntilDue);
		const frequency = RecurringExpenseService.formatFrequency(
			expense.frequency
		);

		return (
			<TouchableOpacity
				key={expense.patternId}
				style={styles.expenseItem}
				onPress={() => handleExpensePress(expense)}
			>
				<View style={styles.expenseHeader}>
					<View style={styles.vendorInfo}>
						<Text style={styles.vendorName}>{expense.vendor}</Text>
						<Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>
					</View>
					<View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
						<Text style={styles.statusText}>{statusText}</Text>
					</View>
				</View>

				<View style={styles.expenseDetails}>
					<View style={styles.detailRow}>
						<Ionicons name="repeat" size={16} color="#666" />
						<Text style={styles.detailText}>{frequency}</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="calendar" size={16} color="#666" />
						<Text style={styles.detailText}>
							Next: {new Date(expense.nextExpectedDate).toLocaleDateString()}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Ionicons name="checkmark-circle" size={16} color="#666" />
						<Text style={styles.detailText}>
							{expense.transactions.length} transactions detected
						</Text>
					</View>
				</View>

				<View style={styles.confidenceBar}>
					<View
						style={[
							styles.confidenceFill,
							{
								width: `${expense.confidence * 100}%`,
								backgroundColor:
									expense.confidence > 0.8 ? '#4caf50' : '#ff9800',
							},
						]}
					/>
				</View>
				<Text style={styles.confidenceText}>
					{RecurringExpenseService.formatConfidence(expense.confidence)}{' '}
					confidence
				</Text>
			</TouchableOpacity>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={styles.loadingText}>Loading recurring expenses...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
				<TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
					<Ionicons name="refresh" size={20} color="#007ACC" />
				</TouchableOpacity>
			</View>

			{expenses.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="repeat" size={48} color="#ccc" />
					<Text style={styles.emptyTitle}>No Recurring Expenses</Text>
					<Text style={styles.emptyText}>
						{showUpcomingOnly
							? 'No upcoming recurring expenses in the next 7 days'
							: 'Add more transactions to detect recurring patterns'}
					</Text>
				</View>
			) : (
				<ScrollView
					style={styles.expensesList}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
				>
					{expenses.map(renderExpenseItem)}
				</ScrollView>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	refreshButton: {
		padding: 5,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
		fontSize: 16,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#666',
		marginTop: 10,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginTop: 5,
		lineHeight: 20,
	},
	expensesList: {
		flex: 1,
	},
	expenseItem: {
		backgroundColor: '#fff',
		marginHorizontal: 20,
		marginVertical: 8,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#f0f0f0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	expenseHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	vendorInfo: {
		flex: 1,
	},
	vendorName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 2,
	},
	amount: {
		fontSize: 18,
		fontWeight: '700',
		color: '#007ACC',
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#fff',
	},
	expenseDetails: {
		marginBottom: 12,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	detailText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 6,
	},
	confidenceBar: {
		height: 4,
		backgroundColor: '#f0f0f0',
		borderRadius: 2,
		marginBottom: 4,
	},
	confidenceFill: {
		height: '100%',
		borderRadius: 2,
	},
	confidenceText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'right',
	},
});

export default RecurringExpensesList;
