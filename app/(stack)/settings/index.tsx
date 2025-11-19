import React, { useState, useEffect } from 'react';
import { logger } from '../../../src/utils/logger';
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
import {
	useFeature,
	setLocalOverride,
	clearLocalOverrides,
	debugFeatureFlags,
} from '../../../src/config/features';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';

// Development mode toggle - controls visibility of debug/testing features
const SHOW_DEBUG_SECTION = false;

/* --------------------------------- UI --------------------------------- */

type Item = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	route?: string;
	onPress?: () => void;
	// Optional subtitle if you want to mirror Legal descriptions later
	description?: string;
};

function Section({ title, items }: { title: string; items: Item[] }) {
	return (
		<View style={styles.section}>
			<Text style={[type.labelSm, { color: palette.textSubtle }]}>{title}</Text>

			{/* Legal-style card */}
			<View style={styles.settingsContainer}>
				{items.map((item) => (
					<TouchableOpacity
						key={item.label}
						style={[
							styles.settingItem,
							{
								borderBottomWidth: 1,
								borderBottomColor: '#f0f0f0',
							},
						]}
						onPress={item.onPress}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={item.label}
						accessibilityHint={`Open ${item.label} settings`}
					>
						<Ionicons
							name={item.icon}
							size={24}
							color={palette.textMuted}
							accessibilityElementsHidden
							importantForAccessibility="no"
						/>
						<View style={styles.settingContent}>
							<Text
								style={[styles.settingText, { color: palette.textSecondary }]}
							>
								{item.label}
							</Text>
							{item.description ? (
								<Text
									style={[
										styles.settingDescription,
										{ color: palette.textSubtle },
									]}
								>
									{item.description}
								</Text>
							) : null}
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color="#BEBEBE"
							accessibilityElementsHidden
							importantForAccessibility="no"
						/>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}

/* ---------------------------- Screen ---------------------------- */

export default function SettingsScreen() {
	const router = useRouter();
	const { logout } = useAuth();
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
			label: 'Privacy & Security',
			icon: 'shield-outline',
			onPress: () => router.push('/(stack)/settings/privacyandsecurity'),
		},
	];

	const notificationItems: Item[] = [
		{
			label: 'Notification Settings',
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
		{
			label: 'FAQ',
			icon: 'help-circle-outline',
			onPress: () => router.push('/(stack)/settings/faq'),
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
			key={refreshKey}
			style={[styles.container, { backgroundColor: palette.bg }]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Optional header to match LegalDocumentsScreen vibe more */}
			<View style={styles.headerSection}>
				<Text style={[styles.headerTitle, { color: palette.text }]}>
					Settings
				</Text>
				<Text
					style={[
						type.bodySm,
						styles.headerDescription,
						{ color: palette.textSubtle },
					]}
				>
					Manage your account, notifications, privacy, and app preferences.
				</Text>
			</View>

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

			{/* Sections (now styled like Legal) */}
			<Section title="Account" items={accountItems} />
			<Section title="Notifications" items={notificationItems} />
			<Section title="Support" items={supportItems} />
			<Section title="Legal" items={legalItems} />

			{/* Logout */}
			<View style={[styles.logoutContainer, { paddingHorizontal: space.lg }]}>
				<TouchableOpacity
					style={[
						styles.logoutButton,
						{
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
					onPress={handleLogout}
					activeOpacity={0.8}
				>
					<Ionicons
						name="log-out-outline"
						size={18}
						color={palette.textMuted}
					/>
					<Text
						style={[type.body, styles.logoutText, { color: palette.textMuted }]}
					>
						Logout
					</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: space.xxl,
		paddingHorizontal: space.lg,
	},

	/* Header */
	headerSection: {
		paddingHorizontal: space.sm,
		paddingTop: space.lg,
		paddingBottom: space.sm,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '700',
		marginBottom: space.xs,
	},
	headerDescription: {
		lineHeight: 20,
	},

	/* Sections */
	section: {
		marginHorizontal: space.sm,
		marginTop: space.md,
	},

	sectionTitle: {
		marginBottom: space.xs,
	},

	/* Card container */
	settingsContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
	},

	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		minHeight: 64,
	},
	settingContent: {
		flex: 1,
		marginLeft: 12,
	},
	settingText: {
		fontSize: 16,
		fontWeight: '500',
		marginBottom: 2,
	},
	settingDescription: {
		fontSize: 14,
		lineHeight: 18,
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
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.md,
		borderRadius: radius.lg,
		borderWidth: 1,
	},
	logoutText: {
		marginLeft: space.sm,
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
