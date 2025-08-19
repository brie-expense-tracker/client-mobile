import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingProps {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	onPress?: () => void;
	trailing?: string;
	value?: string;
	disabled?: boolean;
}

const SettingItem: React.FC<SettingProps> = ({
	icon,
	label,
	onPress,
	trailing,
	value,
	disabled = false,
}) => {
	const isPressable = onPress && !disabled;

	const SettingContent = () => (
		<View style={styles.settingContent}>
			<View style={styles.leftSection}>
				<Ionicons
					name={icon}
					size={24}
					color={disabled ? '#BEBEBE' : '#555'}
					style={styles.icon}
				/>
				<View style={styles.textContainer}>
					<Text style={[styles.label, disabled && styles.disabledLabel]}>
						{label}
					</Text>
					{value && (
						<Text style={[styles.value, disabled && styles.disabledValue]}>
							{value}
						</Text>
					)}
				</View>
			</View>
			<View style={styles.rightSection}>
				{trailing && (
					<Text style={[styles.trailing, disabled && styles.disabledTrailing]}>
						{trailing}
					</Text>
				)}
				{isPressable && (
					<Ionicons
						name="chevron-forward"
						size={18}
						color="#BEBEBE"
						style={styles.chevron}
					/>
				)}
			</View>
		</View>
	);

	if (isPressable) {
		return (
			<TouchableOpacity
				style={styles.settingItem}
				onPress={onPress}
				activeOpacity={0.6}
				disabled={disabled}
			>
				<SettingContent />
			</TouchableOpacity>
		);
	}

	return (
		<View style={[styles.settingItem, disabled && styles.disabledItem]}>
			<SettingContent />
		</View>
	);
};

const styles = StyleSheet.create({
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	disabledItem: {
		opacity: 0.6,
	},
	settingContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	icon: {
		marginRight: 16,
	},
	textContainer: {
		flex: 1,
	},
	label: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 2,
	},
	disabledLabel: {
		color: '#BEBEBE',
	},
	value: {
		fontSize: 14,
		color: '#666',
	},
	disabledValue: {
		color: '#BEBEBE',
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	trailing: {
		fontSize: 14,
		color: '#666',
		marginRight: 8,
	},
	disabledTrailing: {
		color: '#BEBEBE',
	},
	chevron: {
		marginLeft: 4,
	},
});

export default SettingItem;
