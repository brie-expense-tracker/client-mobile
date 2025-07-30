import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
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
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import useAuth from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/context/profileContext';
import Setting from '../../../src/components/Setting';

export default function SettingsScreen() {
	const router = useRouter();
	const { user, logout } = useAuth();
	const {
		profile,
		loading: profileLoading,
		error: profileError,
	} = useProfile();
	const [profileImage, setProfileImage] = useState(
		require('../../../src/assets/images/profile.jpg')
	);

	const handleSignOut = async () => {
		Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					try {
						await logout();
						Alert.alert('Signed Out', 'You have been signed out.');
					} catch (error) {
						console.error('Error signing out:', error);
						Alert.alert('Error', 'Failed to sign out. Please try again.');
					}
				},
			},
		]);
	};

	/* ---------------------------------- Loading State --------------------------------- */
	if (profileLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0790ff" />
				<Text style={styles.loadingText}>Loading profile...</Text>
			</View>
		);
	}

	/* ---------------------------------- UI --------------------------------- */
	return (
		<View style={styles.mainContainer}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView>
					{/* ——— Profile picture and balances ——— */}
					<View style={styles.profilePicWrapper}>
						<View style={styles.profilePicContainer}>
							<Image
								source={profileImage}
								style={styles.profilePic}
								contentFit="cover"
							/>
						</View>
						<Text style={styles.userName}>
							{profile
								? `${profile.firstName} ${profile.lastName}`
								: user?.email || '@user'}
						</Text>
						{profile && (
							<Text style={styles.userDetails}>
								Monthly Income: ${profile.monthlyIncome.toLocaleString()} |
								Savings: ${profile.savings.toLocaleString()}
							</Text>
						)}
					</View>

					{/* ——— Settings ——— */}
					<View style={styles.settingsContainerWrapper}>
						<View style={styles.settingsContainer}>
							{/* ACCOUNT */}
							<Text style={styles.settingsHeader}>Account</Text>
							<Setting
								icon="person-outline"
								label="Profile"
								onPress={() => router.push('./profile')}
							/>

							{/* FINANCE */}
							<Text style={styles.settingsHeader}>Finance</Text>
							<Setting
								icon="card-outline"
								label="Budgets"
								onPress={() => router.push('./budgets')}
							/>

							<Setting
								icon="trophy-outline"
								label="Goals"
								onPress={() => router.push('./goals')}
							/>

							<Setting
								icon="repeat-outline"
								label="Recurring Expenses"
								onPress={() => router.push('./recurringExpenses')}
							/>

							{/* AI & PRIVACY */}
							<Text style={styles.settingsHeader}>AI & Privacy</Text>
							<Setting
								icon="bulb-outline"
								label="AI Insights"
								onPress={() => router.push('./aiInsights')}
							/>
							<Setting
								icon="shield-outline"
								label="Data & Privacy"
								onPress={() => router.push('./dataandprivacy')}
							/>

							{/* APP PREFERENCES */}
							<Text style={styles.settingsHeader}>Preferences</Text>
							<Setting
								icon="notifications-outline"
								label="Notifications"
								onPress={() => router.push('./notification')}
							/>

							{/* LEGAL & SUPPORT */}
							<Text style={styles.settingsHeader}>Support & Legal</Text>
							<Setting
								icon="help-circle-outline"
								label="Help & Support"
								onPress={() => router.push('./help')}
							/>
							<Setting
								icon="information-circle-outline"
								label="About"
								onPress={() => router.push('./about')}
							/>
							<Setting
								icon="document-text-outline"
								label="Legal Documents"
								onPress={() => router.push('./legal')}
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
						<RectButton style={styles.signOutButton} onPress={handleSignOut}>
							<Ionicons name="log-out-outline" size={24} color="#FF3B30" />
							<Text style={styles.signOutText}>Sign Out</Text>
						</RectButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}

/* ---------------------------- Styles --------------------------- */
const styles = StyleSheet.create({
	/***** containers *****/
	mainContainer: { flex: 1, backgroundColor: '#fff' },
	safeArea: { flex: 1 },

	/***** loading *****/
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
		fontWeight: '500',
	},

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
	userDetails: { fontSize: 14, color: '#828282', marginBottom: 4 },

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
