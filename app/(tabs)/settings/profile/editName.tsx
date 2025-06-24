import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Alert,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';

export default function EditNameScreen() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [originalFirstName, setOriginalFirstName] = useState('');
	const [originalLastName, setOriginalLastName] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Check if any changes have been made
	const hasChanges =
		firstName !== originalFirstName || lastName !== originalLastName;
	const hasFirstNameChanges = firstName !== originalFirstName;
	const hasLastNameChanges = lastName !== originalLastName;
	const hasAnyNameChanges = hasFirstNameChanges || hasLastNameChanges;

	// Validation function to allow only letters and spaces
	const validateName = (text: string) => {
		// Remove any non-letter characters (except spaces) and trim whitespace
		return text.replace(/[^a-zA-Z\s]/g, '').trim();
	};

	// Handle first name change with validation
	const handleFirstNameChange = (text: string) => {
		const validatedText = validateName(text);
		setFirstName(validatedText);
	};

	// Handle last name change with validation
	const handleLastNameChange = (text: string) => {
		const validatedText = validateName(text);
		setLastName(validatedText);
	};

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
				const fetchedFirstName = data.data.firstName || '';
				const fetchedLastName = data.data.lastName || '';
				setOriginalFirstName(fetchedFirstName);
				setOriginalLastName(fetchedLastName);
				setFirstName(fetchedFirstName);
				setLastName(fetchedLastName);
			}
		} catch (error) {
			setOriginalFirstName('Max');
			setOriginalLastName('Mustermann');
			setFirstName('Max');
			setLastName('Mustermann');
			console.error('Error fetching profile:', error);
		}
	};

	const handleSave = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert('Error', 'Please fill in both first name and last name');
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
						firstName: firstName.trim(),
						lastName: lastName.trim(),
					}),
				}
			);

			if (response.ok) {
				Alert.alert('Success', 'Name updated successfully', [
					{
						text: 'OK',
						onPress: () => {
							setOriginalFirstName(firstName.trim());
							setOriginalLastName(lastName.trim());
							router.back();
						},
					},
				]);
			} else {
				Alert.alert('Error', 'Failed to update name');
			}
		} catch (error) {
			console.error('Error updating name:', error);
			Alert.alert('Error', 'Failed to update name');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveChanges = async () => {
		// Check if there are any changes to save
		if (!hasAnyNameChanges) {
			return;
		}

		// Validate that both names are filled if either has changes
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert('Error', 'Please fill in both first name and last name');
			return;
		}

		setIsLoading(true);
		try {
			const updateData: any = {};

			// Only include fields that have actually changed
			if (hasFirstNameChanges) {
				updateData.firstName = firstName.trim();
			}
			if (hasLastNameChanges) {
				updateData.lastName = lastName.trim();
			}

			const response = await fetch(
				'http://localhost:3000/api/profiles/68431f0b700221021c84552a',
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}
			);

			if (response.ok) {
				Alert.alert('Success', 'Name updated successfully', [
					{
						text: 'OK',
						onPress: () => {
							setOriginalFirstName(firstName.trim());
							setOriginalLastName(lastName.trim());
							router.back();
						},
					},
				]);
			} else {
				Alert.alert('Error', 'Failed to update name');
			}
		} catch (error) {
			console.error('Error updating name:', error);
			Alert.alert('Error', 'Failed to update name');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Change First Name Section */}
					<View style={styles.editNameSection}>
						<Text style={styles.editNameTitle}>Change First Name</Text>

						<View style={styles.inputContainer}>
							{/* Current First Name Display
							<View style={styles.currentNameDisplay}>
								<Text style={styles.currentNameLabel}>Current First Name</Text>
								<Text style={styles.currentNameValue}>
									{originalFirstName || 'Not set'}
								</Text>
							</View>

							<Text style={styles.label}>New First Name</Text> */}
							<TextInput
								style={styles.input}
								value={firstName}
								onChangeText={handleFirstNameChange}
								placeholder="Enter new first name"
								placeholderTextColor="#999"
								autoCapitalize="words"
								autoCorrect={false}
							/>
						</View>
					</View>

					{/* Change Last Name Section */}
					<View style={styles.editNameSection}>
						<Text style={styles.editNameTitle}>Change Last Name</Text>

						<View style={styles.inputContainer}>
							{/* Current Last Name Display */}
							{/* <View style={styles.currentNameDisplay}>
								<Text style={styles.currentNameLabel}>Current Last Name</Text>
								<Text style={styles.currentNameValue}>
									{originalLastName || 'Not set'}
								</Text>
							</View>

							<Text style={styles.label}>New Last Name</Text> */}
							<TextInput
								style={styles.input}
								value={lastName}
								onChangeText={handleLastNameChange}
								placeholder="Enter new last name"
								placeholderTextColor="#999"
								autoCapitalize="words"
								autoCorrect={false}
							/>
						</View>
					</View>

					{/* Combined Save Button */}
					<RectButton
						style={[
							styles.saveButton,
							(isLoading || !hasAnyNameChanges) && styles.saveButtonDisabled,
						]}
						onPress={handleSaveChanges}
						enabled={!isLoading && hasAnyNameChanges}
					>
						<Text
							style={[
								styles.saveButtonText,
								(isLoading || !hasAnyNameChanges) &&
									styles.saveButtonTextDisabled,
							]}
						>
							{isLoading ? 'Saving...' : 'Update Name'}
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
	saveButton: {
		backgroundColor: '#0095FF',
		paddingVertical: 16,
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
	editNameSection: {
		marginBottom: 20,
	},
	editNameTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	currentNameDisplay: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
		padding: 12,
		backgroundColor: '#f8f9fa',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	currentNameLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#666',
	},
	currentNameValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
});
