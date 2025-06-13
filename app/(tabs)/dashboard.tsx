import React, { useEffect, useState, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	StyleSheet,
	RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
	Transaction,
	transactions as dummyTransactions,
} from '../../data/transactions';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// =============================================
// Types and Interfaces
// =============================================
interface BalanceWidgetProps {
	transactions: Transaction[];
}

// =============================================
// UI Components
// =============================================

// Progress bar component for displaying percentage-based values
const ProgressBar = ({
	value,
	total,
	color,
}: {
	value: number;
	total: number;
	color: string;
}) => {
	const percentage = Math.min((value / total) * 100, 100);
	return (
		<View style={styles.progressBarContainer}>
			<View
				style={[
					styles.progressBar,
					{ width: `${percentage}%`, backgroundColor: color },
				]}
			/>
		</View>
	);
};

// Individual stat widget showing a metric with icon and progress bar
const StatWidget = ({
	label,
	value,
	icon,
	color,
	progressValue,
	totalValue,
}: {
	label: string;
	value: number;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	progressValue: number;
	totalValue: number;
}) => {
	return (
		<View style={styles.statWidget}>
			<View style={styles.statContent}>
				<View style={styles.statHeader}>
					<View style={styles.iconContainer}>
						<Ionicons name={icon} size={16} color={color} style={styles.icon} />
					</View>
					<Text style={[styles.statLabel, { color: color }]}>{label}</Text>
				</View>
				<Text style={[styles.statValue, { color: color }]}>
					${value.toFixed(2)}
				</Text>
			</View>
			<ProgressBar value={progressValue} total={totalValue} color={color} />
		</View>
	);
};

// Balance widget showing income, expense, and budget stats
const BalanceWidget: React.FC<BalanceWidgetProps> = ({ transactions }) => {
	const totalIncome = transactions
		.filter((t: Transaction) => t?.type === 'income')
		.reduce((sum: number, t: Transaction) => sum + (t?.amount || 0), 0);

	const totalExpense = transactions
		.filter((t: Transaction) => t?.type === 'expense')
		.reduce((sum: number, t: Transaction) => sum + (t?.amount || 0), 0);

	const totalBalance = totalIncome - totalExpense;
	const maxValue = Math.max(totalIncome, totalExpense, Math.abs(totalBalance));

	return (
		<View style={styles.statsContainer}>
			<View style={styles.statsRow}>
				<StatWidget
					label="Income"
					value={totalIncome}
					icon="arrow-up"
					color="#16a34a"
					progressValue={totalIncome}
					totalValue={maxValue}
				/>

				<StatWidget
					label="Expense"
					value={totalExpense}
					icon="arrow-down"
					color="#dc2626"
					progressValue={totalExpense}
					totalValue={maxValue}
				/>
				<StatWidget
					label="Budget"
					value={totalExpense}
					icon="bar-chart"
					color="#000000"
					progressValue={totalExpense}
					totalValue={maxValue}
				/>
			</View>
		</View>
	);
};

// AI-powered insights widget
const AISuggestionBox = () => {
	return (
		<View style={styles.suggestionBox}>
			<View style={styles.suggestionHeader}>
				<Ionicons name="bulb-outline" size={20} color="#0095FF" />
				<Text style={styles.suggestionTitle}>AI Insights</Text>
			</View>
			<Text style={styles.suggestionText}>
				Based on your spending patterns, consider setting aside 20% of your
				income for savings this month.
			</Text>
		</View>
	);
};

// Transaction history component showing recent transactions
const TransactionHistory: React.FC<{ transactions: Transaction[] }> = ({
	transactions,
}) => {
	const getCategoryIcon = (categories: string[]) => {
		const categoryMap: {
			[key: string]: { name: keyof typeof Ionicons.glyphMap; color: string };
		} = {
			Groceries: { name: 'cart-outline', color: '#4CAF50' },
			Utilities: { name: 'flash-outline', color: '#FFC107' },
			Entertainment: { name: 'game-controller-outline', color: '#9C27B0' },
			Travel: { name: 'airplane-outline', color: '#2196F3' },
			Health: { name: 'fitness-outline', color: '#F44336' },
			Dining: { name: 'restaurant-outline', color: '#FF9800' },
			Shopping: { name: 'bag-outline', color: '#E91E63' },
			Transportation: { name: 'car-outline', color: '#2196F3' },
			Housing: { name: 'home-outline', color: '#795548' },
			Education: { name: 'school-outline', color: '#3F51B5' },
			Salary: { name: 'cash-outline', color: '#4CAF50' },
			Investment: { name: 'trending-up-outline', color: '#009688' },
			Gifts: { name: 'gift-outline', color: '#E91E63' },
			Other: { name: 'ellipsis-horizontal-outline', color: '#9E9E9E' },
		};

		const primaryCategory = categories[0];
		return categoryMap[primaryCategory] || categoryMap['Other'];
	};

	return (
		<View style={styles.transactionsSectionContainer}>
			<View style={styles.transactionsHeader}>
				<Text style={styles.transactionsTitle}>Transaction History</Text>
			</View>
			{/* <View style={styles.transactionsListContainerShadow}> */}
			<View style={styles.transactionsListContainer}>
				{transactions
					.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
					)
					.slice(0, 6)
					.map((transaction) => {
						const categoryIcon = getCategoryIcon(
							transaction.category || ['Other']
						);
						return (
							<View key={transaction.id} style={styles.transactionItem}>
								<TouchableOpacity
									onPress={() => router.push('/transaction')}
									style={{
										flex: 1,
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<View
										style={{
											flexDirection: 'row',
											alignItems: 'center',
										}}
									>
										<View
											style={[
												styles.iconContainer,
												{
													backgroundColor: `${categoryIcon.color}20`,
												},
											]}
										>
											<Ionicons
												name={categoryIcon.name}
												size={20}
												color={categoryIcon.color}
											/>
										</View>
										<View style={{ marginLeft: 12 }}>
											<Text style={styles.transactionDescription}>
												{transaction.description}
											</Text>
											<Text style={styles.transactionDate}>
												{new Date(transaction.date).toLocaleDateString()}
											</Text>
										</View>
									</View>
									<Text
										style={[
											styles.transactionAmount,
											transaction.type === 'income'
												? styles.incomeAmount
												: styles.expenseAmount,
										]}
									>
										{transaction.type === 'income' ? '+' : '-'} $
										{transaction.amount.toFixed(2)}
									</Text>
								</TouchableOpacity>
							</View>
						);
					})}
			</View>
			{/* </View> */}
		</View>
	);
};

// =============================================
// Main Dashboard Component
// =============================================
const Dashboard = () => {
	// State Management
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	// Calculate total balance from transactions
	const totalBalance = transactions.reduce((sum, t) => {
		return sum + (t.type === 'income' ? t.amount : -t.amount);
	}, 0);

	// Data Fetching
	const fetchTransactions = async () => {
		try {
			const response = await axios.get(
				'http://localhost:3000/api/transactions'
			);
			const formattedTransactions = response.data.map((t: any) => ({
				id: t._id || t.id,
				description: t.description || '',
				amount: Number(t.amount) || 0,
				date: t.date || new Date().toISOString(),
				tags: t.tags || [],
				type: t.type || 'expense',
			}));
			setTransactions(formattedTransactions);
		} catch (error) {
			setTransactions(dummyTransactions);
		}
	};

	// Pull-to-refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchTransactions();
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setRefreshing(false);
		}
	}, []);

	// Initial data load
	useEffect(() => {
		fetchTransactions();
	}, []);

	// Main render
	return (
		<SafeAreaView style={styles.safeArea}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<ScrollView
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#0095FF"
							colors={['#0095FF']}
							progressBackgroundColor="#ffffff"
						/>
					}
				>
					<View style={styles.contentContainer}>
						{/* Header Section */}
						<View style={styles.headerContainer}>
							<View style={styles.headerTextContainer}>
								<Text style={styles.headerText}>Dashboard</Text>
							</View>

							<TouchableOpacity
								onPress={() => router.push('/notifications')}
								style={styles.notificationButton}
							>
								<View style={{ position: 'relative' }}>
									<Ionicons
										name="notifications-outline"
										color="#212121"
										size={24}
									/>
									<View style={styles.notificationAlertButton} />
								</View>
							</TouchableOpacity>
						</View>

						{/* AI Insights Section */}
						<AISuggestionBox />

						{/* Total Balance Section */}
						<View style={styles.header}>
							<Text style={styles.balanceLabel}>Total Value</Text>
							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<Text style={styles.balanceAmount}>$</Text>
								<Text style={styles.balanceAmount}>
									{totalBalance?.toFixed(2)}
								</Text>
							</View>
						</View>

						{/* Balance Stats Carousel */}
						<View style={styles.carouselWrapper}>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.carouselContainer}
								pagingEnabled
								snapToInterval={styles.statWidget.width + 12}
								decelerationRate="fast"
							>
								<BalanceWidget transactions={transactions} />
							</ScrollView>
						</View>

						{/* Transaction History Section */}
						<TransactionHistory transactions={transactions} />
					</View>
				</ScrollView>
			</GestureHandlerRootView>
		</SafeAreaView>
	);
};

// =============================================
// Styles
// =============================================
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentContainer: {
		justifyContent: 'flex-start',
		flex: 1,
		paddingHorizontal: 24,
	},
	headerContainer: {
		flexDirection: 'row',
		marginBottom: 16,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	headerTextContainer: {
		flexDirection: 'column',
		alignItems: 'center',
	},
	headerText: {
		color: '#212121',
		fontSize: 28,
		fontWeight: '500',
	},
	notificationAlertButton: {
		position: 'absolute',
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF6A00',
		borderWidth: 1,
		borderColor: 'white',
	},
	notificationButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		position: 'absolute',
		right: 0,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		marginVertical: 8,
	},
	statsRow: {
		width: '100%',
		gap: 12,
		flexDirection: 'row',
	},
	statWidget: {
		width: 160,
		borderRadius: 16,
		backgroundColor: '#ffffff',
		padding: 16,
		justifyContent: 'flex-start',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 5,
	},
	statContent: {
		flex: 1,
		marginBottom: 26,
	},
	statHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		marginBottom: 8,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	icon: {
		alignSelf: 'center',
	},
	statLabel: {
		color: '#353535',
		fontSize: 20,
		fontWeight: '400',
	},
	statValue: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '600',
	},
	progressBarContainer: {
		height: 6,
		backgroundColor: 'rgba(0, 149, 255, 0.1)',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
		borderRadius: 4,
	},
	header: {
		flex: 1,
		marginBottom: 16,
	},
	balanceLabel: {
		color: '#535353',
		fontSize: 14,
	},
	balanceAmount: {
		color: '#212121',
		fontSize: 36,
		fontWeight: '600',
	},
	profitLabel: {
		color: '#16a34a',
		fontSize: 16,
		fontWeight: '500',
	},
	card: {
		backgroundColor: 'white',
		borderRadius: 16,
		marginBottom: 16,
	},
	chartCard: {
		marginTop: 16,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 16,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	summaryItem: {
		flex: 1,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#535353',
		marginBottom: 4,
		textAlign: 'center',
	},
	incomeText: {
		textAlign: 'center',
		color: '#16a34a',
		fontWeight: '600',
		fontSize: 18,
	},
	expenseText: {
		textAlign: 'center',
		color: '#dc2626',
		fontWeight: '600',
		fontSize: 18,
	},
	budgetAmount: {
		textAlign: 'center',
		color: '#212121',
		fontWeight: '600',
		fontSize: 18,
	},
	transactionsSectionContainer: {},
	transactionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 0,
	},
	transactionsTitle: {
		fontWeight: '600',
		// fontSize: 18,
		// color: '#212121',
		color: '#535353',
		fontSize: 14,
	},
	seeAllText: {
		color: '#546E7A',
	},
	transactionsListContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		overflow: 'hidden',
	},
	transactionsListContainerShadow: {
		shadowColor: '#b1b1b1',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 5,
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
	},
	transactionDescription: {
		color: '#212121',
		fontWeight: '500',
		marginBottom: 4,
	},
	transactionDate: {
		color: '#9ca3af',
	},
	transactionAmount: {
		fontWeight: '600',
	},
	incomeAmount: {
		color: '#16a34a',
	},
	expenseAmount: {
		color: '#dc2626',
	},
	suggestionBox: {
		backgroundColor: '#F0F7FF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	suggestionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	suggestionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1E293B',
		marginLeft: 8,
	},
	suggestionText: {
		fontSize: 14,
		color: '#475569',
		lineHeight: 20,
	},
	carouselWrapper: {
		marginHorizontal: -24, // Negate parent padding
		marginBottom: 16,
	},
	carouselContainer: {
		paddingHorizontal: 24, // Add padding back to the content
		gap: 12,
	},
	quickActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 20,
		marginBottom: 10,
	},
	quickActionButton: {
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		flex: 1,
		marginHorizontal: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
	quickActionButtonText: {
		marginTop: 5,
		fontSize: 13,
		fontWeight: '500',
		color: '#555555',
	},
});

export default Dashboard;
