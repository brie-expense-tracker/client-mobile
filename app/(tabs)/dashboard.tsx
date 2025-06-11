import React, { useEffect, useState, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Platform,
	SafeAreaView,
	Image,
	StyleSheet,
	RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import {
	Transaction,
	transactions as dummyTransactions,
} from '../data/transactions';
import ProfitGraph from '../components/ProfitGraph';
import AddTransaction from '../components/AddTransaction';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface BalanceWidgetProps {
	transactions: Transaction[];
}

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
		<View style={styles.balanceContainer}>
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
		</View>
	);
};

const ProfitLossWidget = () => {
	// Calculate profit and loss data from transactions
	const profitLossData = [
		{
			name: 'Current Month',
			Profit: dummyTransactions
				.filter((t) => t.type === 'income')
				.reduce((sum, t) => sum + t.amount, 0),
			Loss: dummyTransactions
				.filter((t) => t.type === 'expense')
				.reduce((sum, t) => sum + t.amount, 0),
		},
	];

	return (
		<View className="mt-6 bg-white rounded-3xl w-full">
			<View className="p-6">
				<Text className="text-lg font-semibold mb-4 text-center">
					Profit Over Time
				</Text>
			</View>
			<View style={{}}>
				<ProfitGraph transactions={dummyTransactions} />
			</View>
		</View>
	);
};

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

const Dashboard = () => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isAddTransactionVisible, setIsAddTransactionVisible] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [formData, setFormData] = useState({
		category: '',
		amount: '',
		description: '',
		date: new Date(),
	});
	const [showDatePicker, setShowDatePicker] = useState(false);

	const totalBalance = transactions.reduce((sum, t) => {
		return sum + (t.type === 'income' ? t.amount : -t.amount);
	}, 0);

	const handleQuickAction = (action: string) => {
		console.log(`Action: ${action} button pressed!`);
	};

	const fetchTransactions = async () => {
		try {
			const response = await axios.get(
				'http://localhost:3000/api/transactions'
			);
			// Ensure the response data matches our Transaction type
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
			// UNCOMMENT WHILE TESTING AXIOS
			// console.error('Error fetching transactions:', error);

			// Fallback to dummy data if API call fails
			setTransactions(dummyTransactions);
		}
	};

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

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleDateChange = (event: any, selectedDate: Date | undefined) => {
		if (Platform.OS !== 'ios') setShowDatePicker(false);
		if (selectedDate) {
			setFormData((prev) => ({
				...prev,
				date: selectedDate,
			}));
		}
	};

	useEffect(() => {
		fetchTransactions();
	}, []);

	const handleSubmit = () => {
		console.log('Income submitted:', formData);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
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
					<View style={styles.headerContainer}>
						<View style={styles.headerTextContainer}>
							<Text style={styles.nameText}>Dashboard</Text>
						</View>

						<TouchableOpacity
							onPress={() => router.push('/screens/notifications')}
							style={styles.profileButton}
						>
							<View style={{ position: 'relative' }}>
								<Ionicons
									name="notifications-outline"
									color="#212121"
									size={24}
								/>
								<View style={styles.notificationButton} />
							</View>
						</TouchableOpacity>
					</View>
					<AISuggestionBox />

					<View style={styles.header}>
						<Text style={styles.balanceLabel}>Total Value</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text style={styles.balanceAmount}>$</Text>
							<Text style={styles.balanceAmount}>
								{totalBalance?.toFixed(2)}
							</Text>
						</View>
					</View>

					<View style={styles.carouselWrapper}>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.carouselContainer}
							pagingEnabled
							snapToInterval={styles.statWidget.width + 12} // width + gap
							decelerationRate="fast"
						>
							<BalanceWidget transactions={transactions} />
						</ScrollView>
					</View>

					{/* Transactions History */}
					<View style={styles.transactionsContainer}>
						<View style={styles.transactionsHeader}>
							<Text style={styles.transactionsTitle}>Transactions History</Text>
							<TouchableOpacity onPress={() => router.push('/transaction')}>
								<Text style={styles.seeAllText}>See all</Text>
							</TouchableOpacity>
						</View>

						{transactions
							.sort(
								(a, b) =>
									new Date(b.date).getTime() - new Date(a.date).getTime()
							)
							.slice(0, 6)
							.map((transaction) => (
								<View key={transaction.id} style={styles.transactionItem}>
									<View>
										<Text style={styles.transactionDescription}>
											{transaction.description}
										</Text>
										<Text style={styles.transactionDate}>
											{new Date(transaction.date).toLocaleDateString()}
										</Text>
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
								</View>
							))}
					</View>

					{/* --- Quick Action Buttons --- */}
					<View style={styles.quickActionsContainer}>
						<TouchableOpacity
							style={styles.quickActionButton}
							onPress={() => handleQuickAction('View Budgets')}
						>
							<MaterialCommunityIcons
								name="wallet-outline"
								size={24}
								color="#333"
							/>
							<Text style={styles.quickActionButtonText}>Budgets</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.quickActionButton}
							onPress={() => handleQuickAction('Reports')}
						>
							<MaterialCommunityIcons name="chart-bar" size={24} color="#333" />
							<Text style={styles.quickActionButtonText}>Reports</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.quickActionButton}
							onPress={() => handleQuickAction('Settings')}
						>
							<MaterialCommunityIcons
								name="cog-outline"
								size={24}
								color="#333"
							/>
							<Text style={styles.quickActionButtonText}>Settings</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Dashboard;

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		overflow: 'hidden',
		backgroundColor: '#f9fafb',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		justifyContent: 'flex-start',
		flex: 1,
		paddingHorizontal: 24,
		backgroundColor: '#f9fafb',
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
	welcomeText: {
		color: '#212121',
		fontSize: 20,
	},
	nameText: {
		color: '#212121',
		fontSize: 28,
		fontWeight: '500',
	},
	notificationButton: {
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
	profileButton: {
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
	profileImage: {
		width: 48,
		height: 48,
	},

	transactionsContainer: {
		paddingTop: 16,
	},
	transactionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	transactionsTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#535353',
	},
	seeAllText: {
		color: '#546E7A',
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: 'white',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		marginBottom: 12,
		elevation: 2,
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
	fab: {
		position: 'absolute',
		bottom: 24,
		left: '50%',
		backgroundColor: '#16a34a',
		width: 96,
		height: 96,
		borderRadius: 48,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
		borderWidth: 4,
		borderColor: 'white',
		transform: [{ translateX: -40 }],
	},
	fabImage: {
		width: 64,
		height: 48,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 1,
	},
	totalProfitContainer: {
		backgroundColor: 'rgba(0, 149, 255, 0.1)',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(0, 149, 255, 0.2)',
		marginBottom: 16,
	},
	balanceText: {
		color: '#212121',
		fontWeight: '600',
		fontSize: 36,
		textAlign: 'left',
		marginTop: 8,
	},
	balanceContainer: {
		borderRadius: 24,
		flexDirection: 'column',
		backgroundColor: 'transparent',
		marginBottom: 8,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
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
		shadowOffset: { width: 0, height: 2 },
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
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 4,
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
