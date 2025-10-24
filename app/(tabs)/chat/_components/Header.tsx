import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	Text,
	StyleSheet,
	View,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InterfaceMode } from '../../../../src/services/assistant/types';

interface HeaderProps {
	onOpenSettings: () => void;
	currentUsage: any;
	interfaceMode: InterfaceMode;
	onModeChange: (mode: InterfaceMode) => void;
	hasProfileUpdates?: boolean;
}

export default function Header({
	onOpenSettings,
	currentUsage,
	interfaceMode,
	onModeChange,
	hasProfileUpdates,
}: HeaderProps) {
	const [showUsageIndicator, setShowUsageIndicator] = useState(false);
	const [usagePercent, setUsagePercent] = useState(0);

	// Check if user is approaching limits for subtle usage indicator
	useEffect(() => {
		if (!currentUsage || currentUsage.subscriptionTier !== 'free') {
			setShowUsageIndicator(false);
			return;
		}

		// Debug logging to see actual usage values
		console.log('🔍 [Header] Current usage:', {
			tokens: `${currentUsage.currentTokens}/${currentUsage.tokenLimit}`,
			requests: `${currentUsage.currentRequests}/${currentUsage.requestLimit}`,
			conversations: `${currentUsage.currentConversations}/${currentUsage.conversationLimit}`,
		});

		// Calculate real usage percentages
		const tokenUsagePercent =
			(currentUsage.currentTokens / currentUsage.tokenLimit) * 100;
		const requestUsagePercent =
			(currentUsage.currentRequests / currentUsage.requestLimit) * 100;
		const conversationUsagePercent =
			(currentUsage.currentConversations / currentUsage.conversationLimit) *
			100;

		console.log('🔍 [Header] Usage percentages:', {
			tokens: tokenUsagePercent.toFixed(1) + '%',
			requests: requestUsagePercent.toFixed(1) + '%',
			conversations: conversationUsagePercent.toFixed(1) + '%',
		});

		// Get the highest usage percentage
		const maxUsagePercent = Math.max(
			tokenUsagePercent,
			requestUsagePercent,
			conversationUsagePercent
		);

		// Only show indicator when actually approaching limits (above 60%)
		if (maxUsagePercent > 60) {
			console.log(
				'🔍 [Header] Showing usage indicator at',
				maxUsagePercent.toFixed(1) + '%'
			);
			setUsagePercent(maxUsagePercent);
			setShowUsageIndicator(true);
		} else {
			console.log('🔍 [Header] Hiding usage indicator (usage below 60%)');
			setShowUsageIndicator(false);
		}
	}, [currentUsage]);

	const getModeIcon = (mode: InterfaceMode) => {
		switch (mode) {
			case 'CHAT':
				return 'chatbubbles';
			case 'INSIGHTS':
				return 'analytics';
			case 'ACTIONS':
				return 'flash';
			case 'ANALYTICS':
				return 'trending-up';
			default:
				return 'sparkles';
		}
	};

	const getModeColor = (mode: InterfaceMode) => {
		switch (mode) {
			case 'CHAT':
				return '#3b82f6';
			case 'INSIGHTS':
				return '#8b5cf6';
			case 'ACTIONS':
				return '#10b981';
			case 'ANALYTICS':
				return '#f59e0b';
			default:
				return '#3b82f6';
		}
	};

	return (
		<View style={styles.headerWrap}>
			<SafeAreaView>
				<View style={styles.headerRow}>
					<View style={styles.brandRow}>
						<Ionicons name="sparkles" size={18} color="#1e3b21" />
						<Text style={styles.brandText}>Brie AI</Text>

						{/* Profile update indicator */}
						{hasProfileUpdates && (
							<View style={styles.profileUpdateIndicator}>
								<Ionicons name="refresh" size={12} color="#10b981" />
								<Text style={styles.profileUpdateText}>Profile Updated</Text>
							</View>
						)}

						{/* Mode indicator */}
						<View style={styles.modeIndicator}>
							<Ionicons
								name={getModeIcon(interfaceMode)}
								size={16}
								color={getModeColor(interfaceMode)}
							/>
							<Text
								style={[
									styles.modeText,
									{ color: getModeColor(interfaceMode) },
								]}
							>
								{interfaceMode.charAt(0).toUpperCase() + interfaceMode.slice(1)}
							</Text>
						</View>
					</View>

					<TouchableOpacity
						accessibilityRole="button"
						onPress={onOpenSettings}
						accessibilityLabel="Open AI insight settings"
						style={styles.settingsButton}
					>
						<Ionicons name="ellipsis-horizontal" size={20} color="#64748b" />
					</TouchableOpacity>
				</View>

				{/* Subtle usage indicator - only show when approaching limits */}
				{showUsageIndicator && (
					<View style={styles.usageIndicator}>
						<View style={styles.usageBar}>
							<View
								style={[
									styles.usageFill,
									{
										width: `${Math.min(usagePercent, 100)}%`,
										backgroundColor:
											usagePercent > 80
												? '#ff6b6b'
												: usagePercent > 60
												? '#ffa726'
												: '#4caf50',
									},
								]}
							/>
						</View>
						<Text style={styles.usageText}>
							{usagePercent > 80
								? 'High usage'
								: usagePercent > 60
								? 'Moderate usage'
								: 'Normal usage'}
						</Text>
					</View>
				)}
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	headerWrap: {
		position: 'relative',
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	brandText: {
		color: '#1e293b',
		fontWeight: '600',
		fontSize: 20,
		letterSpacing: -0.2,
	},
	profileUpdateIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ecfdf5',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
		gap: 4,
		marginLeft: 8,
	},
	profileUpdateText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#10b981',
	},
	settingsButton: {
		padding: 6,
		borderRadius: 16,
		backgroundColor: 'transparent',
	},
	// Subtle usage indicator
	usageIndicator: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: '#241499',
		borderBottomWidth: 1,
		borderBottomColor: '#fde68a',
		paddingVertical: 4,
		paddingHorizontal: 10,
		zIndex: 1,
		alignItems: 'center',
	},
	usageBar: {
		width: '80%',
		height: 6,
		backgroundColor: '#e7f0e2',
		borderRadius: 3,
		overflow: 'hidden',
	},
	usageFill: {
		height: '100%',
		borderRadius: 3,
	},
	usageText: {
		fontSize: 12,
		color: '#92400e',
		fontWeight: '600',
		marginTop: 4,
	},
	// Mode indicator
	modeIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eff6ff',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 4,
	},
	modeText: {
		fontSize: 12,
		fontWeight: '600',
	},
});
