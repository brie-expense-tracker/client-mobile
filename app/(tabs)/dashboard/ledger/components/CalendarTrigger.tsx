import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarTrigger({
	dateISO,
	onPress,
}: {
	dateISO?: string;
	onPress: () => void;
}) {
	const display = dateISO
		? new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
		  })
		: 'All Dates';

	return (
		<TouchableOpacity style={styles.field} onPress={onPress}>
			<Ionicons name="calendar" size={18} color="#111827" />
			<Text style={styles.text}>{display}</Text>
			<Ionicons name="chevron-down" size={16} color="#6B7280" />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	field: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#F3F4F6',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
		flex: 1,
	},
	text: {
		flex: 1,
		fontSize: 15,
		color: '#111827',
		fontWeight: '500',
	},
});
