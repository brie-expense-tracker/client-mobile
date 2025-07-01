import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton } from 'react-native-gesture-handler';

interface SettingProps {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	onPress?: () => void;
	trailing?: string;
	value?: string;
	subValue?: string;
}

export default function Setting({
	icon,
	label,
	onPress,
	trailing,
	value,
	subValue,
}: SettingProps) {
	const [isPressed, setIsPressed] = useState(false);

	return (
		<BorderlessButton
			style={styles.settingItem}
			onPress={onPress}
			enabled={!!onPress}
			onActiveStateChange={setIsPressed}
		>
			<Ionicons name={icon} size={24} color="#555" />
			<View style={styles.settingContent}>
				<Text style={styles.settingText}>{label}</Text>
				{value && <Text style={styles.settingValue}>{value}</Text>}
				{subValue && <Text style={styles.settingSubValue}>{subValue}</Text>}
			</View>
			{trailing ? (
				<Text style={[styles.chevronIcon, { fontSize: 12 }]}>{trailing}</Text>
			) : onPress ? (
				<Ionicons name="chevron-forward" size={18} style={styles.chevronIcon} />
			) : null}
		</BorderlessButton>
	);
}

const styles = StyleSheet.create({
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	settingContent: {
		flex: 1,
		marginLeft: 12,
	},
	settingText: {
		fontSize: 16,
		color: '#333',
		marginBottom: 2,
	},
	settingValue: {
		fontSize: 14,
		color: '#666',
	},
	settingSubValue: {
		fontSize: 12,
		color: '#999',
		marginTop: 1,
	},
	chevronIcon: {
		color: '#BEBEBE',
	},
});
