import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CostWarningChipProps {
	type: 'pro_limit_near' | 'cost_spike' | 'performance_regression';
	message: string;
	severity: 'low' | 'medium' | 'high';
	onDismiss?: () => void;
	onAction?: () => void;
	actionLabel?: string;
}

export default function CostWarningChip({
	type,
	message,
	severity,
	onDismiss,
	onAction,
	actionLabel,
}: CostWarningChipProps) {
	const getSeverityColor = () => {
		switch (severity) {
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
			default:
				return 'information-circle';
		}
	};

	return (
		<View style={[styles.container, { borderLeftColor: getSeverityColor() }]}>
			<View style={styles.iconContainer}>
				<Ionicons
					name={getTypeIcon() as any}
					size={16}
					color={getSeverityColor()}
				/>
			</View>

			<View style={styles.content}>
				<Text style={styles.message}>{message}</Text>

				{onAction && actionLabel && (
					<TouchableOpacity style={styles.actionButton} onPress={onAction}>
						<Text
							style={[styles.actionButtonText, { color: getSeverityColor() }]}
						>
							{actionLabel}
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{onDismiss && (
				<TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
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
