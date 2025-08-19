import React from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	Alert,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import useAuth from '../../../src/context/AuthContext';
import { useProfile } from '../../../src/context/profileContext';
import Setting from './components/settingItem';

export default function SettingsScreen() {
	const router = useRouter();
	const { user, logout } = useAuth();
	const { loading: profileLoading } = useProfile();

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
					{/* ——— Settings ——— */}
					<View style={styles.settingsContainerWrapper}>
						<View style={styles.settingsContainer}>
							{/* ACCOUNT */}
							<Text style={styles.settingsHeader}>Account</Text>
							<Setting
								icon="person-outline"
								label="Profile"
								onPress={() => router.push('/(stack)/settings/profile')}
							/>

							{/* FINANCE */}
							<Text style={styles.settingsHeader}>Finance</Text>
							<Setting
								icon="card-outline"
								label="Budgets"
								onPress={() => router.push('/(stack)/settings/budgets')}
							/>

							<Setting
								icon="trophy-outline"
								label="Goals"
								onPress={() => router.push('/(stack)/settings/goals')}
							/>

							<Setting
								icon="repeat-outline"
								label="Recurring Expenses"
								onPress={() =>
									router.push('/(stack)/settings/recurringExpenses')
								}
							/>

							{/* PREFERENCES & AI */}
							<Text style={styles.settingsHeader}>Preferences & AI</Text>
							<Setting
								icon="bulb-outline"
								label="AI Insights"
								onPress={() => router.push('/(stack)/settings/aiInsights')}
							/>
							<Setting
								icon="notifications-outline"
								label="Notifications"
								onPress={() => router.push('/(stack)/settings/notification')}
							/>

							{/* SUBSCRIPTION */}
							<Text style={styles.settingsHeader}>Subscription</Text>
							<Setting
								icon="sparkles"
								label="Upgrade to Premium"
								onPress={() => router.push('/(stack)/settings/upgrade')}
							/>

							{/* SECURITY & SUPPORT */}
							<Text style={styles.settingsHeader}>Security & Support</Text>
							<Setting
								icon="shield-outline"
								label="Security & Privacy"
								onPress={() =>
									router.push('/(stack)/settings/privacyandsecurity')
								}
							/>
							<Setting
								icon="help-circle-outline"
								label="Help & About"
								onPress={() => router.push('/(stack)/settings/faq')}
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
