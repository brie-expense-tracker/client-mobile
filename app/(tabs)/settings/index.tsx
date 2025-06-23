// ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { OnboardingService } from '../../../services/onboardingService';

export default function ProfileScreen() {
	const router = useRouter();
	const [profileImage, setProfileImage] = useState(
		require('../../../assets/images/profile.jpg')
	);
	const [userProfile, setUserProfile] = useState({
		firstName: 'Max',
		lastName: 'Mustermann',
		username: 'maxmustermann',
		monthlyIncome: 1000,
		savings: 100,
		debt: 100,
	});

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
				setUserProfile(data.data);
			}
		} catch (error) {
			// UNCOMMENT WHILE TESTING AXIOS
			// console.error('Error fetching profile:', error);
		}
	};

	const pickImage = async () => {
		// Request permission
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== 'granted') {
			Alert.alert(
				'Permission needed',
				'Please grant permission to access your photos'
			);
			return;
		}

		// Launch image picker
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

	const handleSignOut = async () => {
		Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
			{
				text: 'Cancel',
				style: 'cancel',
			},
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					try {
						// Sign out from Firebase
						signOut(getAuth());
						Alert.alert('Signed Out', 'You have been signed out.');
					} catch (error) {
						console.error('Error signing out:', error);
						Alert.alert('Error', 'Failed to sign out. Please try again.');
					}
				},
			},
		]);
	};

	return (
		<View style={styles.mainContainer}>
			<ScrollView>
				<SafeAreaView style={styles.safeArea}>
					{/* Profile picture and name */}
					<View style={styles.profilePicWrapper}>
						<View style={styles.profilePicContainer}>
							<Image
								source={profileImage}
								style={styles.profilePic}
								contentFit="cover"
							/>
						</View>
						<Text style={styles.userName}>@{userProfile.username}</Text>
						<Text style={styles.totalValue}>
							${(userProfile?.monthlyIncome || 0).toLocaleString()}
						</Text>
						<Text style={styles.totalValueLabel}>Total Amount Inputted</Text>
					</View>

					{/* Stats cards */}
					<View style={styles.statsContainer}>
						<View style={styles.statCard}>
							<Text style={styles.statValue}>
								${(userProfile?.savings || 0).toLocaleString()}
							</Text>
							<Text style={styles.statLabel}>Total Savings</Text>
						</View>
						<View style={styles.statCard}>
							<Text style={styles.statValue}>
								${(userProfile?.debt || 0).toLocaleString()}
							</Text>
							<Text style={styles.statLabel}>Total Debt</Text>
						</View>
					</View>

					{/* Settings List */}
					<View style={styles.settingsContainerWrapper}>
						<View style={styles.settingsContainer}>
							<TouchableOpacity
								style={styles.settingItem}
								onPress={() => router.push('./settings/account')}
							>
								<Ionicons name="person-outline" size={24} color="#555" />
								<Text style={styles.settingText}>Account</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.settingItem}
								onPress={() =>
									router.push('./settings/notification/notificationSettings')
								}
							>
								<Ionicons name="notifications-outline" size={24} color="#555" />
								<Text style={styles.settingText}>Notifications</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity>
							{/* <TouchableOpacity
								style={styles.settingItem}
								onPress={() => router.push('/screens/fixedExpenses')}
							>
								<Ionicons name="cube-outline" size={24} color="#555" />
								<Text style={styles.settingText}>Fixed Expenses</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity> */}

							{/* <TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/screens/preferences')}
					>
						<Ionicons name="settings-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Preferences</Text>
						<Ionicons name="chevron-forward" size={24} color="#555" />
					</TouchableOpacity>
					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="color-palette-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Appearance</Text>
						<Ionicons name="chevron-forward" size={24} color="#555" />
					</TouchableOpacity> */}
							<TouchableOpacity
								style={styles.settingItem}
								onPress={() => {
									router.push('/settings/privacyandsecurity');
								}}
							>
								<Ionicons
									name="shield-checkmark-outline"
									size={24}
									color="#555"
								/>
								<Text style={styles.settingText}>Privacy & Security</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.settingItem}
								onPress={() => router.push('./settings/help')}
							>
								<Ionicons name="help-circle-outline" size={24} color="#555" />
								<Text style={styles.settingText}>Help & Support</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.settingItem}
								onPress={() => router.push('./settings/about')}
							>
								<Ionicons
									name="information-circle-outline"
									size={24}
									color="#555"
								/>
								<Text style={styles.settingText}>About</Text>
								<Ionicons
									name="chevron-forward"
									size={18}
									style={styles.chevronIcon}
								/>
							</TouchableOpacity>
							<TouchableOpacity style={styles.settingItem}>
								<Ionicons
									name="chatbox-ellipses-outline"
									size={24}
									color="#555"
								/>
								<Text style={styles.settingText}>Ai Chat</Text>
								<Text style={styles.chevronIcon}>Coming Soon</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Sign Out Button */}
					<View style={styles.signOutContainer}>
						<TouchableOpacity
							style={styles.signOutButton}
							onPress={handleSignOut}
						>
							<Ionicons name="log-out-outline" size={24} color="#FF3B30" />
							<Text style={styles.signOutText}>Sign Out</Text>
						</TouchableOpacity>
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
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	headerText: {
		color: '#222222',
		fontSize: 28,
		fontWeight: '500',
	},
	profilePicWrapper: {
		alignItems: 'center',
		paddingHorizontal: 24,
		marginTop: 12,
	},
	profilePicContainer: {
		position: 'relative',
		marginBottom: 12,
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
	userName: {
		fontSize: 18,
		fontWeight: '500',
		color: '#666666',
		marginBottom: 4,
	},
	totalValue: {
		fontSize: 24,
		fontWeight: '600',
		color: '#222222',
	},
	totalValueLabel: {
		fontSize: 14,
		color: '#828282',
		marginBottom: 4,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
		paddingHorizontal: 16,
		gap: 12,
	},
	statCard: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		flex: 1,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
	},
	statValue: { fontSize: 20, fontWeight: 'bold' },
	statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
	settingsContainerWrapper: {
		marginTop: 24,
		padding: 16,
		borderRadius: 12,
	},
	settingsContainer: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		elevation: 2,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	chevronIcon: {
		color: '#BEBEBE',
	},
	settingText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 16,
		color: '#333',
	},
	settingValue: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	settingValueText: {
		fontSize: 14,
		color: '#666',
		marginRight: 8,
	},
	signOutContainer: {
		marginTop: 'auto',
		padding: 16,
	},
	signOutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#FF3B30',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
	},
	signOutText: {
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '500',
		color: '#FF3B30',
	},
});
