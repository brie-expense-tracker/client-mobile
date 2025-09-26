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

/* --------------------------------- UI --------------------------------- */

type Item = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	route?: string;
	onPress?: () => void;
};

function Section({ title, items }: { title: string; items: Item[] }) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.card}>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					return (
						<TouchableOpacity
							key={item.label}
							style={[styles.row, isLast && styles.rowLast]}
							onPress={item.onPress}
						>
							<Ionicons name={item.icon} size={24} color="#007AFF" />
							<Text style={styles.rowText}>{item.label}</Text>
							<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

/* ---------------------------- Screen ---------------------------- */

export default function SettingsScreen() {
	const router = useRouter();
	const { logout } = useAuth();

	const handleLogout = async () => {
		try {
			await logout();
			// Navigation is handled automatically by AuthContext when firebaseUser becomes null
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const accountItems: Item[] = [
		{
			label: 'Profile',
			icon: 'person-outline',
			onPress: () => router.push('/(stack)/settings/profile'),
		},
		{
			label: 'Privacy & Security',
			icon: 'shield-outline',
			onPress: () => router.push('/(stack)/settings/privacyandsecurity'),
		},
	];

	const appItems: Item[] = [
		{
			label: 'Notifications',
			icon: 'notifications-outline',
			onPress: () => router.push('/(stack)/settings/notification'),
		},
	];

	const supportItems: Item[] = [
		{
			label: 'About',
			icon: 'information-circle-outline',
			onPress: () => router.push('/(stack)/settings/about'),
		},
	];

	const legalItems: Item[] = [
		{
			label: 'Legal Documents',
			icon: 'document-text-outline',
			onPress: () => router.push('/(stack)/settings/legal'),
		},
	];

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Settings</Text>
			</View>

			{/* Debug / Testing (kept simple and white) - Only show in development */}
			{__DEV__ && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Debug & Testing</Text>
					<View style={styles.cardNoRows}>
						<ConnectivityTest />
					</View>
				</View>
			)}

			{/* Sections */}
			<Section title="Account" items={accountItems} />
			<Section title="App" items={appItems} />
			<Section title="Support" items={supportItems} />
			<Section title="Legal" items={legalItems} />

			{/* Logout */}
			<View style={styles.logoutContainer}>
				<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
					<Ionicons name="log-out-outline" size={24} color="#fff" />
					<Text style={styles.logoutText}>Logout</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff', // pure white background
	},
	scrollContent: {
		paddingBottom: 32,
	},
	header: {
		paddingTop: 50,
		paddingBottom: 16,
		paddingHorizontal: 20,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#333',
	},

	/* Sections */
	section: {
		backgroundColor: '#fff',
		paddingHorizontal: 20,
		marginTop: 8,
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#8e8e8e',
		textTransform: 'uppercase',
		marginBottom: 8,
	},

	/* Cards */
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden', // keeps last-row border clean
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#EEE',
	},
	cardNoRows: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#EEE',
		padding: 12,
	},

	/* Rows */
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#EEE',
	},
	rowLast: {
		borderBottomWidth: 0, // ✨ no divider on the final item
	},
	rowText: {
		flex: 1,
		marginLeft: 14,
		fontSize: 16,
		color: '#333',
	},

	/* Logout */
	logoutContainer: {
		paddingHorizontal: 20,
		marginTop: 8,
		marginBottom: 28,
	},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 15,
		backgroundColor: '#FF3B30',
		borderRadius: 12,
	},
	logoutText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
});
