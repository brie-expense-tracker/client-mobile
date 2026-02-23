import React, { useState, useEffect } from 'react';
import { logger } from '../../../src/utils/logger';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuth from '../../../src/context/AuthContext';
import { setUseLocalMode } from '../../../src/storage/localModeStorage';
import ConnectivityTest from '../../../src/components/ConnectivityTest';
import {
	useFeature,
	setLocalOverride,
	clearLocalOverrides,
	debugFeatureFlags,
} from '../../../src/config/features';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';
import { useBriePro } from '../../../src/hooks/useBriePro';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	AppRow,
} from '../../../src/ui/primitives';

// Development mode toggle - controls visibility of debug/testing features
const SHOW_DEBUG_SECTION = false;

/* --------------------------------- UI --------------------------------- */

type Item = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	route?: string;
	onPress?: () => void;
	description?: string;
};

function Section({ title, items }: { title: string; items: Item[] }) {
	return (
		<View style={styles.section}>
			<AppText.Label color="subtle" style={styles.sectionTitle}>
				{title}
			</AppText.Label>

			<AppCard padding={0} borderRadius={12}>
				{items.map((item, index) => (
					<AppRow
						key={item.label}
						icon={item.icon}
						label={item.label}
						description={item.description}
						onPress={item.onPress}
						bordered={index < items.length - 1}
					/>
				))}
			</AppCard>
		</View>
	);
}

/* ---------------------------- Screen ---------------------------- */

export default function SettingsScreen() {
	const router = useRouter();
	const { logout, user } = useAuth();
	const { isPro } = useBriePro();
	const aiInsightsEnabled = useFeature('aiInsights');
	const aiInsightsPreviewEnabled = useFeature('aiInsightsPreview');
	const newBudgetsV2Enabled = useFeature('newBudgetsV2');
	const goalsTimelineEnabled = useFeature('goalsTimeline');

	// Force re-render when feature flags change
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		logger.debug('🔧 [Settings] Feature flags updated:', {
			aiInsights: aiInsightsEnabled,
			aiInsightsPreview: aiInsightsPreviewEnabled,
			newBudgetsV2: newBudgetsV2Enabled,
			goalsTimeline: goalsTimelineEnabled,
		});
		logger.debug('🔧 [Settings] Environment variables:', {
			EXPO_PUBLIC_AI_INSIGHTS: process.env.EXPO_PUBLIC_AI_INSIGHTS,
			EXPO_PUBLIC_AI_INSIGHTS_PREVIEW:
				process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW,
			EXPO_PUBLIC_NEW_BUDGETS_V2: process.env.EXPO_PUBLIC_NEW_BUDGETS_V2,
			EXPO_PUBLIC_GOALS_TIMELINE: process.env.EXPO_PUBLIC_GOALS_TIMELINE,
		});
	}, [
		aiInsightsEnabled,
		aiInsightsPreviewEnabled,
		newBudgetsV2Enabled,
		goalsTimelineEnabled,
	]);

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			logger.error('Logout error:', error);
		}
	};

	const toggleAIInsights = async () => {
		try {
			const newValue = !aiInsightsEnabled;
			await setLocalOverride('aiInsights', newValue);
			logger.debug('AI Insights toggled:', newValue);
			setRefreshKey((prev) => prev + 1);
		} catch (error) {
			logger.error('Failed to toggle AI Insights:', error);
		}
	};

	const toggleAIInsightsPreview = async () => {
		try {
			const newValue = !aiInsightsPreviewEnabled;
			await setLocalOverride('aiInsightsPreview', newValue);
			logger.debug('AI Insights Preview toggled:', newValue);
			setRefreshKey((prev) => prev + 1);
		} catch (error) {
			logger.error('Failed to toggle AI Insights Preview:', error);
		}
	};

	const toggleNewBudgetsV2 = async () => {
		try {
			const newValue = !newBudgetsV2Enabled;
			await setLocalOverride('newBudgetsV2', newValue);
			logger.debug('New Budgets V2 toggled:', newValue);
			setRefreshKey((prev) => prev + 1);
		} catch (error) {
			logger.error('Failed to toggle New Budgets V2:', error);
		}
	};

	const toggleGoalsTimeline = async () => {
		try {
			const newValue = !goalsTimelineEnabled;
			await setLocalOverride('goalsTimeline', newValue);
			logger.debug('Goals Timeline toggled:', newValue);
			setRefreshKey((prev) => prev + 1);
		} catch (error) {
			logger.error('Failed to toggle Goals Timeline:', error);
		}
	};

	const resetLabs = async () => {
		try {
			clearLocalOverrides();
			logger.debug('Labs settings reset - cleared local overrides');
			logger.debug(
				'Note: Environment variables (.env) cannot be reset at runtime'
			);
			logger.debug('Current base values from .env:');
			logger.debug(
				'- EXPO_PUBLIC_AI_INSIGHTS:',
				process.env.EXPO_PUBLIC_AI_INSIGHTS
			);
			logger.debug(
				'- EXPO_PUBLIC_AI_INSIGHTS_PREVIEW:',
				process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW
			);
			setRefreshKey((prev) => prev + 1);
		} catch (error) {
			logger.error('Failed to reset labs:', error);
		}
	};

	const accountItems: Item[] = [
		{
			label: 'Profile',
			icon: 'person-outline',
			onPress: () => router.push('/(stack)/settings/profile'),
		},
		{
			label: 'Subscription',
			icon: 'card-outline',
			onPress: () => router.push('/(stack)/settings/subscription'),
		},
		{
			label: 'Onboarding',
			icon: 'rocket-outline',
			onPress: () => router.push('/(onboarding)/profileSetup'),
			description: 'Revisit the onboarding flow',
		},
	];

	const notificationItems: Item[] = [
		{
			label: 'Notifications',
			icon: 'notifications-outline',
			onPress: () => router.push('/(stack)/settings/notification'),
		},
	];

	const dataItems: Item[] = [
		{
			label: 'Data Export',
			icon: 'download-outline',
			description: 'Plus',
			onPress: () => router.push('/(stack)/settings/privacyandsecurity/downloadData'),
		},
	];

	const handleSignInToSync = async () => {
		await setUseLocalMode(false);
		router.replace('/(auth)/login');
	};

	return (
		<AppScreen key={refreshKey}>
			{/* Header */}
			<View style={styles.headerSection}>
				<AppText.Title>Settings</AppText.Title>
				<AppText.Subtitle color="subtle" style={styles.headerDescription}>
					Manage your account and preferences.
				</AppText.Subtitle>
			</View>

			{/* MVP: Sign in prompt when using local-only mode */}
			{!user && (
				<View style={styles.section}>
					<AppCard onPress={handleSignInToSync}>
						<View style={styles.signInPrompt}>
							<Ionicons name="cloud-upload-outline" size={24} color={palette.primary} />
							<View style={{ flex: 1 }}>
								<AppText.Heading>Sign in to backup and sync</AppText.Heading>
								<AppText.Caption color="muted" style={{ marginTop: 4 }}>
									Create an account to save your data to the cloud and use it on other devices.
								</AppText.Caption>
							</View>
							<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
						</View>
					</AppCard>
				</View>
			)}

			{/* Debug / Testing - Only show when enabled */}
			{__DEV__ && SHOW_DEBUG_SECTION && (
				<View style={styles.section}>
					<Text
						style={[
							type.labelSm,
							styles.sectionTitle,
							{ color: palette.textSubtle },
						]}
					>
						Debug & Testing
					</Text>
					<View
						style={[
							styles.cardNoRows,
							{
								backgroundColor: palette.surface,
								borderColor: palette.border,
							},
						]}
					>
						<ConnectivityTest />

						{/* AI Insights Toggle */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								AI Insights
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: aiInsightsEnabled
											? palette.successSubtle
											: palette.subtle,
										borderColor: aiInsightsEnabled
											? palette.success
											: palette.border,
									},
								]}
								onPress={toggleAIInsights}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color: aiInsightsEnabled
												? palette.success
												: palette.textSubtle,
										},
									]}
								>
									{aiInsightsEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* AI Insights Preview Toggle */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								AI Insights Preview
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: aiInsightsPreviewEnabled
											? palette.successSubtle
											: palette.subtle,
										borderColor: aiInsightsPreviewEnabled
											? palette.success
											: palette.border,
									},
								]}
								onPress={toggleAIInsightsPreview}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color: aiInsightsPreviewEnabled
												? palette.success
												: palette.textSubtle,
										},
									]}
								>
									{aiInsightsPreviewEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* New Budgets V2 Toggle */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								New Budgets V2
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: newBudgetsV2Enabled
											? palette.successSubtle
											: palette.subtle,
										borderColor: newBudgetsV2Enabled
											? palette.success
											: palette.border,
									},
								]}
								onPress={toggleNewBudgetsV2}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color: newBudgetsV2Enabled
												? palette.success
												: palette.textSubtle,
										},
									]}
								>
									{newBudgetsV2Enabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Goals Timeline Toggle */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								Goals Timeline
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: goalsTimelineEnabled
											? palette.successSubtle
											: palette.subtle,
										borderColor: goalsTimelineEnabled
											? palette.success
											: palette.border,
									},
								]}
								onPress={toggleGoalsTimeline}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color: goalsTimelineEnabled
												? palette.success
												: palette.textSubtle,
										},
									]}
								>
									{goalsTimelineEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Feature Flag Status */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								Base Values (.env)
							</Text>
							<View style={styles.debugValueContainer}>
								<Text
									style={[styles.debugValue, { color: palette.textSubtle }]}
								>
									AI: {process.env.EXPO_PUBLIC_AI_INSIGHTS || 'undefined'}
								</Text>
								<Text
									style={[styles.debugValue, { color: palette.textSubtle }]}
								>
									Preview:{' '}
									{process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW || 'undefined'}
								</Text>
								<Text
									style={[styles.debugValue, { color: palette.textSubtle }]}
								>
									Budgets:{' '}
									{process.env.EXPO_PUBLIC_NEW_BUDGETS_V2 || 'undefined'}
								</Text>
								<Text
									style={[styles.debugValue, { color: palette.textSubtle }]}
								>
									Goals: {process.env.EXPO_PUBLIC_GOALS_TIMELINE || 'undefined'}
								</Text>
							</View>
						</View>

						{/* Debug Feature Flags Button */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								Debug Flags
							</Text>
							<TouchableOpacity
								style={styles.debugButton}
								onPress={() => {
									logger.debug('🔧 [Settings] Debug button pressed!');
									logger.debug(
										'🔧 [Settings] debugFeatureFlags function:',
										typeof debugFeatureFlags
									);
									try {
										debugFeatureFlags();
										logger.debug(
											'🔧 [Settings] debugFeatureFlags called successfully'
										);
									} catch (error) {
										logger.error(
											'🔧 [Settings] Error calling debugFeatureFlags:',
											error
										);
									}
								}}
							>
								<Text style={styles.debugButtonText}>Debug</Text>
							</TouchableOpacity>
						</View>

						{/* Reset Labs Button */}
						<View style={styles.debugRow}>
							<Text
								style={[type.body, styles.debugLabel, { color: palette.text }]}
							>
								Reset Labs
							</Text>
							<TouchableOpacity style={styles.resetButton} onPress={resetLabs}>
								<Text style={styles.resetText}>Reset</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}

			{/* Sections - only show when signed in */}
			{user && (
				<>
					<Section title="Account" items={accountItems} />
					<Section title="Notifications" items={notificationItems} />
					{isPro && <Section title="Data" items={dataItems} />}
				</>
			)}

			{/* Logout - only when signed in */}
			{user && (
				<View style={styles.logoutContainer}>
					<AppButton
						label="Logout"
						variant="secondary"
						icon="log-out-outline"
						iconPosition="left"
						onPress={handleLogout}
						fullWidth
					/>
				</View>
			)}
		</AppScreen>
	);
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
	/* Header */
	headerSection: {
		paddingHorizontal: space.sm,
		paddingTop: space.lg,
		paddingBottom: space.sm,
	},
	headerDescription: {
		marginTop: space.xs,
	},

	/* Sections */
	section: {
		marginHorizontal: space.sm,
		marginTop: space.md,
	},
	sectionTitle: {
		marginBottom: space.xs,
	},

	/* Legacy card for debug block (no row dividers) */
	cardNoRows: {
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space.md,
		...shadow.card,
	},

	/* Logout */
	logoutContainer: {
		marginTop: space.lg,
		marginBottom: space.xl,
	},

	/* Debug Toggle / Labs */
	debugRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: space.sm,
		paddingTop: space.sm,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
	},
	debugLabel: {
		fontSize: 14,
		fontWeight: '500',
	},
	debugValue: {
		fontSize: 12,
		fontWeight: '400',
		fontFamily: 'monospace',
	},
	debugValueContainer: {
		flex: 1,
		marginLeft: space.sm,
	},
	toggleButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		minWidth: 64,
		alignItems: 'center',
		borderWidth: 1,
	},
	toggleText: {
		fontSize: 12,
		fontWeight: '600',
	},
	signInPrompt: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	resetButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		backgroundColor: palette.dangerSubtle,
		minWidth: 64,
		alignItems: 'center',
	},
	resetText: {
		color: palette.danger,
		fontSize: 12,
		fontWeight: '600',
	},
	debugButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		backgroundColor: palette.primarySubtle,
		minWidth: 64,
		alignItems: 'center',
	},
	debugButtonText: {
		color: palette.primary,
		fontSize: 12,
		fontWeight: '600',
	},
});
