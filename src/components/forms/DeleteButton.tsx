import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteButtonProps {
	onPress: () => void;
	text?: string;
	disabled?: boolean;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
	onPress,
	text = 'Delete',
	disabled = false,
}) => {
	return (
		<TouchableOpacity
			style={styles.deleteButton}
			onPress={onPress}
			disabled={disabled}
		>
			<Ionicons name="trash-outline" size={20} color="#E53935" />
			<Text style={styles.deleteButtonText}>{text}</Text>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderColor: '#E53935',
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginTop: 24,
		gap: 8,
	},
	deleteButtonText: {
		color: '#E53935',
		fontSize: 16,
		fontWeight: '600',
	},
});
