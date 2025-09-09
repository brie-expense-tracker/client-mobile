import React from 'react';
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionConfirmation } from '../hooks/useActionConfirmation';
import { ActionConfirmationModal } from './ActionConfirmationModal';

interface ActionButtonProps {
	actionType:
		| 'create_budget'
		| 'create_goal'
		| 'set_reminder'
		| 'update_preferences'
		| 'export_data'
		| 'detect_completion';
	parameters: any;
	title: string;
	description?: string;
	icon?: string;
	onSuccess?: (result: any) => void;
	onError?: (error: any) => void;
	disabled?: boolean;
	style?: any;
	variant?: 'primary' | 'secondary' | 'danger';
	size?: 'small' | 'medium' | 'large';
	showLoadingText?: boolean;
	loadingText?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
	actionType,
	parameters,
	title,
	description,
	icon,
	onSuccess,
	onError,
	disabled = false,
	style,
	variant = 'primary',
	size = 'medium',
	showLoadingText = false,
	loadingText = 'Processing...',
}) => {
	const {
		confirmationData,
		isModalVisible,
		isExecuting,
		executeAction,
		confirmAction,
		hideConfirmation,
	} = useActionConfirmation();

	const handlePress = async () => {
		if (disabled || isExecuting) return;

		try {
			await executeAction(actionType, parameters, onSuccess, onError);
		} catch (error) {
			console.error('ActionButton: Error executing action:', error);
			onError?.(error);
		}
	};

	const handleConfirm = async () => {
		await confirmAction(onSuccess, onError);
	};

	const getIconName = () => {
		if (icon) return icon as keyof typeof Ionicons.glyphMap;

		switch (actionType) {
			case 'create_budget':
				return 'wallet-outline';
			case 'create_goal':
				return 'flag-outline';
			case 'set_reminder':
				return 'alarm-outline';
			case 'update_preferences':
				return 'settings-outline';
			case 'export_data':
				return 'download-outline';
			case 'detect_completion':
				return 'checkmark-circle-outline';
			default:
				return 'construct-outline';
		}
	};

	const getButtonStyle = () => {
		const baseStyle: any[] = [styles.button];

		// Add variant styles
		switch (variant) {
			case 'secondary':
				baseStyle.push(styles.buttonSecondary);
				break;
			case 'danger':
				baseStyle.push(styles.buttonDanger);
				break;
			default:
				baseStyle.push(styles.buttonPrimary);
		}

		// Add size styles
		switch (size) {
			case 'small':
				baseStyle.push(styles.buttonSmall);
				break;
			case 'large':
				baseStyle.push(styles.buttonLarge);
				break;
			default:
				baseStyle.push(styles.buttonMedium);
		}

		// Add disabled style
		if (disabled) {
			baseStyle.push(styles.buttonDisabled);
		}

		// Add custom style
		if (style) {
			baseStyle.push(style);
		}

		return baseStyle;
	};

	const getTextStyle = () => {
		const baseStyle: any[] = [styles.buttonText];

		// Add size-specific text styles
		switch (size) {
			case 'small':
				baseStyle.push(styles.buttonTextSmall);
				break;
			case 'large':
				baseStyle.push(styles.buttonTextLarge);
				break;
			default:
				baseStyle.push(styles.buttonTextMedium);
		}

		// Add variant-specific text styles
		if (variant === 'secondary') {
			baseStyle.push(styles.buttonTextSecondary);
		}

		return baseStyle;
	};

	return (
		<>
			<TouchableOpacity
				style={getButtonStyle()}
				onPress={handlePress}
				disabled={disabled || isExecuting}
				accessibilityRole="button"
				accessibilityLabel={`${title}${description ? `: ${description}` : ''}`}
				accessibilityHint={
					disabled ? 'Button is disabled' : 'Double tap to execute action'
				}
				accessibilityState={{ disabled: disabled || isExecuting }}
			>
				{isExecuting ? (
					<>
						<ActivityIndicator
							size="small"
							color={variant === 'secondary' ? '#4A90E2' : '#fff'}
						/>
						{showLoadingText && (
							<Text style={getTextStyle()}>{loadingText}</Text>
						)}
					</>
				) : (
					<>
						<Ionicons
							name={getIconName()}
							size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
							color={variant === 'secondary' ? '#4A90E2' : '#fff'}
						/>
						<Text style={getTextStyle()}>{title}</Text>
					</>
				)}
			</TouchableOpacity>

			<ActionConfirmationModal
				visible={isModalVisible}
				onClose={hideConfirmation}
				onConfirm={(confirmationToken, idempotencyKey) => {
					handleConfirm();
				}}
				confirmationData={confirmationData}
				loading={isExecuting}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8,
		gap: 8,
	},
	// Variant styles
	buttonPrimary: {
		backgroundColor: '#4A90E2',
	},
	buttonSecondary: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#4A90E2',
	},
	buttonDanger: {
		backgroundColor: '#FF6B6B',
	},
	// Size styles
	buttonSmall: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		minHeight: 36,
	},
	buttonMedium: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 44,
	},
	buttonLarge: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		minHeight: 52,
	},
	buttonDisabled: {
		backgroundColor: '#CCC',
		borderColor: '#CCC',
	},
	// Text styles
	buttonText: {
		fontWeight: '600',
	},
	buttonTextSmall: {
		fontSize: 14,
		color: '#fff',
	},
	buttonTextMedium: {
		fontSize: 16,
		color: '#fff',
	},
	buttonTextLarge: {
		fontSize: 18,
		color: '#fff',
	},
	buttonTextSecondary: {
		color: '#4A90E2',
	},
});
