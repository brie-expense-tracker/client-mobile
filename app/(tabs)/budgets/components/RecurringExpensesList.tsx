import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../../../../src/services/recurringExpenseService';
import { useRecurringExpenses } from '../../../../src/hooks/useRecurringExpenses';
import { FilterContext } from '../../../../src/context/filterContext';
import RecurringExpenseCard from './RecurringExpenseCard';

interface RecurringExpensesListProps {
	title?: string;
	showUpcomingOnly?: boolean;
	maxVisibleItems?: number;
	onExpensePress?: (expense: RecurringExpense) => void;
	showAddButton?: boolean;
}

const RecurringExpensesList: React.FC<RecurringExpensesListProps> = ({
	title = 'Recurring Expenses',
	showUpcomingOnly = false,
	maxVisibleItems,
	onExpensePress,
	showAddButton = true,
}) => {
	const { setSelectedPatternId } = useContext(FilterContext);
	const {
		expenses: allExpenses,
		isLoading: loading,
		refetch,
	} = useRecurringExpenses();
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [markingAsPaid, setMarkingAsPaid] = useState<string | null>(null);

	// Filter expenses based on context data
	useEffect(() => {
		if (showUpcomingOnly) {
			// Filter for expenses due within 7 days
			const upcoming = allExpenses.filter((expense) => {
				const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
					expense.nextExpectedDate
				);
				return daysUntilDue <= 7;
			});
			console.log(
				'[RecurringExpensesList] Filtered upcoming expenses:',
				upcoming
			);
			setExpenses(upcoming);
		} else {
			console.log('[RecurringExpensesList] Setting all expenses:', allExpenses);
			setExpenses(allExpenses);
		}
	}, [allExpenses, showUpcomingOnly]);

	const handleExpensePress = (expense: RecurringExpense) => {
		if (onExpensePress) {
			onExpensePress(expense);
		}
	};

	const handleOptionsPress = (expense: RecurringExpense) => {
		// Use the onExpensePress handler to show the modal
		if (onExpensePress) {
			onExpensePress(expense);
		}
	};

	const handleAddRecurringExpense = () => {
		router.push('/(stack)/addRecurringExpense');
	};

	// Group expenses by frequency
	const groupExpensesByFrequency = () => {
		const grouped: Record<string, RecurringExpense[]> = {
			weekly: [],
			monthly: [],
			quarterly: [],
			yearly: [],
		};

		expenses.forEach((expense) => {
			if (grouped[expense.frequency]) {
				grouped[expense.frequency].push(expense);
			}
		});

		return grouped;
	};

	const formatPeriodHeader = (frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return 'This Week';
			case 'monthly':
				return 'This Month';
			case 'quarterly':
				return 'This Quarter';
			case 'yearly':
				return 'This Year';
			default:
				return frequency.charAt(0).toUpperCase() + frequency.slice(1);
		}
	};

	const renderExpenseItem = (expense: RecurringExpense) => {
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);
		const frequency = RecurringExpenseService.formatFrequency(
			expense.frequency
		);

		// Simplified status - using days until due to determine if overdue
		const isPaid = daysUntilDue > 0; // If not overdue, consider it "paid" for display purposes
		const isMarkingAsPaid = markingAsPaid === expense.patternId;

		// Determine icon and color based on vendor
		const getVendorIconAndColor = (vendor: string) => {
			const vendorLower = vendor.toLowerCase();
			if (vendorLower.includes('netflix'))
				return {
					icon: 'play-circle-outline' as keyof typeof Ionicons.glyphMap,
					color: '#E50914',
				};
			if (vendorLower.includes('spotify'))
				return {
					icon: 'musical-notes-outline' as keyof typeof Ionicons.glyphMap,
					color: '#1DB954',
				};
			if (vendorLower.includes('amazon'))
				return {
					icon: 'bag-outline' as keyof typeof Ionicons.glyphMap,
					color: '#FF9900',
				};
			if (vendorLower.includes('uber'))
				return {
					icon: 'car-outline' as keyof typeof Ionicons.glyphMap,
					color: '#000000',
				};
			if (vendorLower.includes('lyft'))
				return {
					icon: 'car-outline' as keyof typeof Ionicons.glyphMap,
					color: '#FF00BF',
				};
			if (vendorLower.includes('doordash') || vendorLower.includes('grubhub'))
				return {
					icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
					color: '#FF6B35',
				};
			if (vendorLower.includes('rent') || vendorLower.includes('apartment'))
				return {
					icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
					color: '#4CAF50',
				};
			if (vendorLower.includes('electric') || vendorLower.includes('power'))
				return {
					icon: 'flash-outline' as keyof typeof Ionicons.glyphMap,
					color: '#FFC107',
				};
			if (vendorLower.includes('water'))
				return {
					icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
					color: '#2196F3',
				};
			if (vendorLower.includes('internet') || vendorLower.includes('wifi'))
				return {
					icon: 'wifi-outline' as keyof typeof Ionicons.glyphMap,
					color: '#9C27B0',
				};
			if (vendorLower.includes('phone') || vendorLower.includes('mobile'))
				return {
					icon: 'call-outline' as keyof typeof Ionicons.glyphMap,
					color: '#00BCD4',
				};
			if (vendorLower.includes('insurance'))
				return {
					icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
					color: '#795548',
				};
			if (vendorLower.includes('gym') || vendorLower.includes('fitness'))
				return {
					icon: 'fitness-outline' as keyof typeof Ionicons.glyphMap,
					color: '#F44336',
				};
			return {
				icon: 'repeat-outline' as keyof typeof Ionicons.glyphMap,
				color: '#1E88E5',
			};
		};

		const { icon, color } = getVendorIconAndColor(expense.vendor);

		return (
			<TouchableOpacity
				key={expense.patternId}
				onPress={() => handleExpensePress(expense)}
			>
				<RecurringExpenseCard
					vendor={expense.vendor}
					amount={expense.amount}
					dueInDays={daysUntilDue}
					nextDueDate={new Date(expense.nextExpectedDate).toLocaleDateString()}
					frequency={frequency}
					iconName={icon}
					color={color}
					isPaid={isPaid}
					isProcessing={isMarkingAsPaid}
					onPressMarkPaid={() => handleOptionsPress(expense)}
					onPressEdit={() => handleOptionsPress(expense)}
				/>
			</TouchableOpacity>
		);
	};

	const renderPeriodSection = (
		frequency: string,
		expenses: RecurringExpense[]
	) => {
		if (expenses.length === 0) return null;

		return (
			<View key={frequency} style={styles.periodSection}>
				<View style={styles.periodHeader}>
					<View style={styles.periodIconWrapper}>
						<Ionicons name="calendar-outline" size={20} color="#00a2ff" />
					</View>
					<Text style={styles.periodText}>{formatPeriodHeader(frequency)}</Text>
				</View>
				<View style={styles.expensesList}>
					{expenses.map(renderExpenseItem)}
				</View>
			</View>
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

	const groupedExpenses = groupExpensesByFrequency();
	const hasExpenses = expenses.length > 0;

	return (
		<View style={styles.container}>
			{title && (
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					{showAddButton && (
						<TouchableOpacity
							style={styles.addButton}
							onPress={handleAddRecurringExpense}
						>
							<Ionicons name="add" size={20} color="#007ACC" />
							<Text style={styles.addButtonText}>Add</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

			{!hasExpenses ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="repeat" size={48} color="#ccc" />
					<Text style={styles.emptyTitle}>No Recurring Expenses</Text>
					<Text style={styles.emptyText}>
						{showUpcomingOnly
							? 'No upcoming recurring expenses in the next 7 days'
							: 'Add recurring expenses to track your regular payments'}
					</Text>

					{showAddButton && (
						<TouchableOpacity
							style={styles.addRecurringButton}
							onPress={handleAddRecurringExpense}
						>
							<Ionicons name="add" size={16} color="#007ACC" />
							<Text style={styles.addRecurringButtonText}>
								Add Recurring Expense
							</Text>
						</TouchableOpacity>
					)}
				</View>
			) : (
				<View style={styles.expensesContainer}>
					{Object.entries(groupedExpenses).map(([frequency, expenses]) =>
						renderPeriodSection(frequency, expenses)
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 8,
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f8ff',
	},
	addButtonText: {
		marginLeft: 4,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	loadingContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingVertical: 40,
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
		fontSize: 16,
	},
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
		paddingVertical: 40,
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
		marginBottom: 20,
	},
	addRecurringButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: '#f0f8ff',
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	addRecurringButtonText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	expensesContainer: {
		paddingHorizontal: 0,
	},
	periodSection: {
		marginBottom: 0,
	},
	periodHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		paddingHorizontal: 24,
	},
	periodIconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#e0f7fa',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	periodText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	expensesList: {
		paddingHorizontal: 0,
	},
});

export default RecurringExpensesList;
