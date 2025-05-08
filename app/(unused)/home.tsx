import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const Homepage = () => {
	return (
		<View className="flex-1 bg-gray-50">
			{/* Header Section */}
			<View className="bg-green-600 px-4 py-6">
				<Text className="text-white text-lg">Good afternoon,</Text>
				<Text className="text-white text-2xl font-semibold">Jeff Cavelier</Text>
				<View className="absolute right-5 top-5">
					<TouchableOpacity className="bg-white p-2 rounded-full">
						<FontAwesome name="bell" size={16} color="green" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Total Balance Section */}
			<View className="bg-green-500 rounded-3xl mx-4 -mt-12 p-6 shadow-lg">
				<Text className="text-white text-xl">Total Balance</Text>
				<Text className="text-white text-3xl font-bold">$2,548.00</Text>
				<View className="flex-row justify-between mt-4">
					<View className="items-center">
						<Text className="text-white text-sm">Income</Text>
						<Text className="text-white font-semibold">$1,840.00</Text>
					</View>
					<View className="items-center">
						<Text className="text-white text-sm">Expenses</Text>
						<Text className="text-white font-semibold">$284.00</Text>
					</View>
				</View>
			</View>

			{/* Transactions History */}
			<View className="flex-1 mt-6 px-4">
				<View className="flex-row justify-between items-center mb-4">
					<Text className="text-lg font-semibold">Transactions History</Text>
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

			{/* Floating Add Button */}
			<TouchableOpacity className="absolute bottom-10 right-5 bg-green-600 p-4 rounded-full shadow-lg">
				<FontAwesome name="plus" size={24} color="white" />
			</TouchableOpacity>

			{/* Bottom Navigation */}
			{/* <View className="bg-white flex-row justify-around py-4 border-t border-gray-200">
				<FontAwesome name="home" size={24} color="green" />
				<FontAwesome name="bar-chart" size={24} color="gray" />
				<FontAwesome name="user" size={24} color="gray" />
			</View> */}
			{/* <Stack.Screen options={{ headerShown: false }} /> */}
		</View>
	);
};

export default Homepage;
