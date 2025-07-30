import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	Button,
	StyleSheet,
	Alert,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import MonthYearPickerModal from './components/MonthYearPickerModal';
import MonthYearDayPickerModal from './components/MonthYearDayPickerModal';
import {
	AICategorizationService,
	CategorizationSuggestion,
} from '../../src/services/aiCategorizationService';

const addTransactionScreen = () => {
	const [transaction, setTransaction] = useState({
		type: 'income',
		description: '',
		amount: '',
		date: new Date().toISOString().split('T')[0],
	});

	const [successMessage, setSuccessMessage] = useState('');
	const [suggestions, setSuggestions] = useState<CategorizationSuggestion[]>(
		[]
	);
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);
	const [selectedSuggestion, setSelectedSuggestion] =
		useState<CategorizationSuggestion | null>(null);

	// Get AI suggestions when description changes
	useEffect(() => {
		if (
			transaction.description.length > 3 &&
			transaction.amount &&
			transaction.type === 'expense'
		) {
			getCategorizationSuggestions();
		} else {
			setSuggestions([]);
			setSelectedSuggestion(null);
		}
	}, [transaction.description, transaction.amount]);

	const getCategorizationSuggestions = async () => {
		try {
			setLoadingSuggestions(true);
			const result = await AICategorizationService.categorizeNewTransaction(
				transaction.description,
				parseFloat(transaction.amount),
				transaction.type as 'income' | 'expense'
			);

			if (result) {
				// Convert to suggestions format
				const newSuggestions: CategorizationSuggestion[] = [];
				if (result.aiSuggestion.confidence > 0.5) {
					newSuggestions.push({
						type: 'ai',
						category: result.aiSuggestion.suggestedCategory,
						confidence: result.aiSuggestion.confidence,
						reason: result.aiSuggestion.reason,
						budget: result.bestBudget,
					});
				}
				setSuggestions(newSuggestions);
			}
		} catch (error) {
			console.error('[AddTransactionScreen] Error getting suggestions:', error);
		} finally {
			setLoadingSuggestions(false);
		}
	};

	const handleSuggestionPress = (suggestion: CategorizationSuggestion) => {
		setSelectedSuggestion(suggestion);
		// You could auto-fill budget information here if needed
	};

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
			setSuggestions([]);
			setSelectedSuggestion(null);
			setSuccessMessage('Transaction saved successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	const renderSuggestion = (
		suggestion: CategorizationSuggestion,
		index: number
	) => {
		const isSelected = selectedSuggestion?.category === suggestion.category;
		const confidenceColor = AICategorizationService.getConfidenceColor(
			suggestion.confidence
		);
		const typeColor = AICategorizationService.getSuggestionTypeColor(
			suggestion.type
		);

		return (
			<TouchableOpacity
				key={index}
				style={[styles.suggestionItem, isSelected && styles.selectedSuggestion]}
				onPress={() => handleSuggestionPress(suggestion)}
			>
				<View style={styles.suggestionHeader}>
					<Text style={styles.suggestionCategory}>{suggestion.category}</Text>
					<Text style={[styles.confidenceText, { color: confidenceColor }]}>
						{AICategorizationService.formatConfidence(suggestion.confidence)}
					</Text>
				</View>
				<View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
					<Ionicons
						name={AICategorizationService.getSuggestionTypeIcon(
							suggestion.type
						)}
						size={12}
						color="#fff"
					/>
					<Text style={styles.typeText}>
						{AICategorizationService.formatSuggestionType(suggestion.type)}
					</Text>
				</View>
				<Text style={styles.reasonText}>{suggestion.reason}</Text>
			</TouchableOpacity>
		);
	};

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Add Transaction</Text>

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

			{/* AI Categorization Suggestions */}
			{transaction.type === 'expense' && transaction.description.length > 3 && (
				<View style={styles.suggestionsContainer}>
					<View style={styles.suggestionsHeader}>
						<Ionicons name="brain" size={20} color="#007ACC" />
						<Text style={styles.suggestionsTitle}>AI Suggestions</Text>
						{loadingSuggestions && (
							<ActivityIndicator size="small" color="#007ACC" />
						)}
					</View>

					{suggestions.length > 0 ? (
						suggestions.map(renderSuggestion)
					) : (
						<Text style={styles.noSuggestionsText}>
							{loadingSuggestions ? 'Analyzing...' : 'No suggestions available'}
						</Text>
					)}
				</View>
			)}

			<Button title="Save Transaction" onPress={handleTransactionSubmit} />

			{successMessage ? (
				<Text style={styles.successMessage}>{successMessage}</Text>
			) : null}
		</ScrollView>
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
	suggestionsContainer: {
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		padding: 10,
		marginTop: 10,
		marginBottom: 10,
	},
	suggestionsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 5,
	},
	suggestionsTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
		marginLeft: 5,
	},
	noSuggestionsText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		padding: 10,
	},
	suggestionItem: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 8,
		marginBottom: 5,
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 1,
		elevation: 1,
	},
	selectedSuggestion: {
		borderWidth: 1,
		borderColor: '#007ACC',
		backgroundColor: '#e0f7fa',
	},
	suggestionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 5,
	},
	suggestionCategory: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#007ACC',
	},
	confidenceText: {
		fontSize: 12,
	},
	typeBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 5,
		marginTop: 5,
	},
	typeText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: 'bold',
		marginLeft: 5,
	},
	reasonText: {
		fontSize: 12,
		color: '#555',
		marginTop: 5,
	},
	successMessage: {
		color: 'green',
		marginTop: 10,
		textAlign: 'center',
	},
});

export default addTransactionScreen;
