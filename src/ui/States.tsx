import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space, type } from './theme';

export const LoadingState = ({ label = 'Loading...' }) => (
	<View style={styles.center}>
		<ActivityIndicator size="large" color={palette.primary} />
		<Text
			style={[type.body, { color: palette.textMuted, marginTop: space.md }]}
		>
			{label}
		</Text>
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
		<Ionicons name="warning-outline" size={56} color={palette.danger} />
		<Text style={[type.h2, styles.title]}>{title}</Text>
		<Text style={[type.body, styles.sub]}>{subtitle}</Text>
		{onRetry && (
			<View style={styles.cta} onTouchEnd={onRetry}>
				<Text style={styles.ctaText}>Retry</Text>
			</View>
		)}
	</View>
);

export const EmptyState = ({
	icon = 'add-circle-outline',
	title = 'Nothing here yet',
	subtitle = 'Create your first item to get started.',
	ctaLabel = 'Add',
	onPress,
}: any) => (
	<View style={styles.center}>
		<Ionicons name={icon as any} size={56} color={palette.border} />
		<Text style={[type.h2, styles.title]}>{title}</Text>
		<Text style={[type.body, styles.sub]}>{subtitle}</Text>
		{onPress && (
			<View style={styles.cta} onTouchEnd={onPress}>
				<Text style={styles.ctaText}>{ctaLabel}</Text>
			</View>
		)}
	</View>
);

const styles = StyleSheet.create({
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: space.xl,
		backgroundColor: '#fff',
	},
	title: { color: palette.text, marginTop: space.md, textAlign: 'center' },
	sub: { color: palette.textMuted, textAlign: 'center', marginTop: space.sm },
	cta: {
		backgroundColor: palette.primary,
		paddingHorizontal: space.xl,
		paddingVertical: space.md,
		borderRadius: radius.md,
		marginTop: space.lg,
	},
	ctaText: { color: palette.primaryTextOn, fontWeight: '600' },
});
