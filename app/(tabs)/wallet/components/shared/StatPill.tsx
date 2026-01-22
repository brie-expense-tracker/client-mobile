import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type, palette } from '../../../../../src/ui/theme';

export default function StatPill({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.statPill}>
			<Text style={styles.statPillLabel}>{label}</Text>
			<Text style={styles.statPillValue}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	statPill: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 12,
		gap: 4,
	},
	statPillLabel: {
		color: palette.textMuted,
		...type.bodyXs,
	},
	statPillValue: {
		color: palette.text,
		...type.body,
		fontWeight: '600',
	},
});
