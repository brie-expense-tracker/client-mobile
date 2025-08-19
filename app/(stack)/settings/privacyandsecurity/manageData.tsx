import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Row = {
	label: string;
	route?: string; // optional – map to your screen names
	badge?: string; // small green sub-label (e.g. "Face ID")
	action?: () => void; // custom action instead of navigation
};

type Section = {
	title: string;
	description?: string;
	rows: Row[];
};

export default function PrivacySecurityScreen() {
	const router = useRouter();

	const sections: Section[] = [
		{
			title: 'Manage your data',
			rows: [
				{
					label: 'Download your data',
					route: '/(stack)/settings/privacyandsecurity/downloadData',
				},
			],
		},
	];

	const renderRow = (row: Row, index: number) => (
		<TouchableOpacity
			key={row.label}
			onPress={() => {
				if (row.action) {
					row.action();
				} else if (row.route) {
					router.push(row.route as any);
				}
			}}
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
			<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
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
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f7f7f7' },

	/* Section heading */
	section: { paddingHorizontal: 20, marginTop: 24 },
	sectionTitle: {
		fontSize: 24,
		fontWeight: '500',
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		justifyContent: 'space-between',
		height: 56,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderColor: '#efefef',
	},
	rowLabel: { fontSize: 16, fontWeight: '400' },

	/* Sub-label (e.g. "Face ID") */
	badge: {
		marginTop: 4,
		fontSize: 13,
		color: '#05c000', // Robinhood-like green
		fontWeight: '600',
	},
});
