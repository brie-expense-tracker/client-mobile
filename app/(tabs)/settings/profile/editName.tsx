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

export default function EditNameScreen() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
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
				setFirstName(data.data.firstName || '');
				setLastName(data.data.lastName || '');
			}
		} catch (error) {
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
						onPress: () => router.back(),
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
					<Text style={styles.sectionTitle}>Personal Information</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>First Name</Text>
						<TextInput
							style={styles.input}
							value={firstName}
							onChangeText={setFirstName}
							placeholder="Enter your first name"
							placeholderTextColor="#999"
							autoCapitalize="words"
							autoCorrect={false}
						/>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Last Name</Text>
						<TextInput
							style={styles.input}
							value={lastName}
							onChangeText={setLastName}
							placeholder="Enter your last name"
							placeholderTextColor="#999"
							autoCapitalize="words"
							autoCorrect={false}
						/>
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
