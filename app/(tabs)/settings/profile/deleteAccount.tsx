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
import { getAuth, deleteUser } from '@react-native-firebase/auth';

export default function DeleteAccountScreen() {
	const router = useRouter();
	const [confirmText, setConfirmText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isDeleted, setIsDeleted] = useState(false);

	const isDeleteButtonEnabled = () => {
		return confirmText.trim().toLowerCase() === 'delete' && !isLoading;
	};

	const handleDeleteAccount = async () => {
		if (confirmText.trim().toLowerCase() !== 'delete') {
			Alert.alert('Error', 'Please type "DELETE" to confirm');
			return;
		}

		Alert.alert(
			'Final Confirmation',
			'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete Account',
					style: 'destructive',
					onPress: async () => {
						setIsLoading(true);
						try {
							const user = getAuth().currentUser!;
							deleteUser(user);
							setIsDeleted(true);

							if (isDeleted) {
								Alert.alert(
									'Account Deleted',
									'Your account has been permanently deleted.',
									[
										{
											text: 'OK',
											onPress: () => {
												// Navigate to login or onboarding
												router.replace('/(auth)/login-test');
											},
										},
									]
								);
							} else {
								Alert.alert('Error', 'Failed to delete account');
							}
						} catch (error) {
							console.error('Error deleting account:', error);
							Alert.alert('Error', 'Failed to delete account');
						} finally {
							setIsLoading(false);
						}
					},
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					<View style={styles.warningContainer}>
						<Ionicons name="warning" size={48} color="#FF3B30" />
						<Text style={styles.warningTitle}>Delete Account</Text>
						<Text style={styles.warningText}>
							This action cannot be undone. All your data, including
							transactions, budgets, and settings will be permanently deleted.
						</Text>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Type "DELETE" to Confirm</Text>
						<TextInput
							style={styles.textInput}
							value={confirmText}
							onChangeText={setConfirmText}
							placeholder="Type DELETE to confirm"
							placeholderTextColor="#999"
							autoCapitalize="none"
							autoCorrect={false}
						/>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={20}
							color="#FF3B30"
						/>
						<Text style={styles.infoText}>
							By deleting your account, you will lose access to all your
							financial data and this action cannot be reversed.
						</Text>
					</View>

					<RectButton
						style={[
							styles.deleteButton,
							!isDeleteButtonEnabled() && styles.deleteButtonDisabled,
						]}
						onPress={handleDeleteAccount}
						enabled={isDeleteButtonEnabled()}
					>
						<Text style={styles.deleteButtonText}>
							{isLoading ? 'Deleting...' : 'Delete Account'}
						</Text>
					</RectButton>

					<RectButton style={styles.cancelButton} onPress={() => router.back()}>
						<Text style={styles.cancelButtonText}>Cancel</Text>
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
	warningContainer: {
		alignItems: 'center',
		marginBottom: 32,
		padding: 20,
		backgroundColor: '#FFF5F5',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#FECACA',
	},
	warningTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#FF3B30',
		marginTop: 12,
		marginBottom: 8,
		textAlign: 'center',
	},
	warningText: {
		fontSize: 16,
		color: '#DC2626',
		textAlign: 'center',
		lineHeight: 22,
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
	textInput: {
		height: 48,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		paddingHorizontal: 12,
		fontSize: 16,
		color: '#333',
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 32,
		padding: 16,
		backgroundColor: '#FEF2F2',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#FECACA',
	},
	infoText: {
		flex: 1,
		marginLeft: 8,
		fontSize: 14,
		color: '#DC2626',
		lineHeight: 20,
	},
	deleteButton: {
		backgroundColor: '#FF3B30',
		height: 48,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	deleteButtonDisabled: {
		backgroundColor: '#FFB3B3',
	},
	deleteButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	cancelButton: {
		backgroundColor: '#fff',
		height: 48,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		justifyContent: 'center',
		alignItems: 'center',
	},
	cancelButtonText: {
		color: '#666',
		fontSize: 16,
		fontWeight: '500',
	},
});
