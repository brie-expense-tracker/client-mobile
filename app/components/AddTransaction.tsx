import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	TouchableOpacity,
	ScrollView,
	Modal,
	Pressable,
} from 'react-native';
import axios from 'axios';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AddTransactionProps {
	visible: boolean;
	onClose: () => void;
}

interface FloatingActionButtonProps {
	color: string;
	name: string;
	onPress?: () => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({
	visible,
	onClose,
}) => {
	const [transaction, setTransaction] = useState({
		type: 'income',
		description: '',
		amount: '',
		category: '',
		date: new Date().toISOString().split('T')[0],
	});

	const router = useRouter();
	const amountInputRef = useRef<TextInput>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	useEffect(() => {
		if (amountInputRef.current) {
			amountInputRef.current.setNativeProps({
				selection: {
					start: transaction.amount.length,
					end: transaction.amount.length,
				},
			});
		}
	}, [transaction.amount]);

	const handleMadeSubmit = async () => {
		try {
			const response = await axios.post(
				'http://localhost:3000/api/transactions',
				transaction
			);
			console.log('Transaction saved:', response.data);
			setTransaction({
				type: 'income',
				description: '',
				amount: '',
				category: '',
				date: new Date().toISOString().split('T')[0],
			});
			Alert.alert('Success', 'Transaction saved successfully!');
			onClose();
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	const handleSpentSubmit = async () => {
		try {
			const response = await axios.post(
				'http://localhost:3000/api/transactions',
				transaction
			);
			console.log('Transaction saved:', response.data);
			setTransaction({
				type: 'expense',
				description: '',
				amount: '',
				category: '',
				date: new Date().toISOString().split('T')[0],
			});
			Alert.alert('Success', 'Transaction saved successfully!');
			onClose();
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	const mockTags = [
		'Groceries',
		'Utilities',
		'Entertainment',
		'Travel',
		'Health',
	];

	const toggleCategorySelection = (category: string) => {
		setSelectedCategory((prevSelectedCategory) =>
			prevSelectedCategory === category ? null : category
		);
		setTransaction({ ...transaction, category: category });
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<View style={styles.handle} />
					<View style={styles.mainContainer}>
						<View style={styles.topContainer}>
							<TouchableOpacity style={styles.closeButton} onPress={onClose}>
								<Ionicons name="close" size={24} color="#000" />
							</TouchableOpacity>
							<View style={styles.inputAmountContainer}>
								<FontAwesome
									name="dollar"
									size={24}
									color="black"
									style={styles.dollarIcon}
								/>
								<TextInput
									ref={amountInputRef}
									style={styles.inputAmount}
									placeholder="0"
									placeholderTextColor={'#000000'}
									value={transaction.amount}
									onChangeText={(text) =>
										setTransaction({ ...transaction, amount: text })
									}
									showSoftInputOnFocus={false}
								/>
							</View>
							<View style={styles.carouselContainer}>
								<ScrollView horizontal showsHorizontalScrollIndicator={false}>
									{mockTags.map((category, index) => (
										<TouchableOpacity
											key={index}
											onPress={() => toggleCategorySelection(category)}
											style={[
												styles.carouselText,
												selectedCategory === category && styles.selectedTag,
											]}
										>
											<Text>{category}</Text>
										</TouchableOpacity>
									))}
									<TouchableOpacity
										onPress={() => console.log('Add Category Pressed')}
										style={styles.addCategoryButton}
									>
										<Ionicons
											name="add-circle-outline"
											size={24}
											color="grey"
										/>
									</TouchableOpacity>
								</ScrollView>
							</View>
							<TextInput
								style={styles.inputDescription}
								placeholder="What's this for?"
								placeholderTextColor={'#a3a3a3'}
								value={transaction.description}
								onChangeText={(text) =>
									setTransaction({ ...transaction, description: text })
								}
							/>

							<View style={styles.fabsContainer}>
								<View style={styles.fabContainer}>
									<FloatingActionButton
										name="Spent"
										color="#4fa166"
										onPress={handleSpentSubmit}
									/>
								</View>
								<View style={styles.fabContainer}>
									<FloatingActionButton
										name="Made"
										color="#429c5b"
										onPress={handleMadeSubmit}
									/>
								</View>
							</View>
						</View>
						<View style={styles.topNumPadContainer}>
							<NumberPad
								onValueChange={(value: string) =>
									setTransaction((prev) => ({ ...prev, amount: value }))
								}
							/>
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const FloatingActionButton: React.FC<
	FloatingActionButtonProps & { onPress?: () => void }
> = ({ color, name, onPress = () => console.log(`${name} FAB Pressed`) }) => (
	<TouchableOpacity
		style={[styles.fab, { backgroundColor: color }]}
		onPress={onPress}
	>
		<Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
			{name}
		</Text>
	</TouchableOpacity>
);

const NumberPad: React.FC<{ onValueChange: (value: string) => void }> = ({
	onValueChange,
}) => {
	const [value, setValue] = useState('');

	const handlePress = (num: string) => {
		setValue((prev) => {
			let newValue = prev + num;
			if (newValue.includes('.')) {
				const [integer, decimal] = newValue.split('.');
				newValue = integer + '.' + decimal.slice(0, 2);
			}
			newValue = newValue.slice(-9);
			onValueChange(newValue);
			return newValue;
		});
	};

	const handleBackspace = () => {
		setValue((prev) => {
			const newValue = prev.slice(0, -1);
			onValueChange(newValue);
			return newValue;
		});
	};

	return (
		<View style={styles.numPadContainer}>
			<View style={styles.numPadRow}>
				{[1, 2, 3].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.numPadRow}>
				{[4, 5, 6].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.numPadRow}>
				{[7, 8, 9].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.numPadRow}>
				<TouchableOpacity
					style={styles.buttonNumDark}
					onPress={() => handlePress('.')}
				>
					<Text style={styles.buttonText}>.</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonNumLight}
					onPress={() => handlePress('0')}
				>
					<Text style={styles.buttonText}>0</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonNumDark}
					onPress={handleBackspace}
				>
					<Text style={styles.buttonText}>⌫</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#f9f9f9',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		height: '90%',
	},
	handle: {
		width: 40,
		height: 5,
		backgroundColor: '#d0d3da',
		borderRadius: 3,
		alignSelf: 'center',
		marginTop: 10,
		marginBottom: 10,
	},
	container: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	mainContainer: {
		flex: 1,
		justifyContent: 'space-between',
		backgroundColor: '#f9f9f9',
	},
	topContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		padding: 20,
		paddingBottom: 10,
	},
	closeButton: {
		position: 'absolute',
		top: 0,
		right: 20,
		zIndex: 1,
		padding: 8,
	},
	inputAmountContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
	},
	dollarIcon: {
		marginRight: 6,
		height: 40,
	},
	inputAmount: {
		fontSize: 80,
		fontWeight: 'bold',
		textAlign: 'left',
	},
	inputDescription: {
		height: 50,
		fontSize: 20,
		color: '#000000',
		borderColor: '#a3a3a3',
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 10,
		paddingLeft: 8,
	},
	fabsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
	},
	fabContainer: {
		flex: 1,
	},
	fab: {
		width: '100%',
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 24,
	},
	topNumPadContainer: {
		backgroundColor: '#d0d3da',
		padding: 5,
		paddingTop: 10,
		paddingBottom: 40,
	},
	numPadContainer: {
		justifyContent: 'center',
	},
	buttonNumLight: {
		flex: 1,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		backgroundColor: '#ffffff',
		borderRadius: 5,
	},
	buttonNumDark: {
		flex: 1,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		backgroundColor: '#a8b1ba',
		borderRadius: 5,
	},
	buttonText: {
		fontSize: 24,
		color: '#333',
	},
	numPadRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	carouselContainer: {
		marginBottom: 10,
	},
	carouselText: {
		fontSize: 16,
		marginHorizontal: 5,
		color: '#333',
		padding: 8,
		justifyContent: 'center',
	},
	selectedTag: {
		backgroundColor: '#d0d3da',
		borderRadius: 8,
		padding: 8,
	},
	addCategoryButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default AddTransaction;
