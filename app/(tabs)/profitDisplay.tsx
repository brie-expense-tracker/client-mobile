import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Dimensions,
	Button,
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import ProfitLossGraph from '../components/ProfitLossGraph';
import MonthYearPickerModal from '../components/MonthYearPickerModal';
// Import a suitable graph component for React Native
// import ProfitLossGraph from './components/ProfitLossGraph';

const months = [
	{ name: 'January', number: 1 },
	{ name: 'February', number: 2 },
	{ name: 'March', number: 3 },
	{ name: 'April', number: 4 },
	{ name: 'May', number: 5 },
	{ name: 'June', number: 6 },
	{ name: 'July', number: 7 },
	{ name: 'August', number: 8 },
	{ name: 'September', number: 9 },
	{ name: 'October', number: 10 },
	{ name: 'November', number: 11 },
	{ name: 'December', number: 12 },
];

const screenWidth = Dimensions.get('window').width;

const profitDisplay: React.FC = () => {
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [profit, setProfit] = useState<number | null>(null);
	const [data, setData] = useState<
		{ name: string; Profit: number; Loss: number }[]
	>([]);
	const [date, setDate] = useState(new Date(year, month - 1));
	const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

	useEffect(() => {
		const fetchProfit = async () => {
			try {
				const response = await axios.get(
					`http://localhost:4000/api/profit/${year}/${month}`
				);
				setProfit(response.data.profit);
			} catch (error) {
				console.error('Error fetching profit:', error);
			}
		};
		fetchProfit();
	}, [year, month]);

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
				const profits = filteredTransactions.map(
					(transaction: { amount: number; type: string }) =>
						transaction.amount * (transaction.type === 'income' ? 1 : -1)
				);
				const totalProfit = profits.reduce(
					(acc: number, curr: number) => acc + (curr > 0 ? curr : 0),
					0
				);
				const totalLoss = profits.reduce(
					(acc: number, curr: number) => acc + (curr < 0 ? -curr : 0),
					0
				);
				setProfit(totalProfit - totalLoss);
				setData([
					{ name: 'Profit/Loss', Profit: totalProfit, Loss: totalLoss },
				]);
			} catch (error) {
				console.error('Error fetching transactions:', error);
			}
		};
		fetchTransactions();
	}, [year, month]);

	const showDatePicker = () => {
		setDatePickerVisibility(true);
	};

	const hideDatePicker = () => {
		setDatePickerVisibility(false);
	};

	const handleConfirm = (date: Date) => {
		setYear(date.getFullYear());
		setMonth(date.getMonth() + 1);
		hideDatePicker();
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Monthly Profit</Text>

			<View style={styles.pickerContainer}>
				<MonthYearPickerModal
					year={year}
					month={month}
					setYear={setYear}
					setMonth={setMonth}
				/>
			</View>

			{profit !== null && (
				<>
					<ProfitLossGraph data={data} />
					<Text style={styles.profitText}>
						{profit >= 0
							? `Profit for ${months[month - 1].name} ${year} : $${profit}`
							: `Loss for ${months[month - 1].name} ${year} : $${profit}`}
					</Text>
				</>
			)}
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
		flex: 1,
		marginRight: 10,
		paddingLeft: 8,
	},
	pickerContainer: {
		alignItems: 'center',
		marginBottom: 20,
	},
	pickerButton: {
		width: '100%',
		backgroundColor: '#f0f0f0',
		borderRadius: 10,
		padding: 5,
	},
	profitText: {
		fontSize: 16,
		color: '#4d4d4d',
		marginTop: 10,
	},
});

export default profitDisplay;
