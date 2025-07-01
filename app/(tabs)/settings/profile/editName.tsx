import React, { useState, useEffect } from 'react';
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

export default function EditNameScreen() {
	const router = useRouter();
	const { profile, loading, error, updateProfile } = useProfile();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [originalFirstName, setOriginalFirstName] = useState('');
	const [originalLastName, setOriginalLastName] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Check if any changes have been made
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
		if (profile) {
			const fetchedFirstName = profile.firstName || '';
			const fetchedLastName = profile.lastName || '';
			setOriginalFirstName(fetchedFirstName);
			setOriginalLastName(fetchedLastName);
			setFirstName(fetchedFirstName);
			setLastName(fetchedLastName);
		}
	}, [profile]);

	const handleSaveChanges = async () => {
		// Check if there are any changes to save
		if (!hasAnyNameChanges) {
			return;
		}

		// Validate that both names are filled
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert('Error', 'Please fill in both first name and last name');
			return;
		}

		setIsLoading(true);
		try {
			// Always update both names together to ensure consistency
			await updateProfile({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
			});

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
		} catch (error) {
			console.error('Error updating name:', error);
			Alert.alert('Error', 'Failed to update name');
		} finally {
			setIsLoading(false);
		}
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#ff6b6b',
		marginTop: 16,
	},
	errorSubtext: {
		fontSize: 16,
		color: '#666',
		marginTop: 8,
	},
});
