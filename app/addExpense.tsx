import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';

const AddExpenseScreen = () => {
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

	const handleSubmit = () => {
		console.log('Expense submitted:', formData);
	};

	return (
		<KeyboardAvoidingView
			className="h-screen w-screen overflow-hidden"
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			{/* Background */}
			<View className="w-[200%] h-[500px] -top-20 absolute bg-red-500 rounded-[50%] overflow-hidden self-center">
				<LinearGradient
					colors={['#F95B51', '#b3241a']}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.5, y: 0.5 }}
				>
					<View className="w-full h-full" />
				</LinearGradient>
			</View>

			{/* Main Content */}
			<View className="p-6 mt-36">
				<ScrollView>
					<View className="bg-white py-10 px-6 rounded-3xl">
						{/* Expense Label */}
						<Text className="text-xl text-gray-600 mb-2">Expense</Text>

						{/* Price Input */}
						<View className="flex-row border border-gray-300 rounded-lg mb-4">
							<Text className="px-4 py-4 text-xl text-gray-600">$</Text>
							<TextInput
								className="flex-1 px-4 py-4 text-xl"
								placeholder="Enter price"
								placeholderTextColor="#868788"
								value={formData.amount}
								onChangeText={(value) => handleInputChange('amount', value)}
								keyboardType="numeric"
							/>
						</View>

						{/* Category Picker */}
						<Text className="text-xl text-gray-600 mb-2">Category</Text>
						<View className="border border-gray-300 rounded-lg mb-4">
							<Picker
								selectedValue={formData.category}
								onValueChange={(value) => handleInputChange('category', value)}
							>
								<Picker.Item label="Select a category" value="" />
								<Picker.Item label="Food" value="Food" />
								<Picker.Item label="Transport" value="Transport" />
								<Picker.Item label="Shopping" value="Shopping" />
								<Picker.Item label="Entertainment" value="Entertainment" />
								<Picker.Item label="Bills" value="Bills" />
								<Picker.Item label="Other" value="Other" />
							</Picker>
						</View>

						{/* Description Input */}
						<Text className="text-xl text-gray-600 mb-2">Description</Text>
						<TextInput
							className="border border-gray-300 rounded-lg px-4 py-4 mb-4 text-xl"
							placeholder="Enter description (optional)"
							placeholderTextColor="#868788"
							value={formData.description}
							onChangeText={(value) => handleInputChange('description', value)}
						/>

						{/* Date Input */}
						<Text className="text-xl text-gray-600 mb-2">Date</Text>
						<TouchableOpacity
							className="border border-gray-300 rounded-lg px-4 py-4 mb-4"
							onPress={() => setShowDatePicker(true)}
						>
							<Text className="text-xl text-gray-700">
								{formData.date.toLocaleDateString()}
							</Text>
						</TouchableOpacity>

						{/* Submit Button */}
						<TouchableOpacity
							className="bg-blue-500 py-3 rounded-lg"
							onPress={handleSubmit}
						>
							<Text className="text-center text-white font-bold text-xl">
								Add Expense
							</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</View>

			{/* Modal for Date Picker */}
			<Modal
				animationType="fade"
				transparent
				visible={showDatePicker}
				onRequestClose={() => setShowDatePicker(false)}
			>
				<View className="flex-1 justify-end items-center bg-black/50">
					<View className="bg-white p-4 mb-20 rounded-lg shadow-lg w-11/12">
						<DateTimePicker
							value={formData.date}
							mode="date"
							display="spinner"
							onChange={handleDateChange}
						/>
						<TouchableOpacity
							className="bg-blue-500 mt-4 py-2 rounded-lg"
							onPress={() => setShowDatePicker(false)}
						>
							<Text className="text-white text-center font-bold text-lg">
								Close
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
			<Stack.Screen
				options={{
					headerTransparent: true,
					headerTitle: 'Expense',
					headerBackTitle: '',
					headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
					headerBackTitleStyle: { fontSize: 30 },
					headerTintColor: '#fff',
				}}
			/>
		</KeyboardAvoidingView>
	);
};

export default AddExpenseScreen;
