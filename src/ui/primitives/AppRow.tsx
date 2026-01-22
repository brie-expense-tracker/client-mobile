import React from 'react';
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space, type } from '../theme';

type AppRowProps = {
	/** Left icon name */
	icon?: keyof typeof Ionicons.glyphMap;
	/** Icon color. Default: palette.textMuted */
	iconColor?: string;
	/** Row label */
	label: string;
	/** Optional subtitle/description */
	description?: string;
	/** Right side content */
	right?: React.ReactNode;
	/** Show chevron. Default: true if onPress provided */
	showChevron?: boolean;
	/** Make row pressable */
	onPress?: () => void;
	/** Custom style */
	style?: ViewStyle;
	/** Show bottom border. Default: true */
	bordered?: boolean;
	/** Accessibility label */
	accessibilityLabel?: string;
};

/**
 * AppRow - Standardized row component for lists and settings
 * 
 * Used in Settings, Transaction details, and other list-like screens.
 * 
 * @example
 * <AppRow
 *   icon="person-outline"
 *   label="Profile"
 *   description="Manage your account"
 *   onPress={handlePress}
 * />
 */
export const AppRow: React.FC<AppRowProps> = ({
	icon,
	iconColor = palette.textMuted,
	label,
	description,
	right,
	showChevron,
	onPress,
	style,
	bordered = true,
	accessibilityLabel,
}) => {
	const shouldShowChevron = showChevron ?? !!onPress;

	const rowContent = (
		<View
			style={[
				styles.row,
				bordered && styles.rowBordered,
				style,
			]}
		>
			<View style={styles.rowLeft}>
				{icon && (
					<View style={styles.iconWrapper}>
						<Ionicons name={icon} size={20} color={iconColor} />
					</View>
				)}
				<View style={styles.content}>
					<Text style={[type.body, styles.label]}>{label}</Text>
					{description && (
						<Text style={[type.bodySm, styles.description]}>
							{description}
						</Text>
					)}
				</View>
			</View>
			<View style={styles.rowRight}>
				{right}
				{shouldShowChevron && (
					<Ionicons
						name="chevron-forward"
						size={18}
						color={palette.textSubtle}
						style={styles.chevron}
					/>
				)}
			</View>
		</View>
	);

	if (onPress) {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel || label}
				accessibilityHint={description}
			>
				{rowContent}
			</TouchableOpacity>
		);
	}

	return rowContent;
};

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: space.md,
		paddingHorizontal: space.md,
		minHeight: 56,
	},
	rowBordered: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: space.sm,
	},
	iconWrapper: {
		width: 32,
		height: 32,
		borderRadius: radius.md,
		backgroundColor: palette.subtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
	},
	label: {
		color: palette.text,
		fontWeight: '500',
	},
	description: {
		color: palette.textSubtle,
		marginTop: 2,
	},
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
	},
	chevron: {
		marginLeft: space.xs,
	},
});
