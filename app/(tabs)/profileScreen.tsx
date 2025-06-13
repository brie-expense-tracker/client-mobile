// ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
	const router = useRouter();
	const [profileImage, setProfileImage] = useState(
		require('../../assets/images/profile.jpg')
	);
	const [userProfile, setUserProfile] = useState({
		firstName: 'Max',
		lastName: 'Mustermann',
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
			console.error('Error fetching profile:', error);
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

	return (
		<View style={styles.mainContainer}>
			<LinearGradient
				colors={['#005fe4', '#0095ff']}
				style={styles.gradient}
				start={{ x: 0, y: 1 }}
				end={{ x: 1, y: 0 }}
			>
				<SafeAreaView style={styles.container}>
					<View style={styles.topContentContainer}>
						{/* Header*/}
						<View style={styles.headerContainer}>
							<Text style={styles.headerText}>Profile</Text>
							{/* <TouchableOpacity
								onPress={() => router.push('/screens/profileSettings')}
							>
								<Ionicons name="settings-outline" size={32} color="#f0f0f0" />
							</TouchableOpacity> */}
						</View>

						{/* Profile picture and name */}
						<View style={styles.profilePicWrapper}>
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
										<Ionicons name="pencil" size={16} color="#fff" />
									</View>
								</TouchableOpacity>
							</View>
							<Text style={styles.userName}>
								{userProfile.firstName} {userProfile.lastName}
							</Text>
						</View>
					</View>
				</SafeAreaView>
			</LinearGradient>

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
			<View style={styles.settingsContainer}>
				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/screens/notifications')}
				>
					<Ionicons name="notifications-outline" size={24} color="#555" />
					<Text style={styles.settingText}>Notifications</Text>
					<Ionicons name="chevron-forward" size={24} color="#555" />
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/screens/fixedExpenses')}
				>
					<Ionicons name="cube-outline" size={24} color="#555" />
					<Text style={styles.settingText}>Fixed Expenses</Text>
					<Ionicons name="chevron-forward" size={24} color="#555" />
				</TouchableOpacity>
				<TouchableOpacity
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
				</TouchableOpacity>
				<TouchableOpacity style={styles.settingItem}>
					<Ionicons name="shield-checkmark-outline" size={24} color="#555" />
					<Text style={styles.settingText}>Privacy & Security</Text>
					<Ionicons name="chevron-forward" size={24} color="#555" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.settingItem}>
					<Ionicons name="chatbox-ellipses-outline" size={24} color="#555" />
					<Text style={styles.settingText}>Ai Chat</Text>
					<Text style={{ color: '#717171' }}>Coming Soon</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	container: {
		backgroundColor: 'transparent',
	},
	topContentContainer: {
		paddingTop: 12,
		paddingBottom: 24,
	},
	gradient: {
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	headerText: {
		color: '#f0f0f0',
		fontSize: 28,
		fontWeight: '500',
	},
	profilePicWrapper: {
		alignItems: 'center',
		gap: 12,
	},
	profilePicContainer: {
		position: 'relative',
	},
	profilePic: {
		width: 100,
		height: 100,
		borderRadius: 50,
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
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	userName: {
		fontSize: 24,
		fontWeight: '600',
		color: '#f0f0f0',
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
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	statValue: { fontSize: 20, fontWeight: 'bold' },
	statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
	settingsContainer: {
		marginTop: 20,
		paddingHorizontal: 16,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		elevation: 2,
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
});
