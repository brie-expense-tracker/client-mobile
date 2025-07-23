import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatWidgetProps {
	label: string;
	value: number;
	icon: keyof typeof Ionicons.glyphMap;
	iconColor: string;
	color: string;
	progressValue?: number;
	totalValue?: number;
}

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

const StatWidget: React.FC<StatWidgetProps> = ({
	label,
	value,
	icon,
	iconColor,
	color,
}) => (
	<View style={styles.statWidget}>
		<View style={styles.statContent}>
			<View style={styles.statHeader}>
				<Text style={[styles.statLabel, { color }]}>{label}</Text>
			</View>
			<View style={styles.rowCenter}>
				<Ionicons
					name={icon}
					size={20}
					color={iconColor}
					style={styles.statIcon}
				/>
				<Text style={[styles.statValue, { color }]}>{currency(value)}</Text>
			</View>
		</View>
	</View>
);

const styles = StyleSheet.create({
	statWidget: {
		flex: 1,
		borderRadius: 12,
		backgroundColor: '#fff',
	},
	statContent: { flex: 1 },
	statHeader: { marginBottom: 12 },
	statLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
	},
	statValue: {
		fontSize: 18,
		fontWeight: '600',
	},
	statIcon: {
		marginRight: 8,
	},
	rowCenter: { flexDirection: 'row', alignItems: 'center' },
});

export default StatWidget;
