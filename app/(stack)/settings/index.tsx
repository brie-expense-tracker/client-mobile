import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuth from '../../../src/context/AuthContext';
import ConnectivityTest from '../../../src/components/ConnectivityTest';

export default function SettingsScreen() {
	const router = useRouter();
	const { logout } = useAuth();

	const handleLogout = async () => {
		try {
			await logout();
			router.replace('/(auth)/login');
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Settings</Text>
			</View>

			{/* Connectivity Test Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Debug & Testing</Text>
				<ConnectivityTest />
			</View>

			{/* Account Settings */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account</Text>

				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/(stack)/settings/profile')}
				>
					<Ionicons name="person-outline" size={24} color="#007AFF" />
					<Text style={styles.settingText}>Profile</Text>
					<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/(stack)/settings/privacyandsecurity')}
				>
					<Ionicons name="shield-outline" size={24} color="#007AFF" />
					<Text style={styles.settingText}>Privacy & Security</Text>
					<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
				</TouchableOpacity>
			</View>

			{/* App Settings */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>App</Text>

				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/(stack)/settings/notifications')}
				>
					<Ionicons name="notifications-outline" size={24} color="#007AFF" />
					<Text style={styles.settingText}>Notifications</Text>
					<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
				</TouchableOpacity>
			</View>

			{/* Support */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Support</Text>

				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/(stack)/settings/about')}
				>
					<Ionicons
						name="information-circle-outline"
						size={24}
						color="#007AFF"
					/>
					<Text style={styles.settingText}>About</Text>
					<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
				</TouchableOpacity>
			</View>

			{/* Legal Documents */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Legal</Text>

				<TouchableOpacity
					style={styles.settingItem}
					onPress={() => router.push('/(stack)/settings/legal')}
				>
					<Ionicons name="document-text-outline" size={24} color="#007AFF" />
					<Text style={styles.settingText}>Legal Documents</Text>
					<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
				</TouchableOpacity>
			</View>

			{/* Logout */}
			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Ionicons name="log-out-outline" size={24} color="#FF3B30" />
				<Text style={styles.logoutText}>Logout</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

/* ---------------------------- Styles --------------------------- */
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	header: {
		paddingTop: 50,
		paddingBottom: 20,
		paddingHorizontal: 20,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#333',
	},
	section: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 15,
		padding: 15,
		paddingBottom: 20,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#8e8e8e',
		textTransform: 'uppercase',
		paddingBottom: 10,
		paddingHorizontal: 10,
	},
	settingItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	settingText: {
		flex: 1,
		marginLeft: 15,
		fontSize: 16,
		color: '#333',
	},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 15,
		paddingHorizontal: 20,
		backgroundColor: '#FF3B30',
		borderRadius: 12,
		marginTop: 20,
	},
	logoutText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 10,
	},
});
