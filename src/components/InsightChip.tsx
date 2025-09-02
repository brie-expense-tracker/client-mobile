import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InsightCard {
	id: string;
	severity: 'info' | 'warn' | 'critical';
	headline: string;
	detail: string;
	cta?: {
		label: string;
		action: 'OPEN_BUDGET' | 'CREATE_RULE' | 'MARK_PAID' | 'SHIFT_FUNDS';
		payload?: any;
	};
	evidence: { factIds: string[] };
}

interface InsightChipProps {
	insight: InsightCard;
	onPress?: () => void;
	onCTAPress?: (action: string, payload?: any) => void;
	variant?: 'compact' | 'full' | 'inline';
}

export function InsightChip({
	insight,
	onPress,
	onCTAPress,
	variant = 'compact',
}: InsightChipProps) {
	const getSeverityIcon = (severity: string) => {
		switch (severity) {
			case 'critical':
				return 'warning';
			case 'warn':
				return 'alert-circle';
			case 'info':
				return 'information-circle';
			default:
				return 'sparkles';
		}
	};

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case 'critical':
				return '#dc2626'; // Red
			case 'warn':
				return '#f59e0b'; // Amber
			case 'info':
				return '#3b82f6'; // Blue
			default:
				return '#8b5cf6'; // Purple
		}
	};

	const getSeverityBackground = (severity: string) => {
		switch (severity) {
			case 'critical':
				return '#fef2f2';
			case 'warn':
				return '#fffbeb';
			case 'info':
				return '#eff6ff';
			default:
				return '#f3f4f6';
		}
	};

	const handlePress = () => {
		if (onPress) {
			onPress();
		}
	};

	const handleCTAPress = () => {
		if (onCTAPress && insight.cta) {
			onCTAPress(insight.cta.action, insight.cta.payload);
		}
	};

	if (variant === 'inline') {
		return (
			<TouchableOpacity
				onPress={handlePress}
				style={[
					styles.inlineChip,
					{ backgroundColor: getSeverityBackground(insight.severity) },
				]}
				activeOpacity={0.7}
			>
				<Ionicons
					name={getSeverityIcon(insight.severity) as any}
					size={14}
					color={getSeverityColor(insight.severity)}
				/>
				<Text
					style={[
						styles.inlineText,
						{ color: getSeverityColor(insight.severity) },
					]}
				>
					{insight.headline}
				</Text>
			</TouchableOpacity>
		);
	}

	if (variant === 'compact') {
		return (
			<TouchableOpacity
				onPress={handlePress}
				style={[
					styles.compactChip,
					{
						backgroundColor: getSeverityBackground(insight.severity),
						borderColor: getSeverityColor(insight.severity),
					},
				]}
				activeOpacity={0.7}
			>
				<View style={styles.compactHeader}>
					<Ionicons
						name={getSeverityIcon(insight.severity) as any}
						size={16}
						color={getSeverityColor(insight.severity)}
					/>
					<Text
						style={[
							styles.compactHeadline,
							{ color: getSeverityColor(insight.severity) },
						]}
					>
						{insight.headline}
					</Text>
				</View>
				{insight.cta && (
					<TouchableOpacity
						onPress={handleCTAPress}
						style={[
							styles.ctaButton,
							{ backgroundColor: getSeverityColor(insight.severity) },
						]}
						activeOpacity={0.8}
					>
						<Text style={styles.ctaText}>{insight.cta.label}</Text>
					</TouchableOpacity>
				)}
			</TouchableOpacity>
		);
	}

	// Full variant
	return (
		<View
			style={[
				styles.fullCard,
				{
					backgroundColor: getSeverityBackground(insight.severity),
					borderLeftColor: getSeverityColor(insight.severity),
				},
			]}
		>
			<View style={styles.fullHeader}>
				<Ionicons
					name={getSeverityIcon(insight.severity) as any}
					size={20}
					color={getSeverityColor(insight.severity)}
				/>
				<Text
					style={[
						styles.fullHeadline,
						{ color: getSeverityColor(insight.severity) },
					]}
				>
					{insight.headline}
				</Text>
			</View>

			<Text style={styles.fullDetail}>{insight.detail}</Text>

			{insight.cta && (
				<TouchableOpacity
					onPress={handleCTAPress}
					style={[
						styles.fullCtaButton,
						{ backgroundColor: getSeverityColor(insight.severity) },
					]}
					activeOpacity={0.8}
				>
					<Text style={styles.fullCtaText}>{insight.cta.label}</Text>
					<Ionicons name="arrow-forward" size={16} color="#ffffff" />
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	// Inline variant - minimal chip
	inlineChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
		marginBottom: 4,
		gap: 4,
	},
	inlineText: {
		fontSize: 12,
		fontWeight: '500',
	},

	// Compact variant - medium chip with CTA
	compactChip: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginRight: 12,
		marginBottom: 8,
		minWidth: 200,
	},
	compactHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	compactHeadline: {
		fontSize: 14,
		fontWeight: '600',
		flex: 1,
	},
	ctaButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	ctaText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},

	// Full variant - detailed card
	fullCard: {
		padding: 16,
		borderRadius: 12,
		borderLeftWidth: 4,
		marginHorizontal: 20,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	fullHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 8,
	},
	fullHeadline: {
		fontSize: 16,
		fontWeight: '700',
		flex: 1,
	},
	fullDetail: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 16,
	},
	fullCtaButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
	},
	fullCtaText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
});
