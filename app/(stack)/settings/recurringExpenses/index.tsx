import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import RecurringExpensesList from '../../../(tabs)/dashboard/components/RecurringExpensesList';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../../../../src/services/recurringExpenseService';

const RecurringExpensesScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [detectingPatterns, setDetectingPatterns] = useState(false);

	const onRefresh = async () => {
		setRefreshing(true);
		// The RecurringExpensesList component will handle its own refresh
		setTimeout(() => setRefreshing(false), 1000);
	};

	const handleDetectPatterns = async () => {
		try {
			setDetectingPatterns(true);
			const patterns = await RecurringExpenseService.detectRecurringPatterns();

			if (patterns.length > 0) {
				Alert.alert(
					'Pattern Detection Complete',
					`Found ${patterns.length} recurring patterns in your transactions.`,
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert(
					'No Patterns Found',
					'No recurring patterns were detected. Add more transactions to improve detection.',
					[{ text: 'OK' }]
				);
			}
		} catch (error) {
			console.error(
				'[RecurringExpensesScreen] Error detecting patterns:',
				error
			);
			Alert.alert('Error', 'Failed to detect recurring patterns');
		} finally {
			setDetectingPatterns(false);
		}
	};

	const handleExpensePress = (expense: RecurringExpense) => {
		Alert.alert(
			expense.vendor,
			`Amount: $${expense.amount.toFixed(
				2
			)}\nFrequency: ${RecurringExpenseService.formatFrequency(
				expense.frequency
			)}\nNext Due: ${new Date(
				expense.nextExpectedDate
			).toLocaleDateString()}\nConfidence: ${RecurringExpenseService.formatConfidence(
				expense.confidence
			)}`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'View Transactions',
					onPress: () => {
						// Navigate to transaction list filtered by this pattern
						console.log('View transactions for pattern:', expense.patternId);
					},
				},
			]
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#333" />
				</TouchableOpacity>
				<Text style={styles.title}>Recurring Expenses</Text>
				<TouchableOpacity
					onPress={handleDetectPatterns}
					style={styles.detectButton}
					disabled={detectingPatterns}
				>
					{detectingPatterns ? (
						<Ionicons name="refresh" size={20} color="#007ACC" />
					) : (
						<Ionicons name="search" size={20} color="#007ACC" />
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				<View style={styles.infoCard}>
					<Ionicons name="information-circle" size={24} color="#007ACC" />
					<Text style={styles.infoTitle}>How it works</Text>
					<Text style={styles.infoText}>
						We automatically detect recurring expenses by analyzing your
						transaction patterns. The more transactions you add, the better our
						detection becomes.
					</Text>
				</View>

				<RecurringExpensesList
					title="All Recurring Expenses"
					showUpcomingOnly={false}
					onExpensePress={handleExpensePress}
				/>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	backButton: {
		padding: 5,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	detectButton: {
		padding: 5,
	},
	content: {
		flex: 1,
	},
	infoCard: {
		backgroundColor: '#f8f9fa',
		marginHorizontal: 20,
		marginVertical: 16,
		padding: 16,
		borderRadius: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#007ACC',
	},
	infoTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginTop: 8,
		marginBottom: 4,
	},
	infoText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
});

export default RecurringExpensesScreen;
