import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MonthYearPickerModal from '../components/MonthYearPickerModal';

interface Transaction {
	type: string;
	description: string;
	amount: number;
	date: string;
	_id: string;
}

const TransactionsScreen: React.FC = () => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);

	useEffect(() => {
		const fetchTransactions = async () => {
			try {
				const response = await axios.get(
					'http://localhost:4000/api/transactions'
				);
				const filteredTransactions = response.data.filter(
					(transaction: { date: string }) => {
						const transactionDate = new Date(transaction.date);
						return (
							transactionDate.getFullYear() === year &&
							transactionDate.getMonth() + 1 === month
						);
					}
				);
				setTransactions(filteredTransactions);
			} catch (error) {
				console.error('Error fetching transactions:', error);
				Alert.alert('Error', 'Failed to fetch transactions');
			}
		};
		fetchTransactions();
	}, [year, month]);

	const handleDelete = async (id: string) => {
		try {
			await axios.delete(`http://localhost:4000/api/transactions/${id}`);
			setTransactions(
				transactions.filter((transaction) => transaction._id !== id)
			);
		} catch (error) {
			console.error('Error deleting transaction:', error);
			Alert.alert('Error', 'Failed to delete transaction');
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Transactions</Text>
			<View style={styles.pickerContainer}>
				<MonthYearPickerModal
					year={year}
					month={month}
					setYear={setYear}
					setMonth={setMonth}
				/>
			</View>
			<View style={styles.listContainer}>
				<FlatList
					data={transactions}
					keyExtractor={(item) => item._id}
					renderItem={({ item }) => (
						<View style={styles.transactionItem}>
							<View style={styles.transactionDetails}>
								<Text style={styles.transactionDate}>
									{new Date(item.date).toISOString().split('T')[0]}
								</Text>
								<Text style={styles.transactionText}>
									{item.type.charAt(0).toUpperCase() + item.type.slice(1)}
								</Text>
								<Text style={styles.transactionDescription}>
									{item.description}
								</Text>
								<Text style={styles.transactionAmount}>${item.amount}</Text>
							</View>
							<View style={styles.trashContainer}>
								<TouchableOpacity onPress={() => handleDelete(item._id)}>
									<Ionicons name="trash" size={20} color="#dddddd" />
								</TouchableOpacity>
							</View>
						</View>
					)}
					contentContainerStyle={styles.listContent}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'column',
		backgroundColor: '#fdfdfd',
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	pickerContainer: {
		marginBottom: 20,
		width: '100%',
		alignItems: 'center',
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#d8d8d8',
		paddingVertical: 10,
	},
	transactionDate: {
		flex: 1,
		marginRight: 20,
		textAlign: 'left',
		fontSize: 14,
	},
	transactionAmount: {
		flex: 1,
		textAlign: 'right',
	},
	transactionText: {
		flex: 1,
		fontSize: 14,
	},
	transactionDescription: {
		flex: 1,
	},
	trashContainer: {
		padding: 0,
		textAlign: 'right',
	},
	listContent: {
		paddingBottom: 20,
	},
	listContainer: {
		width: '100%',
		backgroundColor: '#fdfdfd',
		height: '100%',
	},
	transactionDetails: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
});

export default TransactionsScreen;
