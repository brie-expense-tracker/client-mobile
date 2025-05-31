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
import ProfitLossGraph from '../components/ProfitLossGraph';
import ProfitGraph from '../components/ProfitGraph';
import AntDesign from '@expo/vector-icons/AntDesign';
import AddTransaction from '../components/AddTransaction';
import axios from 'axios';

interface BalanceWidgetProps {
	transactions: Transaction[];
}

const BalanceWidget: React.FC<BalanceWidgetProps> = ({ transactions }) => {
	// Calculate totals from transactions
	const totalIncome = transactions
		.filter((t: Transaction) => t?.type === 'income')
		.reduce((sum: number, t: Transaction) => sum + (t?.amount || 0), 0);

	const totalExpense = transactions
		.filter((t: Transaction) => t?.type === 'expense')
		.reduce((sum: number, t: Transaction) => sum + (t?.amount || 0), 0);

	const totalBalance = totalIncome - totalExpense;

	return (
		<View style={styles.balanceContainer}>
			{/* First Row */}
			<View style={styles.headerRow}>
				<Text style={styles.headerText}>Total Profit</Text>
				{/* <Text style={styles.headerText}>...</Text> */}
			</View>

			{/* Second Row */}
			<View style={styles.balanceRow}>
				<Text style={styles.balanceText}>${totalBalance.toFixed(2)}</Text>
			</View>
			{/* Third Row */}
			<View style={styles.statsRow}>
				<View style={styles.statColumn}>
					<View>
						<View style={styles.statHeader}>
							<View style={styles.iconContainer}>
								<AntDesign
									name="arrowup"
									size={16}
									color="white"
									style={styles.icon}
								/>
							</View>
							<Text style={styles.statLabel}>Income</Text>
						</View>
						<Text style={styles.statValue}>${totalIncome.toFixed(2)}</Text>
					</View>
				</View>
				<View style={styles.statColumn}>
					<View>
						<View style={styles.statHeader}>
							<View style={styles.iconContainer}>
								<AntDesign
									name="arrowdown"
									size={16}
									color="white"
									style={styles.icon}
								/>
							</View>
							<Text style={styles.statLabel}>Expense</Text>
						</View>
						<Text style={[styles.statValue, styles.statValueRight]}>
							${totalExpense.toFixed(2)}
						</Text>
					</View>
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
			console.error('Error fetching transactions:', error);
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
		<View style={styles.mainContainer}>
			<View style={styles.backgroundContainer}>
				{/* <LinearGradient
					colors={['#59c076', '#0a5b21']}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.5, y: 0.9 }}
				>
					<View style={styles.gradientContainer} />
				</LinearGradient> */}
			</View>
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
								<Text style={styles.welcomeText}>Welcome back,</Text>
								<Text style={styles.nameText}>Max</Text>
							</View>
							<TouchableOpacity
								onPress={() => router.push('/(tabs)/profileScreen')}
								style={styles.profileButton}
							>
								<View style={{ position: 'relative' }}>
									<AntDesign name="bells" size={24} color="#212121" />
									<View
										style={{
											position: 'absolute',
											top: -2,
											right: -2,
											width: 8,
											height: 8,
											borderRadius: 4,
											backgroundColor: '#FF6A00',
											borderWidth: 1,
											borderColor: 'white',
										}}
									/>
								</View>
							</TouchableOpacity>
						</View>

						<View style={styles.mainContent}>
							<BalanceWidget transactions={transactions} />

							{/* <ProfitLossWidget /> */}

							{/* Transactions History */}
							<View style={styles.transactionsContainer}>
								<View style={styles.transactionsHeader}>
									<Text style={styles.transactionsTitle}>
										Transactions History
									</Text>
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
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
};

export default Dashboard;

const styles = StyleSheet.create({
	mainContainer: {
		height: '100%',
		width: '100%',
		overflow: 'hidden',
		backgroundColor: '#fff',
	},
	backgroundContainer: {
		width: '200%',
		height: 400,
		position: 'absolute',
		top: -20,
		backgroundColor: 'white',
		borderRadius: 50,
		overflow: 'hidden',
		alignSelf: 'center',
	},
	gradientContainer: {
		width: '100%',
		height: '100%',
	},
	safeArea: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		justifyContent: 'flex-start',
		width: '100%',
		height: '100%',
		padding: 24,
		backgroundColor: '#fff',
	},
	headerContainer: {
		flexDirection: 'row',
		marginBottom: 16,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	headerTextContainer: {
		flexDirection: 'column',
	},
	welcomeText: {
		color: '#212121',
		fontSize: 20,
	},
	nameText: {
		color: '#212121',
		fontSize: 32,
		fontWeight: 'bold',
	},
	profileButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	profileImage: {
		width: 48,
		height: 48,
	},
	mainContent: {
		width: '100%',
	},
	transactionsContainer: {
		marginTop: 24,
	},
	transactionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	transactionsTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	seeAllText: {
		color: '#546E7A',
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E6F0FF',
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	transactionDescription: {
		color: '#212121',
		fontWeight: '600',
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
	balanceContainer: {
		backgroundColor: '#0095FF',
		padding: 24,
		height: 208, // h-52
		borderRadius: 24, // rounded-3xl
		flexDirection: 'column',
		shadowColor: '#1D4ED8',
		shadowOpacity: 0.3,
		// shadowRadius: 15,
		shadowOffset: { width: 0, height: 4 },
		elevation: 5,
	},
	headerRow: {
		flexDirection: 'row',
		height: 40,
	},
	headerText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 24,
	},
	balanceRow: {
		flex: 1,
	},
	balanceText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 30,
		textAlign: 'left',
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	statColumn: {
		height: 64,
		flexDirection: 'column',
	},
	statHeader: {
		flexDirection: 'row',
	},
	iconContainer: {
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		width: 32,
		justifyContent: 'center',
		marginRight: 4,
		borderRadius: 9999,
	},
	icon: {
		alignSelf: 'center',
	},
	statLabel: {
		color: 'rgba(255, 255, 255, 0.85)',
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 4,
		paddingVertical: 2,
	},
	statValue: {
		color: 'white',
		// fontWeight: '6',
		fontSize: 24,
	},
	statValueRight: {
		textAlign: 'right',
	},
});
