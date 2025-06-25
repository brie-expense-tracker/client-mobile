import React, { useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	Alert,
	Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';

export default function DataPrivacySettingsScreen() {
	const router = useRouter();

	// Toggle states (replace with values from backend or context)
	const [shareAnalytics, setShareAnalytics] = useState(true);
	const [aiDataConsent, setAiDataConsent] = useState(true);
	const [personalizedOffers, setPersonalizedOffers] = useState(false);
	const [emailUpdates, setEmailUpdates] = useState(true);

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Data & Privacy' }} />
			<ScrollView contentContainerStyle={styles.container}>
				{/* ----- Data Collection ----- */}
				<Section title="Data Collection">
					<SectionSubtext>
						Control how your data is used to improve the app and provide
						insights
					</SectionSubtext>
					<Row
						label="Share anonymous analytics"
						value={shareAnalytics}
						onValueChange={setShareAnalytics}
					/>
					<Row
						label="Allow spending data for AI insights"
						value={aiDataConsent}
						onValueChange={setAiDataConsent}
					/>
				</Section>

				{/* ----- Personalization & Ads ----- */}
				<Section title="Personalization">
					<SectionSubtext>
						Customize your experience with personalized content and offers
					</SectionSubtext>
					<Row
						label="Show personalized offers"
						value={personalizedOffers}
						onValueChange={setPersonalizedOffers}
					/>
				</Section>

				{/* ----- Notifications & Marketing ----- */}
				<Section title="Notifications & Marketing">
					<SectionSubtext>
						Manage how we communicate with you about updates and features
					</SectionSubtext>
					<Row
						label="Product update emails"
						value={emailUpdates}
						onValueChange={setEmailUpdates}
					/>
				</Section>

				{/* ----- Account & Data Control ----- */}
				<Section title="Account & Data Control">
					<SectionSubtext>
						Manage your account data and privacy settings
					</SectionSubtext>
					<ActionButton
						label="Download my data"
						onPress={() => {
							router.push('/settings/dataandprivacy/exportData');
						}}
					/>
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

/* ---------- Reusable Components ---------- */

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<View style={{ marginBottom: 32 }}>
		<Text style={styles.sectionHeader}>{title}</Text>
		{children}
	</View>
);

const SectionSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.sectionSubtext}>{children}</Text>
);

const Row = ({
	label,
	value,
	onValueChange,
}: {
	label: string;
	value: boolean;
	onValueChange: (v: boolean) => void;
}) => (
	<View style={styles.row}>
		<Text style={styles.rowLabel}>{label}</Text>
		<Switch value={value} onValueChange={onValueChange} />
	</View>
);

const ActionButton = ({
	label,
	onPress,
	destructive = false,
}: {
	label: string;
	onPress: () => void;
	destructive?: boolean;
}) => (
	<RectButton
		style={[styles.actionButton, destructive && styles.destructiveButton]}
		onPress={onPress}
	>
		<Text
			style={[styles.actionButtonText, destructive && styles.destructiveText]}
		>
			{label}
		</Text>
	</RectButton>
);

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { padding: 24, paddingBottom: 48 },
	sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
	sectionSubtext: { fontSize: 12, color: '#666', marginBottom: 12 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	rowLabel: { fontSize: 16, color: '#333', flexShrink: 1 },
	linkText: { color: '#007AFF' },
	actionButton: {
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#EFEFF4',
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	actionButtonText: { fontSize: 16, fontWeight: '500', color: '#333' },
	destructiveButton: { backgroundColor: '#FDEBEB', borderColor: '#F5C6C6' },
	destructiveText: { color: '#D11A2A' },
});
