import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius } from '../../../../../src/ui/theme';

export default function CalendarTrigger({
	dateISO,
	onPress,
}: {
	dateISO?: string;
	onPress: () => void;
}) {
	const display = dateISO
		? (() => {
				// Parse YYYY-MM-DD directly to avoid timezone issues
				const [year, month, day] = dateISO.split('-').map(Number);
				const date = new Date(year, month - 1, day);
				return date.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				});
		  })()
		: 'All Dates';

	return (
		<TouchableOpacity style={styles.field} onPress={onPress}>
			<Ionicons name="calendar" size={18} color={palette.textMuted} />
			<Text style={styles.text}>{display}</Text>
			<Ionicons name="chevron-down" size={16} color={palette.iconMuted} />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	field: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: palette.input,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		borderRadius: radius.xl2,
		paddingHorizontal: 12,
		height: 44,
		flex: 1,
	},
	text: {
		flex: 1,
		fontSize: 15,
		color: palette.text,
		fontWeight: '500',
	},
});
