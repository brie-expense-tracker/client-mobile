// DemoIndicator.tsx - Shows demo mode status and sample data info
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDemoData } from '../context/demoDataContext';

interface DemoIndicatorProps {
	onPress?: () => void;
}

export default function DemoIndicator({ onPress }: DemoIndicatorProps) {
	const { isDemoMode, transactions, budgets, goals, loading } = useDemoData();

	if (!isDemoMode || loading) {
		return null;
	}

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View style={styles.iconContainer}>
				<Ionicons name="play-circle" size={16} color="#fff" />
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>Demo Mode Active</Text>
				<Text style={styles.subtitle}>
					{transactions.length} transactions • {budgets.length} budgets •{' '}
					{goals.length} goals
				</Text>
			</View>
			<Ionicons name="chevron-forward" size={16} color="#fff" />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#007ACC',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		marginHorizontal: 16,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	iconContainer: {
		marginRight: 12,
	},
	content: {
		flex: 1,
	},
	title: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	subtitle: {
		color: '#E6F7FF',
		fontSize: 12,
		opacity: 0.9,
	},
});
