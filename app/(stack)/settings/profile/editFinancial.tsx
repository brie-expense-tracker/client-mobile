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

export default function EditFinancialScreen() {
	const router = useRouter();
	const { profile, loading, error, updateProfile } = useProfile();
	const [monthlyIncome, setMonthlyIncome] = useState('');
	const [savings, setSavings] = useState('');
	const [debt, setDebt] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (profile) {
			setMonthlyIncome(profile.monthlyIncome?.toString() || '');
			setSavings(profile.savings?.toString() || '');
			setDebt(profile.debt?.toString() || '');
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
		const income = parseFloat(monthlyIncome) || 0;
		const savingsAmount = parseFloat(savings) || 0;
		const debtAmount = parseFloat(debt) || 0;

		if (income < 0 || savingsAmount < 0 || debtAmount < 0) {
			Alert.alert('Error', 'Please enter valid positive numbers');
			return;
		}

		setIsLoading(true);
		try {
			await updateProfile({
				monthlyIncome: income,
				savings: savingsAmount,
				debt: debtAmount,
			});

			Alert.alert('Success', 'Financial information updated successfully', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			logger.error('Error updating financial information:', error);
			Alert.alert('Error', 'Failed to update financial information');
		} finally {
			setIsLoading(false);
		}
	};

	const hasChanges = () => {
		const currentIncome = profile?.monthlyIncome || 0;
		const currentSavings = profile?.savings || 0;
		const currentDebt = profile?.debt || 0;

		const newIncome = parseFloat(monthlyIncome) || 0;
		const newSavings = parseFloat(savings) || 0;
		const newDebt = parseFloat(debt) || 0;

		return (
			newIncome !== currentIncome ||
			newSavings !== currentSavings ||
			newDebt !== currentDebt
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
					<Text style={styles.sectionTitle}>Financial Information</Text>

					{/* Monthly Income */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Monthly Income ($)</Text>
						<TextInput
							style={styles.input}
							value={monthlyIncome}
							onChangeText={(text) => setMonthlyIncome(formatCurrency(text))}
							placeholder="Enter monthly income"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>

					{/* Total Savings */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Total Savings ($)</Text>
						<TextInput
							style={styles.input}
							value={savings}
							onChangeText={(text) => setSavings(formatCurrency(text))}
							placeholder="Enter total savings"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>

					{/* Total Debt */}
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Total Debt ($)</Text>
						<TextInput
							style={styles.input}
							value={debt}
							onChangeText={(text) => setDebt(formatCurrency(text))}
							placeholder="Enter total debt"
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
							This information helps us provide better financial insights and
							recommendations.
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
		backgroundColor: '#ffffff',
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
