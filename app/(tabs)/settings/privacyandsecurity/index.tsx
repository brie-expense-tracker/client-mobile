// PrivacySecurityScreen.tsx
import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type Row = {
	label: string;
	route?: string; // optional – map to your screen names
	badge?: string; // small green sub-label (e.g. “Face ID”)
};

type Section = {
	title: string;
	description?: string;
	rows: Row[];
};

const sections: Section[] = [
	{
		title: 'Security',
		description: 'Protect your account with additional layers of security.',
		rows: [
			{ label: 'Create passkey', route: 'CreatePasskey' },
			{ label: 'Change password', route: 'ChangePassword' },
			{
				label: 'Device security',
				route: 'DeviceSecurity',
				badge: 'Face ID',
			},
			{ label: 'Devices', route: 'ConnectedDevices' },
		],
	},
	{
		title: 'Privacy',
		description: 'Manage how your data is used.',
		rows: [
			{ label: 'Manage profile visibility', route: 'ProfileVisibility' },
			{ label: 'Blocking', route: 'Blocking' },
			{ label: 'Manage your data', route: 'ManageData' },
			{ label: 'Privacy Policy', route: 'PrivacyPolicy' },
		],
	},
];

export default function PrivacySecurityScreen() {
	const nav = useNavigation();

	const renderRow = (row: Row, index: number) => (
		<TouchableOpacity
			key={row.label}
			onPress={() => row.route && nav.navigate(row.route as never)}
			style={[
				styles.row,
				// add a divider except on the last row of a section
				index !== -1 && styles.rowDivider,
			]}
			activeOpacity={0.6}
		>
			<View>
				<Text style={styles.rowLabel}>{row.label}</Text>
				{row.badge && <Text style={styles.badge}>{row.badge}</Text>}
			</View>

			<Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
		</TouchableOpacity>
	);

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{sections.map((section) => (
				<View key={section.title} style={styles.section}>
					<Text style={styles.sectionTitle}>{section.title}</Text>

					{section.description && (
						<Text style={styles.sectionDesc}>{section.description}</Text>
					)}

					<View style={styles.card}>
						{section.rows.map((row, idx) =>
							renderRow(row, idx === section.rows.length - 1 ? -1 : idx)
						)}
					</View>
				</View>
			))}

			{/* Keep a little space at bottom so the last row isn't flush */}
			<View style={{ height: 48 }} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#ffffff' },

	/* Section heading */
	section: { paddingHorizontal: 20, marginTop: 24 },
	sectionTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: '#000',
		marginBottom: 8,
	},
	sectionDesc: {
		fontSize: 15,
		color: '#555',
		marginBottom: 16,
		lineHeight: 21,
	},

	/* Card wrapper around rows */
	card: {
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#fff',
		/* subtle shadow (iOS) */
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		/* subtle shadow (Android) */
		elevation: 1,
	},

	/* Individual row */
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 22,
		justifyContent: 'space-between',
	},
	rowDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: '#e0e0e0',
	},
	rowLabel: { fontSize: 17, color: '#000', fontWeight: '500' },

	/* Sub-label (e.g. “Face ID”) */
	badge: {
		marginTop: 4,
		fontSize: 13,
		color: '#05c000', // Robinhood-like green
		fontWeight: '600',
	},
});
