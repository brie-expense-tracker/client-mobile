import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IncomeDivergenceWarningProps {
	userDeclaredAmount: number;
	observedAmount: number;
	divergencePercent: number;
	onUpdateIncome?: () => void;
	onDismiss?: () => void;
}

export const IncomeDivergenceWarning: React.FC<
	IncomeDivergenceWarningProps
> = ({
	userDeclaredAmount,
	observedAmount,
	divergencePercent,
	onUpdateIncome,
	onDismiss,
}) => {
	// Only show if divergence is significant (>10%)
	if (Math.abs(divergencePercent) < 10) {
		return null;
	}

	const isHigher = divergencePercent > 0;
	const absPercent = Math.abs(divergencePercent).toFixed(0);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons
					name="information-circle"
					size={20}
					color="#f59e0b"
					style={styles.icon}
				/>
				<Text style={styles.title}>Income Mismatch Detected</Text>
				{onDismiss && (
					<Pressable onPress={onDismiss} style={styles.dismissButton}>
						<Ionicons name="close" size={18} color="#6b7280" />
					</Pressable>
				)}
			</View>

			<Text style={styles.message}>
				You declared{' '}
				<Text style={styles.bold}>
					${userDeclaredAmount.toLocaleString()}/mo
				</Text>
				, but we're observing{' '}
				<Text style={styles.bold}>${observedAmount.toLocaleString()}/mo</Text>{' '}
				from your recent paychecks ({absPercent}%{' '}
				{isHigher ? 'higher' : 'lower'}
				).
			</Text>

			<Text style={styles.suggestion}>
				We're using the observed income for planning. You can update your
				declared income to match, or keep it as-is if your paychecks vary.
			</Text>

			{onUpdateIncome && (
				<Pressable style={styles.button} onPress={onUpdateIncome}>
					<Text style={styles.buttonText}>Update My Income Info</Text>
					<Ionicons name="arrow-forward" size={16} color="#0A84FF" />
				</Pressable>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fffbeb',
		borderLeftWidth: 4,
		borderLeftColor: '#f59e0b',
		borderRadius: 8,
		padding: 16,
		marginVertical: 8,
		marginHorizontal: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	icon: {
		marginRight: 8,
	},
	title: {
		flex: 1,
		fontSize: 15,
		fontWeight: '700',
		color: '#92400e',
	},
	dismissButton: {
		padding: 4,
	},
	message: {
		fontSize: 14,
		lineHeight: 20,
		color: '#78350f',
		marginBottom: 8,
	},
	bold: {
		fontWeight: '700',
	},
	suggestion: {
		fontSize: 13,
		lineHeight: 18,
		color: '#92400e',
		fontStyle: 'italic',
		marginBottom: 12,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#0A84FF',
		gap: 8,
	},
	buttonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#0A84FF',
	},
});

export default IncomeDivergenceWarning;

