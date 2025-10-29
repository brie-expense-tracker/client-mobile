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
import { useTheme } from '../../../src/context/ThemeContext';
import ConnectivityTest from '../../../src/components/ConnectivityTest';
import {
	useFeature,
	setLocalOverride,
	clearLocalOverrides,
	debugFeatureFlags,
} from '../../../src/config/features';

// Development mode toggle - controls visibility of debug/testing features
const SHOW_DEBUG_SECTION = false;

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
			// Navigation is handled automatically by AuthContext when firebaseUser becomes null
		} catch (error) {
			logger.error('Logout error:', error);
		}
	};

	const toggleAIInsights = async () => {
		try {
			const newValue = !aiInsightsEnabled;
			await setLocalOverride('aiInsights', newValue);
			logger.debug('AI Insights toggled:', newValue);
			setRefreshKey((prev) => prev + 1); // Force re-render
		} catch (error) {
			logger.error('Failed to toggle AI Insights:', error);
		}
	};

	const toggleAIInsightsPreview = async () => {
		try {
			const newValue = !aiInsightsPreviewEnabled;
			await setLocalOverride('aiInsightsPreview', newValue);
			logger.debug('AI Insights Preview toggled:', newValue);
			setRefreshKey((prev) => prev + 1); // Force re-render
		} catch (error) {
			logger.error('Failed to toggle AI Insights Preview:', error);
		}
	};

	const toggleNewBudgetsV2 = async () => {
		try {
			const newValue = !newBudgetsV2Enabled;
			await setLocalOverride('newBudgetsV2', newValue);
			logger.debug('New Budgets V2 toggled:', newValue);
			setRefreshKey((prev) => prev + 1); // Force re-render
		} catch (error) {
			logger.error('Failed to toggle New Budgets V2:', error);
		}
	};

	const toggleGoalsTimeline = async () => {
		try {
			const newValue = !goalsTimelineEnabled;
			await setLocalOverride('goalsTimeline', newValue);
			logger.debug('Goals Timeline toggled:', newValue);
			setRefreshKey((prev) => prev + 1); // Force re-render
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
			setRefreshKey((prev) => prev + 1); // Force re-render
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
			style={[styles.container, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Debug / Testing (kept simple and white) - Only show when enabled */}
			{__DEV__ && SHOW_DEBUG_SECTION && (
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

						{/* AI Insights Toggle */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								AI Insights
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: aiInsightsEnabled ? '#10b981' : '#e5e7eb',
									},
								]}
								onPress={toggleAIInsights}
							>
								<Text style={styles.toggleText}>
									{aiInsightsEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* AI Insights Preview Toggle */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								AI Insights Preview
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: aiInsightsPreviewEnabled
											? '#10b981'
											: '#e5e7eb',
									},
								]}
								onPress={toggleAIInsightsPreview}
							>
								<Text style={styles.toggleText}>
									{aiInsightsPreviewEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* New Budgets V2 Toggle */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								New Budgets V2
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: newBudgetsV2Enabled
											? '#10b981'
											: '#e5e7eb',
									},
								]}
								onPress={toggleNewBudgetsV2}
							>
								<Text style={styles.toggleText}>
									{newBudgetsV2Enabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Goals Timeline Toggle */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								Goals Timeline
							</Text>
							<TouchableOpacity
								style={[
									styles.toggleButton,
									{
										backgroundColor: goalsTimelineEnabled
											? '#10b981'
											: '#e5e7eb',
									},
								]}
								onPress={toggleGoalsTimeline}
							>
								<Text style={styles.toggleText}>
									{goalsTimelineEnabled ? 'ON' : 'OFF'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Feature Flag Status */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								Base Values (.env)
							</Text>
							<View style={styles.debugValueContainer}>
								<Text style={[styles.debugValue, { color: colors.subtext }]}>
									AI: {process.env.EXPO_PUBLIC_AI_INSIGHTS || 'undefined'}
								</Text>
								<Text style={[styles.debugValue, { color: colors.subtext }]}>
									Preview:{' '}
									{process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW || 'undefined'}
								</Text>
								<Text style={[styles.debugValue, { color: colors.subtext }]}>
									Budgets:{' '}
									{process.env.EXPO_PUBLIC_NEW_BUDGETS_V2 || 'undefined'}
								</Text>
								<Text style={[styles.debugValue, { color: colors.subtext }]}>
									Goals: {process.env.EXPO_PUBLIC_GOALS_TIMELINE || 'undefined'}
								</Text>
							</View>
						</View>

						{/* Debug Feature Flags Button */}
						<View style={styles.debugRow}>
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								Debug Flags
							</Text>
							<TouchableOpacity
								style={[styles.debugButton]}
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
							<Text style={[styles.debugLabel, { color: colors.text }]}>
								Reset Labs
							</Text>
							<TouchableOpacity
								style={[styles.resetButton]}
								onPress={resetLabs}
							>
								<Text style={styles.resetText}>Reset</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}

			{/* Sections */}
			<Section title="Account" items={accountItems} colors={colors} />
			<Section
				title="Notifications"
				items={notificationItems}
				colors={colors}
			/>

			<Section title="Support" items={supportItems} colors={colors} />
			<Section title="Legal" items={legalItems} colors={colors} />

			{/* Logout */}
			<View style={styles.logoutContainer}>
				<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
					<Ionicons name="log-out-outline" size={20} color="#6B7280" />
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
		paddingVertical: 12,
		backgroundColor: 'transparent',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	logoutText: {
		color: '#6B7280',
		fontSize: 15,
		fontWeight: '500',
		marginLeft: 8,
	},

	/* Debug Toggle */
	debugRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
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
		marginLeft: 8,
	},
	toggleButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		minWidth: 50,
		alignItems: 'center',
	},
	toggleText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	resetButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#ef4444',
		minWidth: 50,
		alignItems: 'center',
	},
	resetText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	debugButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#3b82f6',
		minWidth: 50,
		alignItems: 'center',
	},
	debugButtonText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
});
