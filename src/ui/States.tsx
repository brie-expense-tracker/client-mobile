import React from 'react';

import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { palette, radius, space, type, shadow } from './theme';

export const LoadingState = ({ label = 'Loading...' }) => (
	<View style={styles.center}>
		<View style={styles.card}>
			<ActivityIndicator size="large" color={palette.primary} />
			<Text style={[type.body, styles.helperText]}>{label}</Text>
		</View>
	</View>
);

export const ErrorState = ({
	title = 'Something went wrong',
	subtitle = 'Please check your connection and try again.',
	onRetry,
}: {
	title?: string;
	subtitle?: string;
	onRetry?: () => void;
}) => (
	<View style={styles.center}>
		<View style={styles.card}>
			<View style={styles.iconWrapperError}>
				<Ionicons name="warning-outline" size={28} color={palette.danger} />
			</View>
			<Text style={[type.h2, styles.title]}>{title}</Text>
			<Text style={[type.body, styles.sub]}>{subtitle}</Text>
			{onRetry && (
				<TouchableOpacity
					style={[styles.cta, styles.ctaSecondary]}
					onPress={onRetry}
					activeOpacity={0.85}
				>
					<Text style={styles.ctaSecondaryText}>Retry</Text>
				</TouchableOpacity>
			)}
		</View>
	</View>
);

interface EmptyStateProps {
	icon?: keyof typeof Ionicons.glyphMap;
	title?: string;
	subtitle?: string;
	ctaLabel?: string;
	onPress?: () => void;
}

export const EmptyState = ({
	icon = 'add-circle-outline',
	title = 'Nothing here yet',
	subtitle = 'Create your first item to get started.',
	ctaLabel = 'Add',
	onPress,
}: EmptyStateProps) => (
	<View style={styles.center}>
		<View style={styles.card}>
			<View style={styles.iconWrapper}>
				<Ionicons name={icon} size={28} color={palette.primary} />
			</View>
			<Text style={[type.h2, styles.title]}>{title}</Text>
			<Text style={[type.body, styles.sub]}>{subtitle}</Text>
			{onPress && (
				<TouchableOpacity
					style={styles.cta}
					onPress={onPress}
					activeOpacity={0.9}
				>
					<Text style={styles.ctaText}>{ctaLabel}</Text>
				</TouchableOpacity>
			)}
		</View>
	</View>
);

const styles = StyleSheet.create({
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.surfaceAlt,
	},
	card: {
		width: '100%',
		maxWidth: 420,
		alignItems: 'center',
		paddingVertical: space.xl,
		paddingHorizontal: space.xl,
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		...shadow.card,
	},
	iconWrapper: {
		width: 56,
		height: 56,
		borderRadius: radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.primarySubtle,
		marginBottom: space.md,
	},
	iconWrapperError: {
		width: 56,
		height: 56,
		borderRadius: radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.dangerSubtle,
		marginBottom: space.md,
	},
	title: {
		color: palette.text,
		marginTop: space.sm,
		textAlign: 'center',
	},
	sub: {
		color: palette.textMuted,
		textAlign: 'center',
		marginTop: space.sm,
	},
	helperText: {
		color: palette.textMuted,
		marginTop: space.md,
		textAlign: 'center',
	},
	cta: {
		backgroundColor: palette.primary,
		paddingHorizontal: space.xl,
		paddingVertical: space.md,
		borderRadius: radius.pill,
		marginTop: space.lg,
	},
	ctaText: {
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
	ctaSecondary: {
		backgroundColor: palette.surface,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
	},
	ctaSecondaryText: {
		color: palette.text,
		fontWeight: '600',
	},
});
