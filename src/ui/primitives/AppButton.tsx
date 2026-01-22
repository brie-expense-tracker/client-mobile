import React from 'react';
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	ActivityIndicator,
	ViewStyle,
	TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space } from '../theme';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';
type AppButtonSize = 'sm' | 'md' | 'lg';

type AppButtonProps = {
	/** Button label */
	label: string;
	/** Button variant. Default: 'primary' */
	variant?: AppButtonVariant;
	/** Button size. Default: 'md' */
	size?: AppButtonSize;
	/** Optional icon name */
	icon?: keyof typeof Ionicons.glyphMap;
	/** Icon position. Default: 'right' */
	iconPosition?: 'left' | 'right';
	/** Disabled state */
	disabled?: boolean;
	/** Loading state */
	loading?: boolean;
	/** Press handler */
	onPress?: () => void;
	/** Custom style */
	style?: ViewStyle;
	/** Custom text style */
	textStyle?: TextStyle;
	/** Full width button */
	fullWidth?: boolean;
	/** Accessibility label */
	accessibilityLabel?: string;
};

/**
 * AppButton - Standardized button component with multiple variants
 * 
 * @example
 * <AppButton label="Save" variant="primary" onPress={handleSave} />
 * <AppButton label="Cancel" variant="secondary" />
 * <AppButton label="Delete" variant="ghost" icon="trash-outline" />
 */
export const AppButton: React.FC<AppButtonProps> = ({
	label,
	variant = 'primary',
	size = 'md',
	icon,
	iconPosition = 'right',
	disabled = false,
	loading = false,
	onPress,
	style,
	textStyle,
	fullWidth = false,
	accessibilityLabel,
}) => {
	const buttonStyle: ViewStyle[] = [
		styles.button,
		styles[`button_${variant}`],
		styles[`button_${size}`],
		fullWidth && styles.buttonFullWidth,
		disabled && styles.buttonDisabled,
		style,
	];

	const textStyleArray: TextStyle[] = [
		styles.text,
		styles[`text_${variant}`],
		styles[`text_${size}`],
		disabled && styles.textDisabled,
		textStyle,
	];

	const IconComponent = icon ? (
		<Ionicons
			name={icon}
			size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
			color={
				variant === 'primary'
					? palette.primaryTextOn
					: variant === 'secondary'
						? palette.text
						: palette.textMuted
			}
			style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
		/>
	) : null;

	return (
		<TouchableOpacity
			style={buttonStyle}
			onPress={onPress}
			disabled={disabled || loading}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || label}
			accessibilityState={{ disabled: disabled || loading }}
		>
			{loading ? (
				<ActivityIndicator
					size="small"
					color={
						variant === 'primary'
							? palette.primaryTextOn
							: palette.textMuted
					}
				/>
			) : (
				<>
					{iconPosition === 'left' && IconComponent}
					<Text style={textStyleArray}>{label}</Text>
					{iconPosition === 'right' && IconComponent}
				</>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.md,
	},
	button_primary: {
		backgroundColor: palette.text,
	},
	button_secondary: {
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
	},
	button_ghost: {
		backgroundColor: 'transparent',
	},
	button_sm: {
		paddingVertical: space.xs,
		paddingHorizontal: space.md,
		minHeight: 36,
	},
	button_md: {
		paddingVertical: space.sm,
		paddingHorizontal: space.lg,
		minHeight: 44,
	},
	button_lg: {
		paddingVertical: space.md,
		paddingHorizontal: space.xl,
		minHeight: 52,
	},
	buttonFullWidth: {
		width: '100%',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	text: {
		fontWeight: '600',
	},
	text_primary: {
		color: palette.surface,
	},
	text_secondary: {
		color: palette.text,
	},
	text_ghost: {
		color: palette.textMuted,
	},
	text_sm: {
		fontSize: 13,
	},
	text_md: {
		fontSize: 15,
	},
	text_lg: {
		fontSize: 16,
	},
	textDisabled: {
		opacity: 0.6,
	},
	iconLeft: {
		marginRight: space.xs,
	},
	iconRight: {
		marginLeft: space.xs,
	},
});
