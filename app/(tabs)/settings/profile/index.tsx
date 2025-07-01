import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../../../../src/context/profileContext';
import useAuth from '../../../../src/context/AuthContext';

export default function AccountScreen() {
	const router = useRouter();
	const { profile, loading, error, fetchProfile } = useProfile();
	const { user } = useAuth();
	const [profileImage, setProfileImage] = useState(
		require('../../../../assets/images/profile.jpg')
	);

	useEffect(() => {
		fetchProfile();
	}, []);

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== 'granted') {
			Alert.alert(
				'Permission needed',
				'Please grant permission to access your photos'
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setProfileImage({ uri: result.assets[0].uri });
		}
	};

	const handleDeleteAccount = () => {
		Alert.alert(
			'Delete Account',
			'Are you sure you want to delete your account? This action cannot be undone.',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						// Handle account deletion
						Alert.alert('Account Deleted', 'Your account has been deleted.');
					},
				},
			]
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0095FF" />
				<Text style={styles.loadingText}>
					{profile ? 'Loading profile...' : 'Setting up your profile...'}
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
				<Text style={styles.errorText}>Failed to load profile</Text>
				<Text style={styles.errorSubtext}>{error}</Text>
				<TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="person-outline" size={48} color="#999" />
				<Text style={styles.errorText}>No profile found</Text>
				<TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
					<Text style={styles.retryButtonText}>Refresh</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="automatic"
		>
			{/* Profile Section */}
			<View style={styles.section}>
				<View style={styles.profileSection}>
					<View style={styles.profilePicContainer}>
						<Image
							source={profileImage}
							style={styles.profilePic}
							contentFit="cover"
						/>
						<TouchableOpacity
							style={styles.editIconContainer}
							onPress={pickImage}
						>
							<View style={styles.editIconBackground}>
								<Ionicons name="camera" size={16} color="#fff" />
							</View>
						</TouchableOpacity>
					</View>
					<View style={styles.profileInfo}>
						<Text style={styles.userName}>
							{profile.firstName} {profile.lastName}
						</Text>
					</View>
				</View>
			</View>

			{/* Account Details */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account Details</Text>
				<View style={styles.settingsContainer}>
					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editName')}
					>
						<Ionicons name="person-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Name</Text>
							<Text style={styles.settingValue}>
								{profile.firstName} {profile.lastName}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editPhone')}
					>
						<Ionicons name="call-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Phone</Text>
							<Text style={styles.settingValue}>
								{profile.phone || 'Not set'}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<View style={styles.settingItem}>
						<Ionicons name="mail-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Email</Text>
							<Text style={styles.settingValue}>
								{user?.email || 'Not set'}
							</Text>
						</View>
					</View>

					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editPassword')}
					>
						<Ionicons name="key-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Change Password</Text>
							<Text style={styles.settingValue}>••••••••</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Financial Information */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Financial Information</Text>
				<View style={styles.settingsContainer}>
					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editFinancial')}
					>
						<Ionicons name="cash-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Monthly Income</Text>
							<Text style={styles.settingValue}>
								${profile.monthlyIncome?.toLocaleString() || '0'}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editFinancial')}
					>
						<Ionicons name="trending-up-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Total Savings</Text>
							<Text style={styles.settingValue}>
								${profile.savings?.toLocaleString() || '0'}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/editFinancial')}
					>
						<Ionicons name="trending-down-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Total Debt</Text>
							<Text style={styles.settingValue}>
								${profile.debt?.toLocaleString() || '0'}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					{profile.expenses && (
						<TouchableOpacity
							style={styles.settingItem}
							onPress={() => router.push('/settings/profile/editExpenses')}
						>
							<Ionicons name="card-outline" size={24} color="#555" />
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Expenses</Text>
								<Text style={styles.settingValue}>
									Housing: ${profile.expenses.housing?.toLocaleString() || '0'}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Account Management */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account Management</Text>
				<View style={styles.settingsContainer}>
					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/profile/deleteAccount')}
					>
						<Ionicons name="trash-outline" size={24} color="#555" />
						<Text style={styles.settingIconText}>Delete Account</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	stickyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
		marginTop: 50,
		zIndex: 1000,
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingBottom: 20,
	},
	backButton: {
		padding: 4,
	},
	headerText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 32,
	},
	section: {
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		paddingHorizontal: 4,
		marginTop: 16,
	},
	profileSection: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 6,
		marginTop: 0,
		alignItems: 'center',
	},
	profilePicContainer: {
		position: 'relative',
		marginBottom: 8,
	},
	profilePic: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 2,
		borderColor: '#ddd',
	},
	editIconContainer: {
		position: 'absolute',
		bottom: 0,
		right: 0,
	},
	editIconBackground: {
		backgroundColor: '#0095FF',
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	profileInfo: {
		alignItems: 'center',
	},
	userName: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	username: {
		fontSize: 16,
		color: '#666',
	},
	settingsContainer: {
		backgroundColor: '#fff',
		overflow: 'hidden',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	settingContent: {
		flex: 1,
		marginLeft: 12,
	},
	settingText: {
		fontSize: 16,
		color: '#333',
		marginBottom: 2,
	},
	settingIconText: {
		fontSize: 16,
		color: '#333',
		marginLeft: 12,
	},
	settingValue: {
		fontSize: 14,
		color: '#666',
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
	retryButton: {
		marginTop: 24,
		backgroundColor: '#0095FF',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
