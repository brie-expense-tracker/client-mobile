import React, { useState } from 'react';
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

export default function EditPasswordScreen() {
	const router = useRouter();
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const validatePassword = (password: string) => {
		// At least 8 characters, 1 uppercase, 1 lowercase, 1 number
		const passwordRegex =
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
		return passwordRegex.test(password);
	};

	// Check if save button should be enabled
	const isSaveButtonEnabled = () => {
		const passwordsMatch = newPassword.trim() === confirmPassword.trim();
		const passwordsDontMatch = currentPassword.trim() !== newPassword.trim();
		const hasValidInputs = Boolean(
			currentPassword.trim() && newPassword.trim() && confirmPassword.trim()
		);

		return passwordsMatch && passwordsDontMatch && hasValidInputs && !isLoading;
	};

	const handleSave = async () => {
		if (!currentPassword.trim()) {
			Alert.alert('Error', 'Please enter your current password');
			return;
		}

		if (!newPassword.trim()) {
			Alert.alert('Error', 'Please enter a new password');
			return;
		}

		if (!validatePassword(newPassword.trim())) {
			Alert.alert(
				'Error',
				'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
			);
			return;
		}

		if (newPassword.trim() !== confirmPassword.trim()) {
			Alert.alert('Error', 'New passwords do not match');
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(
				'http://localhost:3000/api/users/change-password',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						currentPassword: currentPassword.trim(),
						newPassword: newPassword.trim(),
					}),
				}
			);

			if (response.ok) {
				Alert.alert('Success', 'Password changed successfully', [
					{
						text: 'OK',
						onPress: () => {
							// Clear form
							setCurrentPassword('');
							setNewPassword('');
							setConfirmPassword('');
							router.back();
						},
					},
				]);
			} else {
				const errorData = await response.json();
				Alert.alert('Error', errorData.message || 'Failed to change password');
			}
		} catch (error) {
			console.error('Error changing password:', error);
			Alert.alert('Error', 'Failed to change password');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					<Text style={styles.sectionTitle}>Password Change</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Current Password</Text>
						<View style={styles.passwordInputContainer}>
							<TextInput
								style={styles.passwordInput}
								value={currentPassword}
								onChangeText={setCurrentPassword}
								placeholder="Enter your current password"
								placeholderTextColor="#999"
								secureTextEntry={!showCurrentPassword}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<RectButton
								style={styles.eyeButton}
								onPress={() => setShowCurrentPassword(!showCurrentPassword)}
							>
								<View accessible accessibilityRole="button">
									<Ionicons
										name={showCurrentPassword ? 'eye-off' : 'eye'}
										size={20}
										color="#666"
									/>
								</View>
							</RectButton>
						</View>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>New Password</Text>
						<View style={styles.passwordInputContainer}>
							<TextInput
								style={styles.passwordInput}
								value={newPassword}
								onChangeText={setNewPassword}
								placeholder="Enter your new password"
								placeholderTextColor="#999"
								secureTextEntry={!showNewPassword}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<RectButton
								style={styles.eyeButton}
								onPress={() => setShowNewPassword(!showNewPassword)}
							>
								<View accessible accessibilityRole="button">
									<Ionicons
										name={showNewPassword ? 'eye-off' : 'eye'}
										size={20}
										color="#666"
									/>
								</View>
							</RectButton>
						</View>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Confirm New Password</Text>
						<View style={styles.passwordInputContainer}>
							<TextInput
								style={styles.passwordInput}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								placeholder="Confirm your new password"
								placeholderTextColor="#999"
								secureTextEntry={!showConfirmPassword}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<RectButton
								style={styles.eyeButton}
								onPress={() => setShowConfirmPassword(!showConfirmPassword)}
							>
								<View accessible accessibilityRole="button">
									<Ionicons
										name={showConfirmPassword ? 'eye-off' : 'eye'}
										size={20}
										color="#666"
									/>
								</View>
							</RectButton>
						</View>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={20}
							color="#666"
						/>
						<Text style={styles.infoText}>
							Your password must be at least 8 characters long and contain at
							least one uppercase letter, one lowercase letter, and one number.
						</Text>
					</View>

					<RectButton
						style={[
							styles.saveButton,
							!isSaveButtonEnabled() && styles.saveButtonDisabled,
						]}
						onPress={isSaveButtonEnabled() ? handleSave : undefined}
						enabled={isSaveButtonEnabled()}
						underlayColor={isSaveButtonEnabled() ? '#0077CC' : '#F5F5F5'}
					>
						<View accessible accessibilityRole="button">
							<Text
								style={[
									styles.saveButtonText,
									!isSaveButtonEnabled() && styles.saveButtonTextDisabled,
								]}
							>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</Text>
						</View>
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
	passwordInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		backgroundColor: '#fff',
	},
	passwordInput: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: '#333',
	},
	eyeButton: {
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
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
		justifyContent: 'center',
		marginTop: 20,
		minHeight: 56,
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
