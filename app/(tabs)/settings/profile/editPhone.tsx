import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Alert,
	ScrollView,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function EditPhoneScreen() {
	const router = useRouter();
	const [phone, setPhone] = useState('');
	const [currentPhone, setCurrentPhone] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const response = await fetch(
				'http://localhost:3000/api/profiles/68431f0b700221021c84552a'
			);
			if (response.ok) {
				const data = await response.json();
				const phoneNumber = data.data.phone || '';
				console.log('Current phone number:', phoneNumber);
				setCurrentPhone(phoneNumber);
				// Don't set phone initially so placeholder shows current phone number
			}
		} catch (error) {
			console.error('Error fetching profile:', error);
		}
	};

	const validatePhone = (phone: string) => {
		// Remove all non-digit characters for validation
		const digitsOnly = phone.replace(/\D/g, '');
		// Check if it has 10-15 digits (international format)
		return digitsOnly.length >= 10 && digitsOnly.length <= 15;
	};

	const formatPhoneNumber = (text: string) => {
		// Remove all non-digit characters
		let digitsOnly = text.replace(/\D/g, '');

		// Limit to 15 digits (international standard)
		if (digitsOnly.length > 15) {
			digitsOnly = digitsOnly.slice(0, 15);
		}

		// Format based on length
		if (digitsOnly.length <= 3) {
			return `(${digitsOnly}`;
		} else if (digitsOnly.length <= 6) {
			return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
		} else if (digitsOnly.length <= 10) {
			return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
				3,
				6
			)}-${digitsOnly.slice(6)}`;
		} else {
			// For longer numbers, just add spaces every 3 digits
			return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
		}
	};

	const handlePhoneChange = (text: string) => {
		// Check if input exceeds 15 digits
		const digitsOnly = text.replace(/\D/g, '');
		if (digitsOnly.length > 15) {
			return; // Don't update state if more than 15 digits
		}

		const formatted = formatPhoneNumber(text);
		setPhone(formatted);
	};

	const handleSave = async () => {
		if (!phone.trim()) {
			Alert.alert('Error', 'Please enter your phone number');
			return;
		}

		if (!validatePhone(phone.trim())) {
			Alert.alert('Error', 'Please enter a valid phone number');
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(
				'http://localhost:3000/api/profiles/68431f0b700221021c84552a',
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						phone: phone.trim(),
					}),
				}
			);

			if (response.ok) {
				Alert.alert('Success', 'Phone number updated successfully', [
					{
						text: 'OK',
						onPress: () => router.back(),
					},
				]);
			} else {
				Alert.alert('Error', 'Failed to update phone number');
			}
		} catch (error) {
			console.error('Error updating phone number:', error);
			Alert.alert('Error', 'Failed to update phone number');
		} finally {
			setIsLoading(false);
		}
	};

	// Check if the save button should be enabled
	const isSaveButtonEnabled = () => {
		const trimmedPhone = phone.trim();
		const trimmedCurrentPhone = currentPhone.trim();

		// Button is enabled if:
		// 1. Phone number is not empty
		// 2. Phone number is valid
		// 3. Phone number is different from current phone number
		// 4. Not currently loading
		return (
			trimmedPhone.length > 0 &&
			validatePhone(trimmedPhone) &&
			trimmedPhone !== trimmedCurrentPhone &&
			!isLoading
		);
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					<Text style={styles.sectionTitle}>Phone Number</Text>

					{/* Current Phone Number Section */}
					<View style={styles.currentPhoneContainer}>
						<Text style={styles.currentPhoneLabel}>Current Phone Number</Text>
						<View style={styles.currentPhoneDisplay}>
							<Text style={styles.currentPhoneText}>
								{currentPhone || 'No phone number set'}
							</Text>
						</View>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>New Phone Number</Text>
						<TextInput
							style={styles.input}
							value={phone}
							onChangeText={handlePhoneChange}
							placeholder={currentPhone || 'Enter your phone number'}
							placeholderTextColor="#999"
							keyboardType="phone-pad"
							autoComplete="tel"
						/>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={20}
							color="#666"
						/>
						<Text style={styles.infoText}>
							Your phone number will be used for account verification and
							important notifications.
						</Text>
					</View>

					<RectButton
						style={[
							styles.saveButton,
							!isSaveButtonEnabled() && styles.saveButtonDisabled,
						]}
						onPress={handleSave}
						enabled={isSaveButtonEnabled()}
					>
						<Text
							style={[
								styles.saveButtonText,
								!isSaveButtonEnabled() && styles.saveButtonTextDisabled,
							]}
						>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Text>
					</RectButton>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		flex: 1,
	},
	formContainer: {
		padding: 16,
	},
	sectionTitle: {
		fontSize: 20,
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
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: '#333',
		backgroundColor: '#fff',
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f8f9fa',
		padding: 16,
		borderRadius: 8,
		marginTop: 8,
	},
	infoText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
		flex: 1,
		lineHeight: 20,
	},
	saveButton: {
		backgroundColor: '#0095FF',
		paddingVertical: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
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
	currentPhoneContainer: {
		marginBottom: 20,
	},
	currentPhoneLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 8,
	},
	currentPhoneDisplay: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		backgroundColor: '#f8f9fa',
	},
	currentPhoneText: {
		fontSize: 16,
		color: '#333',
	},
});
