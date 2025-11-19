import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface FormHeaderProps {
	title: string;
	onSave: () => void;
	saveDisabled?: boolean;
	loading?: boolean;
	onBack?: () => void;
}

export const FormHeader: React.FC<FormHeaderProps> = ({
	title,
	onSave,
	saveDisabled = false,
	loading = false,
	onBack,
}) => {
	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			router.back();
		}
	};

	return (
		<View style={styles.header}>
			<TouchableOpacity style={styles.backButton} onPress={handleBack}>
				<Ionicons name="chevron-back" size={24} color="#000" />
			</TouchableOpacity>
			<Text style={styles.screenTitle}>{title}</Text>
			<TouchableOpacity
				onPress={onSave}
				style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
				disabled={saveDisabled}
			>
				{loading ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<Text style={styles.saveButtonText}>Save</Text>
				)}
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
		position: 'relative',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		zIndex: 1,
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#0a0a0a',
		position: 'absolute',
		left: 0,
		right: 0,
		textAlign: 'center',
	},
	saveButton: {
		backgroundColor: '#18181b',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
		zIndex: 1,
	},
	saveButtonDisabled: {
		backgroundColor: '#a1a1aa',
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
});
