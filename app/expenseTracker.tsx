import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
} from 'react-native';

const ExpenseTracker = () => {
	const [formData, setFormData] = useState({
		category: '',
		amount: '',
		description: '',
	});

	const handleInputChange = (field: string, value: string) => {
		if (field === 'amount') {
			// Allow only numeric input
			const numericValue = value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
			setFormData((prev) => ({ ...prev, [field]: numericValue }));
		} else {
			setFormData((prev) => ({ ...prev, [field]: value }));
		}
	};

	const handleSubmit = () => {
		console.log('Expense submitted:', formData);
	};

	return (
		<ScrollView className="p-4 bg-gray-100">
			<View className="bg-white p-6 rounded-lg shadow-md">
				{/* Large Amount Input with Dollar Sign */}
				<View className="flex-row justify-center items-center mb-6 gap-x-1 w-full bg-green-400 h-24">
					<Text className="text-7xl font-bold text-black">$</Text>
					<TextInput
						className="text-7xl font-bold text-left text-black border-gray-300 bg-red-400 h-full content-center"
						style={{
							height: 84, // Fixed height
							padding: 0, // Prevent extra padding
							textAlignVertical: 'center', // Center text vertically
						}}
						placeholder="0"
						placeholderTextColor="#4B5563"
						keyboardType="numeric"
						value={formData.amount}
						onChangeText={(value) => handleInputChange('amount', value)}
					/>
				</View>

				{/* Category Input */}
				<Text className="text-sm text-gray-600 mb-2">Category</Text>
				<TextInput
					className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
					placeholder="Enter category (e.g., Food)"
					placeholderTextColor="#4B5563"
					value={formData.category}
					onChangeText={(value) => handleInputChange('category', value)}
				/>

				{/* Description Input */}
				<Text className="text-sm text-gray-600 mb-2">Description</Text>
				<TextInput
					className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
					placeholder="Enter description (optional)"
					placeholderTextColor="#4B5563"
					value={formData.description}
					onChangeText={(value) => handleInputChange('description', value)}
				/>

				{/* Submit Button */}
				<TouchableOpacity
					className="bg-blue-500 py-3 rounded-lg"
					onPress={handleSubmit}
				>
					<Text className="text-center text-white font-bold text-lg">
						Add Expense
					</Text>
				</TouchableOpacity>
				
			</View>
		</ScrollView>
	);
};

export default ExpenseTracker;
