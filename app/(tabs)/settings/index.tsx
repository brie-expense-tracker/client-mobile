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
import { getAuth, signOut } from '@react-native-firebase/auth';

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
			// console.error('Error fetching profile:', error);
		}
	};

	const handleSignOut = async () => {
		Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					try {
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

	/* ---------------------------------- UI --------------------------------- */
	return (
		<View style={styles.mainContainer}>
			<ScrollView>
				<SafeAreaView style={styles.safeArea}>
					{/* ——— Profile picture and balances ——— */}
					<View style={styles.profilePicWrapper}>
						<View style={styles.profilePicContainer}>
							<Image
								source={profileImage}
								style={styles.profilePic}
								contentFit="cover"
							/>
						</View>
						<Text style={styles.userName}>@{userProfile.username}</Text>
						{/* <Text style={styles.totalValue}>
							${(userProfile?.monthlyIncome || 0).toLocaleString()}
						</Text>
						<Text style={styles.totalValueLabel}>Total Amount Inputted</Text> */}
					</View>

					{/* ——— Savings / Debt cards ——— */}
					{/* <View style={styles.statsContainer}>
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
					</View> */}

					{/* ——— Settings ——— */}
					<View style={styles.settingsContainerWrapper}>
						<View style={styles.settingsContainer}>
							{/* ACCOUNT */}
							<Text style={styles.settingsHeader}>Account</Text>
							<Setting
								icon="person-outline"
								label="Profile"
								onPress={() => router.push('./settings/profile')}
							/>

							{/* FINANCE */}
							<Text style={styles.settingsHeader}>Finance</Text>
							<Setting
								icon="card-outline"
								label="Income & Budgets"
								onPress={() => router.push('./settings/incomeBudget')}
							/>
							<Setting
								icon="albums-outline"
								label="Categories"
								onPress={() => router.push('./settings/categories')}
							/>
							<Setting
								icon="trophy-outline"
								label="Goals"
								onPress={() => router.push('./settings/goals')}
							/>

							{/* AI & PRIVACY */}
							<Text style={styles.settingsHeader}>AI & Privacy</Text>
							<Setting
								icon="bulb-outline"
								label="AI Insights"
								onPress={() => router.push('./settings/aiInsights')}
							/>
							<Setting
								icon="shield-outline"
								label="Data & Privacy"
								onPress={() => router.push('./settings/privacy')}
							/>

							{/* APP PREFERENCES */}
							<Text style={styles.settingsHeader}>Preferences</Text>
							<Setting
								icon="notifications-outline"
								label="Notifications"
								onPress={() => router.push('./settings/notification')}
							/>
							<Setting
								icon="color-palette-outline"
								label="Appearance"
								onPress={() => router.push('./settings/appearance')}
							/>

							{/* LEGAL & SUPPORT */}
							<Text style={styles.settingsHeader}>Support & Legal</Text>
							<Setting
								icon="help-circle-outline"
								label="Help & Support"
								onPress={() => router.push('./settings/help')}
							/>
							<Setting
								icon="information-circle-outline"
								label="About"
								onPress={() => router.push('./settings/about')}
							/>
							<Setting
								icon="document-text-outline"
								label="Legal Documents"
								onPress={() => router.push('./settings/legal')}
							/>

							{/* PLACEHOLDER / FUTURE */}
							<Setting
								icon="chatbox-ellipses-outline"
								label="AI Chat"
								trailing="Coming Soon"
							/>
						</View>
					</View>

					{/* ——— Sign-out ——— */}
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

/* --------------------- Re-usable Setting Row -------------------- */
function Setting({
	icon,
	label,
	onPress,
	trailing,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	onPress?: () => void;
	trailing?: string;
}) {
	return (
		<TouchableOpacity
			style={styles.settingItem}
			onPress={onPress}
			disabled={!onPress}
		>
			<Ionicons name={icon} size={24} color="#555" />
			<Text style={styles.settingText}>{label}</Text>
			{trailing ? (
				<Text style={[styles.chevronIcon, { fontSize: 12 }]}>{trailing}</Text>
			) : (
				<Ionicons name="chevron-forward" size={18} style={styles.chevronIcon} />
			)}
		</TouchableOpacity>
	);
}

/* ---------------------------- Styles --------------------------- */
const styles = StyleSheet.create({
	/***** containers *****/
	mainContainer: { flex: 1, backgroundColor: '#fff' },
	safeArea: { flex: 1 },

	/***** profile *****/
	profilePicWrapper: {
		alignItems: 'center',
		paddingHorizontal: 24,
		marginTop: 12,
	},
	profilePicContainer: { marginBottom: 12 },
	profilePic: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 2,
		borderColor: '#ddd',
	},
	userName: { fontSize: 18, fontWeight: '500', color: '#666', marginBottom: 4 },
	totalValue: { fontSize: 24, fontWeight: '600', color: '#222' },
	totalValueLabel: { fontSize: 14, color: '#828282', marginBottom: 4 },

	/***** stats *****/
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
		paddingHorizontal: 16,
		gap: 12,
	},
	statCard: {
		backgroundColor: '#0790ff',
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
	statValue: { fontSize: 20, fontWeight: '300', color: '#fff' },
	statLabel: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 4 },

	/***** settings *****/
	settingsContainerWrapper: { paddingHorizontal: 16 },
	settingsContainer: { backgroundColor: '#fff', borderRadius: 12 },
	settingsHeader: {
		fontSize: 12,
		fontWeight: '700',
		color: '#8e8e8e',
		textTransform: 'uppercase',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 4,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	settingText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#333' },
	chevronIcon: { color: '#BEBEBE' },

	/***** sign-out *****/
	signOutContainer: { marginTop: 'auto', padding: 16 },
	signOutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	signOutText: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: '500',
		color: '#FF3B30',
	},
});
