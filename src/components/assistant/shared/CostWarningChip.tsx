import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type WarningType =
	| 'pro_limit_near'
	| 'cost_spike'
	| 'performance_regression'
	| 'cache_miss_high'
	| 'token_usage_spike'
	| 'model_fallback'
	| 'rate_limit_warning';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface CostWarningChipProps {
	type: WarningType;
	message: string;
	severity: SeverityLevel;
	onDismiss?: () => void;
	onAction?: () => void;
	actionLabel?: string;
	showIcon?: boolean;
	showTypeIcon?: boolean;
	animated?: boolean;
	accessibilityLabel?: string;
	accessibilityHint?: string;
}

export default function CostWarningChip({
	type,
	message,
	severity,
	onDismiss,
	onAction,
	actionLabel,
	showIcon = true,
	showTypeIcon = false,
	animated = true,
	accessibilityLabel,
	accessibilityHint,
}: CostWarningChipProps) {
	const getSeverityColor = () => {
		switch (severity) {
			case 'critical':
				return '#dc2626'; // Dark red
			case 'high':
				return '#ef4444'; // Red
			case 'medium':
				return '#f59e0b'; // Amber
			case 'low':
				return '#3b82f6'; // Blue
			default:
				return '#6b7280'; // Gray
		}
	};

	const getSeverityIcon = () => {
		switch (severity) {
			case 'critical':
				return 'alert-circle';
			case 'high':
				return 'warning';
			case 'medium':
				return 'information-circle';
			case 'low':
				return 'checkmark-circle';
			default:
				return 'help-circle';
		}
	};

	const getTypeIcon = () => {
		switch (type) {
			case 'pro_limit_near':
				return 'trending-up';
			case 'cost_spike':
				return 'trending-up';
			case 'performance_regression':
				return 'speedometer';
			case 'cache_miss_high':
				return 'refresh';
			case 'token_usage_spike':
				return 'pulse';
			case 'model_fallback':
				return 'swap-horizontal';
			case 'rate_limit_warning':
				return 'time';
			default:
				return 'information-circle';
		}
	};

	const getAccessibilityLabel = () => {
		if (accessibilityLabel) return accessibilityLabel;
		return `${severity} severity warning: ${message}`;
	};

	const getAccessibilityHint = () => {
		if (accessibilityHint) return accessibilityHint;
		let hint = 'Double tap to ';
		if (onAction && actionLabel) {
			hint += actionLabel.toLowerCase();
		} else if (onDismiss) {
			hint += 'dismiss this warning';
		} else {
			hint += 'interact with this warning';
		}
		return hint;
	};

	return (
		<View
			style={[
				styles.container,
				{ borderLeftColor: getSeverityColor() },
				severity === 'critical' && styles.criticalContainer,
			]}
			accessibilityRole="alert"
			accessibilityLabel={getAccessibilityLabel()}
			accessibilityHint={getAccessibilityHint()}
		>
			{showIcon && (
				<View style={styles.iconContainer}>
					<Ionicons
						name={
							showTypeIcon ? (getTypeIcon() as any) : (getSeverityIcon() as any)
						}
						size={16}
						color={getSeverityColor()}
					/>
				</View>
			)}

			<View style={styles.content}>
				<Text
					style={[
						styles.message,
						severity === 'critical' && styles.criticalMessage,
					]}
				>
					{message}
				</Text>

				{onAction && actionLabel && (
					<TouchableOpacity
						style={[styles.actionButton, { borderColor: getSeverityColor() }]}
						onPress={onAction}
						accessibilityRole="button"
						accessibilityLabel={actionLabel}
					>
						<Text
							style={[styles.actionButtonText, { color: getSeverityColor() }]}
						>
							{actionLabel}
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{onDismiss && (
				<TouchableOpacity
					style={styles.dismissButton}
					onPress={onDismiss}
					accessibilityRole="button"
					accessibilityLabel="Dismiss warning"
				>
					<Ionicons name="close" size={16} color="#9ca3af" />
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#ffffff',
		borderLeftWidth: 4,
		padding: 12,
		marginVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	criticalContainer: {
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 4,
	},
	iconContainer: {
		marginRight: 12,
		marginTop: 2,
	},
	content: {
		flex: 1,
	},
	message: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 8,
	},
	criticalMessage: {
		fontWeight: '600',
		color: '#dc2626',
	},
	actionButton: {
		alignSelf: 'flex-start',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 6,
		backgroundColor: '#f9fafb',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: '500',
	},
	dismissButton: {
		padding: 4,
		marginLeft: 8,
		marginTop: 2,
	},
});

// Utility functions for creating warning chips
export const createWarningChip = (
	type: WarningType,
	message: string,
	severity: SeverityLevel,
	options?: {
		onDismiss?: () => void;
		onAction?: () => void;
		actionLabel?: string;
		showIcon?: boolean;
		animated?: boolean;
		accessibilityLabel?: string;
		accessibilityHint?: string;
	}
) => {
	return {
		type,
		message,
		severity,
		...options,
	};
};

// Predefined warning configurations
export const WARNING_CONFIGS = {
	pro_limit_near: {
		severity: 'medium' as SeverityLevel,
		actionLabel: 'Upgrade Plan',
		icon: 'trending-up',
	},
	cost_spike: {
		severity: 'high' as SeverityLevel,
		actionLabel: 'View Details',
		icon: 'trending-up',
	},
	performance_regression: {
		severity: 'medium' as SeverityLevel,
		actionLabel: 'Optimize',
		icon: 'speedometer',
	},
	cache_miss_high: {
		severity: 'low' as SeverityLevel,
		actionLabel: 'Improve Cache',
		icon: 'refresh',
	},
	token_usage_spike: {
		severity: 'high' as SeverityLevel,
		actionLabel: 'Review Usage',
		icon: 'pulse',
	},
	model_fallback: {
		severity: 'low' as SeverityLevel,
		actionLabel: 'Check Status',
		icon: 'swap-horizontal',
	},
	rate_limit_warning: {
		severity: 'medium' as SeverityLevel,
		actionLabel: 'Wait & Retry',
		icon: 'time',
	},
};

// Helper function to get warning configuration
export const getWarningConfig = (type: WarningType) => {
	return WARNING_CONFIGS[type] || WARNING_CONFIGS.pro_limit_near;
};

// Helper function to determine if warning should be shown
export const shouldShowWarning = (
	severity: SeverityLevel,
	userPreferences?: {
		showLowSeverity?: boolean;
		showMediumSeverity?: boolean;
		showHighSeverity?: boolean;
		showCriticalSeverity?: boolean;
	}
) => {
	const preferences = {
		showLowSeverity: true,
		showMediumSeverity: true,
		showHighSeverity: true,
		showCriticalSeverity: true,
		...userPreferences,
	};

	switch (severity) {
		case 'low':
			return preferences.showLowSeverity;
		case 'medium':
			return preferences.showMediumSeverity;
		case 'high':
			return preferences.showHighSeverity;
		case 'critical':
			return preferences.showCriticalSeverity;
		default:
			return true;
	}
};
