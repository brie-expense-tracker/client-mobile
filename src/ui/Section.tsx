import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { palette, space, type as typography } from './theme';

type SectionProps = {
	title?: string;
	subtitle?: string;
	right?: React.ReactNode;
	style?: ViewStyle;
	children: React.ReactNode;
};

export const Section: React.FC<SectionProps> = ({
	title,
	subtitle,
	right,
	style,
	children,
}) => {
	const hasHeader = title || subtitle || right;

	return (
		<View style={[styles.section, style]}>
			{hasHeader && (
				<View style={styles.headerRow}>
					<View style={styles.headerLeft}>
						{!!title && (
							<Text style={styles.title} numberOfLines={1}>
								{title}
							</Text>
						)}
						{!!subtitle && (
							<Text style={styles.subtitle} numberOfLines={1}>
								{subtitle}
							</Text>
						)}
					</View>
					{right && <View style={styles.headerRight}>{right}</View>}
				</View>
			)}
			<View style={styles.body}>{children}</View>
		</View>
	);
};

const styles = StyleSheet.create({
	section: {
		marginTop: space.lg,
		paddingHorizontal: space.xl,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.sm,
	},
	headerLeft: {
		flexShrink: 1,
		paddingRight: space.sm,
	},
	headerRight: {
		flexShrink: 0,
	},
	title: {
		...typography.titleSm,
		color: palette.text,
	},
	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	body: {
		// Content is wrapped in Card, so no extra padding here
	},
});
