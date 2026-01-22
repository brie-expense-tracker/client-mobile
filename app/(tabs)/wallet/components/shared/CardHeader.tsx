import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, type } from '../../../../../src/ui/theme';

type CardHeaderProps = {
	title: string;
	subtitle?: string;
	actionLabel?: string;
	icon?: keyof typeof Ionicons.glyphMap;
};

export default function CardHeader({
	title,
	subtitle,
	actionLabel,
	icon = 'ellipse-outline',
}: CardHeaderProps) {
	return (
		<View style={styles.cardHeaderRow}>
			<View style={styles.cardHeaderLeft}>
				<View style={styles.cardIcon}>
					<Ionicons name={icon} size={18} color={palette.primary} />
				</View>
				<View>
					<Text style={styles.cardTitle}>{title}</Text>
					{subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
				</View>
			</View>
			{actionLabel ? <Text style={styles.linkText}>{actionLabel}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	cardHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	cardHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cardIcon: {
		width: 32,
		height: 32,
		borderRadius: 12,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		...type.numLg,
		color: palette.text,
	},
	cardSub: {
		marginTop: 6,
		...type.body,
		color: palette.textMuted,
	},
	linkText: {
		...type.body,
		color: palette.primary,
		fontWeight: '600',
	},
});
