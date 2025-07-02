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
import Setting from '../../../../src/components/Setting';

export default function AccountScreen() {
	const router = useRouter();
	const { profile, loading, error, fetchProfile } = useProfile();
	const { user } = useAuth();
	const [profileImage, setProfileImage] = useState(
		require('../../../../src/assets/images/profile.jpg')
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
					<Setting
						icon="person-outline"
						label="Name"
						value={
							profile.firstName || profile.lastName
								? `${profile.firstName} ${profile.lastName}`
								: 'Not set'
						}
						onPress={() => router.push('/settings/profile/editName')}
					/>

					<Setting
						icon="mail-outline"
						label="Email"
						value={user?.email || 'Not set'}
					/>

					<Setting
						icon="key-outline"
						label="Change Password"
						value="••••••••"
						onPress={() => router.push('/settings/profile/editPassword')}
					/>
				</View>
			</View>

			{/* Financial Information */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Financial Information</Text>
				<View style={styles.settingsContainer}>
					<Setting
						icon="cash-outline"
						label="Monthly Income"
						value={`$${profile.monthlyIncome?.toLocaleString() || '0'}`}
						onPress={() => router.push('/settings/profile/editFinancial')}
					/>

					<Setting
						icon="trending-up-outline"
						label="Total Savings"
						value={`$${profile.savings?.toLocaleString() || '0'}`}
						onPress={() => router.push('/settings/profile/editFinancial')}
					/>

					<Setting
						icon="trending-down-outline"
						label="Total Debt"
						value={`$${profile.debt?.toLocaleString() || '0'}`}
						onPress={() => router.push('/settings/profile/editFinancial')}
					/>

					{profile.expenses && (
						<Setting
							icon="card-outline"
							label="Expenses"
							value={`Housing: $${
								profile.expenses.housing?.toLocaleString() || '0'
							}`}
							onPress={() => router.push('/settings/profile/editExpenses')}
						/>
					)}
				</View>
			</View>

			{/* Account Management */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account Management</Text>
				<View style={styles.settingsContainer}>
					<Setting
						icon="trash-outline"
						label="Delete Account"
						onPress={() => router.push('/settings/profile/deleteAccount')}
					/>
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
