import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import axios from 'axios';

const Dashboard = () => {
	const [transactions, setTransactions] = useState([]);
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

	// Fetch Data from Backend
	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await axios.get(
					'http://localhost:4000/api/transactions'
				); // Replace with your backend URL
				setTransactions(response.data);
			} catch (error) {
				console.error('Error fetching transactions:', error);
			}
		};

		fetchData();
	}, []);

	const handleSubmit = () => {
		console.log('Income submitted:', formData);
	};

	return (
		<KeyboardAvoidingView
			className="h-screen w-screen overflow-hidden"
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
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
			<View className="justify-start mt-24 w-full h-full p-6">
				{/* Header */}
				<View className="flex-row mb-4">
					<View className="flex-col">
						<Text className="text-white text-xl">Welcome back,</Text>
						<Text className="text-white text-3xl font-bold">Max</Text>
					</View>
				</View>

				{/* Main Content */}
				<View className=" ">
					{/* Balance Widget */}
					<View
						className="bg-green-700 p-6 h-52 rounded-3xl flex-col"
						style={{
							shadowColor: '#0f8a32',
							shadowOffset: { width: 0, height: 4 }, // Shift shadow down the Y-axis
							shadowOpacity: 0.6,
							shadowRadius: 15,
							elevation: 5, // for Android
						}}
					>
						{/* First Row */}
						<View className="flex-row h-10">
							<Text className="text-white font-semibold text-2xl self-start">
								Total Balance
							</Text>

							<Text className="text-white text-2xl ml-auto  ">...</Text>
						</View>

						{/* Second Row */}
						<View className="flex-1">
							<Text className="text-white font-semibold text-3xl text-left">
								$1,202.58
							</Text>
						</View>
						{/* Third Row */}
						<View className="flex-row ">
							<View className="h-16 flex-col">
								<View>
									<View className="flex-row ">
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
										$203.70
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
										$950.28
									</Text>
								</View>
							</View>
						</View>
					</View>

					{/* Transactions History */}
					<View className="mt-6 px-4">
						<View className="flex-row justify-between items-center mb-4">
							<Text className="text-lg font-semibold">
								Transactions History
							</Text>
							<TouchableOpacity>
								<Text className="text-green-600">See all</Text>
							</TouchableOpacity>
						</View>

						<ScrollView>
							{[
								{
									name: 'Paycheck',
									date: 'Today',
									amount: '+ $850.00',
									type: 'income',
								},
								{
									name: 'Transfer',
									date: 'Yesterday',
									amount: '- $85.00',
									type: 'expense',
								},
								{
									name: 'Paypal',
									date: 'Jan 30, 2022',
									amount: '+ $1,406.00',
									type: 'income',
								},
								{
									name: 'Youtube',
									date: 'Jan 16, 2022',
									amount: '- $11.99',
									type: 'expense',
								},
								{
									name: 'Transfer',
									date: 'Yesterday',
									amount: '- $85.00',
									type: 'expense',
								},
							].map((transaction, index) => (
								<View
									key={index}
									className="flex-row justify-between items-center bg-white p-4 rounded-lg mb-3 shadow-sm"
								>
									<View>
										<Text className="text-gray-800 font-semibold">
											{transaction.name}
										</Text>
										<Text className="text-gray-400">{transaction.date}</Text>
									</View>
									<Text
										className={`font-semibold ${
											transaction.type === 'income'
												? 'text-green-600'
												: 'text-red-600'
										}`}
									>
										{transaction.amount}
									</Text>
								</View>
							))}
						</ScrollView>
					</View>
				</View>
			</View>

			<Stack.Screen
				options={{
					headerTransparent: true,
					headerTitle: 'Dashboard',
					headerBackTitle: '',
					headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
					headerBackTitleStyle: { fontSize: 30 },
					headerTintColor: '#fff',
				}}
			/>
		</KeyboardAvoidingView>
	);
};

export default Dashboard;
