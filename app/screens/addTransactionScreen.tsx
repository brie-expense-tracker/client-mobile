import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import MonthYearPickerModal from './components/MonthYearPickerModal';
import MonthYearDayPickerModal from './components/MonthYearDayPickerModal';

const addTransactionScreen = () => {
	const [transaction, setTransaction] = useState({
		type: 'income',
		description: '',
		amount: '',
		date: new Date().toISOString().split('T')[0],
	});

	const [successMessage, setSuccessMessage] = useState('');

	const handleTransactionSubmit = async () => {
		try {
			const response = await axios.post(
				'http://localhost:4000/api/transactions',
				transaction
			);
			console.log('Transaction saved:', response.data);
			setTransaction({
				type: 'income',
				description: '',
				amount: '',
				date: new Date().toISOString().split('T')[0],
			});
			setSuccessMessage('Transaction saved successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Expense Tracker</Text>
			<Picker
				selectedValue={transaction.type}
				onValueChange={(itemValue) =>
					setTransaction({ ...transaction, type: itemValue })
				}
			>
				<Picker.Item label="Income" value="income" />
				<Picker.Item label="Expense" value="expense" />
			</Picker>
			<TextInput
				style={styles.input}
				placeholder="Description"
				value={transaction.description}
				onChangeText={(text) =>
					setTransaction({ ...transaction, description: text })
				}
			/>
			<TextInput
				style={styles.input}
				placeholder="Amount"
				keyboardType="numeric"
				value={transaction.amount}
				onChangeText={(text) =>
					setTransaction({ ...transaction, amount: text })
				}
			/>
			<MonthYearDayPickerModal
				year={new Date(transaction.date).getFullYear()}
				month={new Date(transaction.date).getMonth() + 1}
				day={new Date(transaction.date).getDate()}
				setYear={(year) =>
					setTransaction({
						...transaction,
						date: new Date(
							year,
							new Date(transaction.date).getMonth(),
							new Date(transaction.date).getDate()
						)
							.toISOString()
							.split('T')[0],
					})
				}
				setMonth={(month) =>
					setTransaction({
						...transaction,
						date: new Date(
							new Date(transaction.date).getFullYear(),
							month - 1,
							new Date(transaction.date).getDate()
						)
							.toISOString()
							.split('T')[0],
					})
				}
				setDay={(day) =>
					setTransaction({
						...transaction,
						date: new Date(
							new Date(transaction.date).getFullYear(),
							new Date(transaction.date).getMonth(),
							day
						)
							.toISOString()
							.split('T')[0],
					})
				}
			/>
			<Button title="Save Transaction" onPress={handleTransactionSubmit} />
			{successMessage ? (
				<Text style={styles.success}>{successMessage}</Text>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fdfdfd',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	input: {
		height: 40,
		borderColor: 'gray',
		borderWidth: 1,
		marginBottom: 10,
		paddingLeft: 8,
	},
	success: {
		color: 'green',
		marginTop: 10,
	},
});

export default addTransactionScreen;
