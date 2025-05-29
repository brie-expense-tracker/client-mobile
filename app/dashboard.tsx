import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Platform,
	SafeAreaView,
	Image,
	StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import {
	Transaction,
	transactions as dummyTransactions,
} from './data/transactions';
import ProfitLossGraph from './components/ProfitLossGraph';
import ProfitGraph from './components/ProfitGraph';
import AntDesign from '@expo/vector-icons/AntDesign';
import AddTransaction from './components/AddTransaction';

const BalanceWidget = () => {
	// Calculate totals from dummy transactions
	const totalIncome = dummyTransactions
		.filter((t) => t.type === 'income')
		.reduce((sum, t) => sum + t.amount, 0);

	const totalExpense = dummyTransactions
		.filter((t) => t.type === 'expense')
		.reduce((sum, t) => sum + t.amount, 0);

	const totalBalance = totalIncome - totalExpense;

	return (
		<View
			className="bg-green-700 p-6 h-52 rounded-3xl flex-col"
			style={{
				shadowColor: '#0f8a32',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.6,
				shadowRadius: 15,
				elevation: 5,
			}}
		>
			{/* First Row */}
			<View className="flex-row h-10">
				<Text className="text-white font-semibold text-2xl self-start">
					Total Profit
				</Text>
				<Text className="text-white text-2xl ml-auto">...</Text>
			</View>

			{/* Second Row */}
			<View className="flex-1">
				<Text className="text-white font-semibold text-3xl text-left">
					${totalBalance.toFixed(2)}
				</Text>
			</View>
			{/* Third Row */}
			<View className="flex-row">
				<View className="h-16 flex-col">
					<View>
						<View className="flex-row">
							<View className="rounded-full bg-white/15 w-8 justify-center mr-1">
								<AntDesign
									name="arrowup"
									size={16}
									color="white"
									className="self-center"
								/>
							</View>
							<Text className="text-white/85 text-2xl font-semibold">
								Income
							</Text>
						</View>
						<Text className="text-white font-semibold text-2xl">
							${totalIncome.toFixed(2)}
						</Text>
					</View>
				</View>
				<View className="h-16 flex-col ml-auto">
					<View>
						<View className="flex-row">
							<View className="rounded-full bg-white/15 w-8 justify-center mr-1">
								<AntDesign
									name="arrowdown"
									size={16}
									color="white"
									className="self-center"
								/>
							</View>
							<Text className="text-white/85 text-2xl font-semibold">
								Expense
							</Text>
						</View>
						<Text className="text-white font-semibold text-2xl text-right">
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
	const [formData, setFormData] = useState({
		category: '',
		amount: '',
		description: '',
		date: new Date(),
	});
	const [showDatePicker, setShowDatePicker] = useState(false);

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

	// Load dummy data
	useEffect(() => {
		setTransactions(dummyTransactions);
	}, []);

	const handleSubmit = () => {
		console.log('Income submitted:', formData);
	};

	return (
		// Main container
		<View className="h-screen w-screen overflow-hidden">
			{/* Background */}
			<View className="w-[200%] h-[400px] -top-20 absolute bg-green-500 rounded-[50%] overflow-hidden self-center">
				<LinearGradient
					colors={['#59c076', '#36a255']}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.5, y: 0.9 }}
				>
					<View className="w-full h-full" />
				</LinearGradient>
			</View>
			{/* Screen View */}
			<SafeAreaView className="flex-1">
				<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
					<View className="justify-start w-full h-full p-6">
						{/* Header */}
						<View className="flex-row mb-4 justify-between items-center">
							<View className="flex-col">
								<Text className="text-white text-xl">Welcome back,</Text>
								<Text className="text-white text-3xl font-bold">Max</Text>
							</View>
							<TouchableOpacity
								onPress={() => router.push('/screens/profileScreen')}
								className="w-12 h-12 rounded-full bg-white/20 items-center justify-center overflow-hidden"
							>
								<Image
									source={require('../assets/images/profile.jpg')}
									className="w-12 h-12"
									resizeMode="cover"
								/>
							</TouchableOpacity>
						</View>

						{/* Main Content */}
						<View className="w-full">
							{/* Balance Widget */}
							<BalanceWidget />

							{/* <ProfitLossWidget /> */}

							{/* Transactions History */}
							<View className="mt-6 px-4">
								<View className="flex-row justify-between items-center mb-4">
									<Text className="text-lg font-semibold">
										Transactions History
									</Text>
									<TouchableOpacity
										onPress={() => router.push('/screens/transactionScreen')}
									>
										<Text className="text-green-600">See all</Text>
									</TouchableOpacity>
								</View>

								{transactions
									.sort(
										(a, b) =>
											new Date(b.date).getTime() - new Date(a.date).getTime()
									)
									.slice(0, 6)
									.map((transaction) => (
										<View
											key={transaction.id}
											className="flex-row justify-between items-center bg-white p-4 rounded-lg mb-3 shadow-sm"
										>
											<View>
												<Text className="text-gray-800 font-semibold">
													{transaction.description}
												</Text>
												<Text className="text-gray-400">
													{new Date(transaction.date).toLocaleDateString()}
												</Text>
											</View>
											<Text
												className={`font-semibold ${
													transaction.type === 'income'
														? 'text-green-600'
														: 'text-red-600'
												}`}
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

				{/* Floating Action Button */}
				<TouchableOpacity
					onPress={() => setIsAddTransactionVisible(true)}
					className="absolute bottom-6 left-1/2 bg-green-600 w-24 h-24 rounded-full items-center justify-center shadow-lg border-4 border-white"
					style={{
						shadowColor: '#000',
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: 0.3,
						shadowRadius: 8,
						elevation: 8,
						transform: [{ translateX: -40 }], // Half of the width to center
					}}
				>
					<Image
						source={require('../assets/images/brie-cheesecon.png')}
						className="w-16 h-12"
						resizeMode="contain"
					/>
				</TouchableOpacity>

				{isAddTransactionVisible && <View style={styles.modalOverlay} />}

				<AddTransaction
					visible={isAddTransactionVisible}
					onClose={() => setIsAddTransactionVisible(false)}
				/>
			</SafeAreaView>
		</View>
	);
};

export default Dashboard;

const styles = StyleSheet.create({
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
});
