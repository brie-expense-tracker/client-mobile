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
import { RectButton } from 'react-native-gesture-handler';
import useAuth from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/context/profileContext';

export default function SettingsScreen() {
	const router = useRouter();
	const { user, logout } = useAuth();
	const {
		profile,
		loading: profileLoading,
		error: profileError,
	} = useProfile();
	const [profileImage, setProfileImage] = useState(
		require('../../../assets/images/profile.jpg')
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
							<Setting
								icon="person-outline"
								label="Profile Editor"
								onPress={() => router.push('./settings/test/ProfileEditor')}
							/>
							<Setting
								icon="person-outline"
								label="Test"
								onPress={() => router.push('./settings/test/test')}
							/>
							<Setting
								icon="person-outline"
								label="Test reset password"
								onPress={() =>
									router.push('./settings/test/test-password-reset')
								}
							/>
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
								onPress={() => router.push('./settings/dataandprivacy')}
							/>

							{/* APP PREFERENCES */}
							<Text style={styles.settingsHeader}>Preferences</Text>
							<Setting
								icon="notifications-outline"
								label="Notifications"
								onPress={() => router.push('./settings/notification')}
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
