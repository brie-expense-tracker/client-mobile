import React, { useState } from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Button, View, StyleSheet } from 'react-native';

interface MonthYearDayPickerModalProps {
	year: number;
	month: number;
	day: number;
	setYear: (year: number) => void;
	setMonth: (month: number) => void;
	setDay: (day: number) => void;
}

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

const MonthYearDayPickerModal: React.FC<MonthYearDayPickerModalProps> = ({
	year,
	month,
	day,
	setYear,
	setMonth,
	setDay,
}) => {
	const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

	const showDatePicker = () => {
		setDatePickerVisibility(true);
	};

	const hideDatePicker = () => {
		setDatePickerVisibility(false);
	};

	const handleConfirm = (date: Date) => {
		setYear(date.getFullYear());
		setMonth(date.getMonth() + 1);
		setDay(date.getDate());
		hideDatePicker();
	};

	return (
		<View style={styles.pickerContainer}>
			<View style={styles.pickerButton}>
				<Button
					title={`${months[month - 1].name} ${day}, ${year}`}
					onPress={showDatePicker}
					color="#2b2b2b"
				/>
			</View>
			<DateTimePickerModal
				isVisible={isDatePickerVisible}
				mode="date"
				onConfirm={handleConfirm}
				onCancel={hideDatePicker}
				display="spinner"
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	pickerContainer: {
		alignItems: 'center',
		marginBottom: 10,
		width: '100%',
	},
	pickerButton: {
		width: '100%',
		backgroundColor: '#f0f0f0',
		borderRadius: 10,
		padding: 5,
	},
});

export default MonthYearDayPickerModal;
{
	/* <MonthYearDayPickerModal
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
			/> */
}
