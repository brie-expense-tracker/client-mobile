import React, { useState, useEffect } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Alert,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import { useProfile } from '../../../../src/context/profileContext';

export default function EditExpensesScreen() {
	const router = useRouter();
	const { profile, loading, error, updateProfile } = useProfile();
	const [housing, setHousing] = useState('');
	const [loans, setLoans] = useState('');
	const [subscriptions, setSubscriptions] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (profile && profile.expenses) {
			setHousing(profile.expenses.housing?.toString() || '');
			setLoans(profile.expenses.loans?.toString() || '');
			setSubscriptions(profile.expenses.subscriptions?.toString() || '');
		}
	}, [profile]);

	const formatCurrency = (value: string) => {
		// Remove any non-digit characters except decimal point
		const cleaned = value.replace(/[^\d.]/g, '');
		// Ensure only one decimal point
		const parts = cleaned.split('.');
		if (parts.length > 2) {
			return parts[0] + '.' + parts.slice(1).join('');
		}
		return cleaned;
	};

	const handleSave = async () => {
		const housingAmount = parseFloat(housing) || 0;
		const loansAmount = parseFloat(loans) || 0;
		const subscriptionsAmount = parseFloat(subscriptions) || 0;

		if (housingAmount < 0 || loansAmount < 0 || subscriptionsAmount < 0) {
			Alert.alert('Error', 'Please enter valid positive numbers');
			return;
		}

		setIsLoading(true);
		try {
			await updateProfile({
				expenses: {
					housing: housingAmount,
					loans: loansAmount,
					subscriptions: subscriptionsAmount,
				},
			});

			Alert.alert('Success', 'Expense information updated successfully', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			logger.error('Error updating expense information:', error);
			Alert.alert('Error', 'Failed to update expense information');
		} finally {
			setIsLoading(false);
		}
	};

	const hasChanges = () => {
		const currentHousing = profile?.expenses?.housing || 0;
		const currentLoans = profile?.expenses?.loans || 0;
		const currentSubscriptions = profile?.expenses?.subscriptions || 0;

		const newHousing = parseFloat(housing) || 0;
		const newLoans = parseFloat(loans) || 0;
		const newSubscriptions = parseFloat(subscriptions) || 0;

		return (
			newHousing !== currentHousing ||
			newLoans !== currentLoans ||
			newSubscriptions !== currentSubscriptions
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0095FF" />
				<Text style={styles.loadingText}>Loading profile...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
				<Text style={styles.errorText}>Failed to load profile</Text>
				<Text style={styles.errorSubtext}>{error}</Text>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="person-outline" size={48} color="#999" />
				<Text style={styles.errorText}>No profile found</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					<Text style={styles.sectionTitle}>Expense Information</Text>

					{/* Housing Expenses */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Housing Expenses ($)</Text>
						<TextInput
							style={styles.input}
							value={housing}
							onChangeText={(text) => setHousing(formatCurrency(text))}
							placeholder="Enter housing expenses"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>

					{/* Loan Expenses */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Loan Expenses ($)</Text>
						<TextInput
							style={styles.input}
							value={loans}
							onChangeText={(text) => setLoans(formatCurrency(text))}
							placeholder="Enter loan expenses"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>

					{/* Subscription Expenses */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Subscription Expenses ($)</Text>
						<TextInput
							style={styles.input}
							value={subscriptions}
							onChangeText={(text) => setSubscriptions(formatCurrency(text))}
							placeholder="Enter subscription expenses"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={20}
							color="#666"
						/>
						<Text style={styles.infoText}>
							Track your monthly expenses to better understand your spending
							patterns and improve your financial planning.
						</Text>
					</View>

					<RectButton
						style={[
							styles.saveButton,
							(!hasChanges() || isLoading) && styles.saveButtonDisabled,
						]}
						onPress={handleSave}
						enabled={hasChanges() && !isLoading}
					>
						{isLoading ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<Text
								style={[
									styles.saveButtonText,
									(!hasChanges() || isLoading) && styles.saveButtonTextDisabled,
								]}
							>
								Save Changes
							</Text>
						)}
					</RectButton>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	content: {
		flex: 1,
	},
	formContainer: {
		padding: 20,
	},
	sectionTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#333',
		marginBottom: 24,
	},
	inputContainer: {
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 16,
		fontSize: 16,
		color: '#333',
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#e3f2fd',
		padding: 16,
		borderRadius: 8,
		marginBottom: 24,
	},
	infoText: {
		flex: 1,
		marginLeft: 8,
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	saveButton: {
		backgroundColor: '#0095FF',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
	},
	saveButtonDisabled: {
		backgroundColor: '#ccc',
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	saveButtonTextDisabled: {
		color: '#999',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingHorizontal: 32,
	},
	errorText: {
		marginTop: 16,
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		textAlign: 'center',
	},
	errorSubtext: {
		marginTop: 8,
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},
});
