import React from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuth from '../../../../src/context/AuthContext';

export default function SecurityScreen() {
	const router = useRouter();
	const { firebaseUser } = useAuth();

	const hasPasswordProvider =
		(firebaseUser?.providerData || []).some(
			(p) => p?.providerId === 'password'
		) ?? false;

	return (
		<View style={styles.mainContainer}>
			<ScrollView>
				<SafeAreaView style={styles.safeArea}>
					{/* Security Options */}
					<View style={styles.optionsContainer}>
						<Text style={styles.sectionHeader}>Account Security</Text>

						{!hasPasswordProvider && (
							<TouchableOpacity
								style={styles.optionItem}
								onPress={() =>
									router.push('/(stack)/settings/security/linkPassword')
								}
							>
								<View style={styles.optionLeft}>
									<Ionicons name="key-outline" size={24} color="#555" />
									<View style={styles.optionText}>
										<Text style={styles.optionTitle}>Add Password</Text>
										<Text style={styles.optionSubtitle}>
											Sign in with email & password in addition to Google
										</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
							</TouchableOpacity>
						)}

						{hasPasswordProvider && (
							<TouchableOpacity
								style={styles.optionItem}
								onPress={() =>
									router.push(
										'/(stack)/settings/privacyandsecurity/editPassword'
									)
								}
							>
								<View style={styles.optionLeft}>
									<Ionicons name="key-outline" size={24} color="#555" />
									<View style={styles.optionText}>
										<Text style={styles.optionTitle}>Change Password</Text>
										<Text style={styles.optionSubtitle}>
											Update your account password
										</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
							</TouchableOpacity>
						)}

						{hasPasswordProvider && (
							<TouchableOpacity
								style={styles.optionItem}
								onPress={() => router.push('/(auth)/forgotPassword')}
							>
								<View style={styles.optionLeft}>
									<Ionicons name="mail-outline" size={24} color="#555" />
									<View style={styles.optionText}>
										<Text style={styles.optionTitle}>Forgot Password</Text>
										<Text style={styles.optionSubtitle}>
											Reset your password via email
										</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
							</TouchableOpacity>
						)}

						<TouchableOpacity
							style={styles.optionItem}
							onPress={() =>
								router.push('/(stack)/settings/security/loginHistory')
							}
						>
							<View style={styles.optionLeft}>
								<Ionicons name="time-outline" size={24} color="#555" />
								<View style={styles.optionText}>
									<Text style={styles.optionTitle}>Login History</Text>
									<Text style={styles.optionSubtitle}>
										View your recent login sessions
									</Text>
								</View>
							</View>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>
					</View>

					{/* Security Tips */}
					<View style={styles.tipsContainer}>
						<Text style={styles.sectionHeader}>Security Tips</Text>
						<View style={styles.tipItem}>
							<Ionicons
								name="shield-checkmark-outline"
								size={20}
								color="#4CAF50"
							/>
							<Text style={styles.tipText}>
								Use a strong, unique password with at least 8 characters
							</Text>
						</View>
						<View style={styles.tipItem}>
							<Ionicons
								name="shield-checkmark-outline"
								size={20}
								color="#4CAF50"
							/>
							<Text style={styles.tipText}>
								Enable two-factor authentication if available
							</Text>
						</View>
						<View style={styles.tipItem}>
							<Ionicons
								name="shield-checkmark-outline"
								size={20}
								color="#4CAF50"
							/>
							<Text style={styles.tipText}>
								Never share your password with anyone
							</Text>
						</View>
					</View>
				</SafeAreaView>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	safeArea: {
		flex: 1,
	},
	optionsContainer: {
		padding: 16,
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '700',
		color: '#8e8e8e',
		textTransform: 'uppercase',
		marginBottom: 12,
	},
	optionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	optionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	optionText: {
		marginLeft: 12,
		flex: 1,
	},
	optionTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 2,
	},
	optionSubtitle: {
		fontSize: 14,
		color: '#666',
	},
	tipsContainer: {
		padding: 16,
		marginTop: 8,
	},
	tipItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12,
		paddingHorizontal: 4,
	},
	tipText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
		flex: 1,
		lineHeight: 20,
	},
});
