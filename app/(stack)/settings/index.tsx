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
import { useTheme } from '../../../src/context/ThemeContext';
import ConnectivityTest from '../../../src/components/ConnectivityTest';
import ThemeToggle from '../../../src/components/ThemeToggle';

/* --------------------------------- UI --------------------------------- */

type Item = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	route?: string;
	onPress?: () => void;
};

function Section({
	title,
	items,
	colors,
}: {
	title: string;
	items: Item[];
	colors: any;
}) {
	return (
		<View style={[styles.section, { backgroundColor: colors.bg }]}>
			<Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
			<View
				style={[
					styles.card,
					{ backgroundColor: colors.card, borderColor: colors.line },
				]}
			>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					return (
						<TouchableOpacity
							key={item.label}
							style={[styles.row, isLast && styles.rowLast]}
							onPress={item.onPress}
						>
							<Ionicons name={item.icon} size={24} color={colors.tint} />
							<Text style={[styles.rowText, { color: colors.text }]}>
								{item.label}
							</Text>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={colors.subtle}
							/>
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
	const { colors } = useTheme();

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
			style={[styles.container, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Debug / Testing (kept simple and white) - Only show in development */}
			{__DEV__ && (
				<View style={[styles.section, { backgroundColor: colors.bg }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Debug & Testing
					</Text>
					<View
						style={[
							styles.cardNoRows,
							{ backgroundColor: colors.card, borderColor: colors.line },
						]}
					>
						<ConnectivityTest />
					</View>
				</View>
			)}

			{/* Sections */}
			<Section title="Account" items={accountItems} colors={colors} />

			{/* App Settings with Theme Toggle */}
			<View style={[styles.section, { backgroundColor: colors.bg }]}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>App</Text>
				<View
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.line },
					]}
				>
					<ThemeToggle />
					<View style={[styles.row, styles.rowLast]}>
						<Ionicons
							name="notifications-outline"
							size={24}
							color={colors.tint}
						/>
						<Text style={[styles.rowText, { color: colors.text }]}>
							Notifications
						</Text>
						<TouchableOpacity
							onPress={() => router.push('/(stack)/settings/notification')}
						>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={colors.subtle}
							/>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			<Section title="Support" items={supportItems} colors={colors} />
			<Section title="Legal" items={legalItems} colors={colors} />

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
