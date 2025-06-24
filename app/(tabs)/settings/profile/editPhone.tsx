import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Alert,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function EditPhoneScreen() {
	const router = useRouter();
	const [phone, setPhone] = useState('');
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
				setPhone(data.data.phone || '');
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
		const digitsOnly = text.replace(/\D/g, '');

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

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					<Text style={styles.sectionTitle}>Phone Number</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Phone Number</Text>
						<TextInput
							style={styles.input}
							value={phone}
							onChangeText={handlePhoneChange}
							placeholder="Enter your phone number"
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

					<TouchableOpacity
						style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
						onPress={handleSave}
						disabled={isLoading}
					>
						<Text
							style={[
								styles.saveButtonText,
								isLoading && styles.saveButtonTextDisabled,
							]}
						>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Text>
					</TouchableOpacity>
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
});
