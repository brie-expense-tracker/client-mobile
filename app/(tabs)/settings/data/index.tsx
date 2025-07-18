import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	Alert,
} from 'react-native';
import { useRouter , Stack } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import { useProfile } from '../../../../src/context/profileContext';

export default function DataPrivacySettingsScreen() {
	const router = useRouter();
	const { profile, updateAIInsightsSettings } = useProfile();

	// Initialize state from profile
	const [aiDataConsent, setAiDataConsent] = useState(true);

	// Update local state when profile loads
	useEffect(() => {
		if (profile?.preferences?.aiInsights) {
			setAiDataConsent(profile.preferences.aiInsights.enabled);
		}
	}, [profile]);

	// Handle AI data consent toggle
	const handleAiDataConsentChange = async (value: boolean) => {
		try {
			setAiDataConsent(value);
			await updateAIInsightsSettings({ enabled: value });
		} catch (error) {
			Alert.alert('Error', 'Failed to update AI insights settings');
			setAiDataConsent(!value); // Revert on error
		}
	};

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Data & Privacy' }} />
			<ScrollView contentContainerStyle={styles.container}>
				{/* ----- Data Collection ----- */}
				<Section title="Data Collection">
					<SectionSubtext>
						Control how your data is used to provide AI-powered financial
						insights
					</SectionSubtext>
					<Row
						label="Allow spending data for AI insights"
						value={aiDataConsent}
						onValueChange={handleAiDataConsentChange}
					/>
					<Text style={styles.settingDescription}>
						When enabled, your transaction data is used to generate personalized
						financial insights and recommendations. Data is processed securely
						and never shared with third parties.
					</Text>
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
	settingDescription: {
		fontSize: 14,
		color: '#666',
		marginTop: 8,
		lineHeight: 20,
		fontStyle: 'italic',
	},
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
