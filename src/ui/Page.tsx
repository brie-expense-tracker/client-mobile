import React from 'react';

import { View, Text, StyleSheet, ViewStyle, SafeAreaView } from 'react-native';

import { palette, space, type } from './theme';

type PageProps = {
	title?: string;
	subtitle?: string;
	right?: React.ReactNode;
	children: React.ReactNode;
	headerStyle?: ViewStyle;
};

export const Page: React.FC<PageProps> = ({
	title,
	subtitle,
	right,
	children,
	headerStyle,
}) => {
	const hasHeader = !!title || !!subtitle || !!right;

	return (
		<SafeAreaView style={styles.root}>
			<View style={styles.container}>
				{hasHeader && (
					<View style={[styles.header, headerStyle]}>
						<View style={styles.headerTopRow}>
							{!!title && (
								<Text style={styles.title} numberOfLines={1}>
									{title}
								</Text>
							)}
							{!!subtitle && (
								<Text style={styles.subtitleTop} numberOfLines={1}>
									{subtitle}
								</Text>
							)}
						</View>

						{right && <View style={styles.headerRight}>{right}</View>}
					</View>
				)}

				<View style={styles.content}>{children}</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	container: {
		flex: 1,
	},
	header: {
		paddingTop: space.lg,
		paddingBottom: space.md,
		paddingHorizontal: space.xl,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
		backgroundColor: palette.surface,
	},
	// Top row: title left, subtitle right
	headerTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.sm,
	},
	title: {
		...type.h1,
		color: palette.text,
	},
	subtitleTop: {
		...type.bodySm,
		color: palette.textMuted,
	},
	// Second row: full width right content
	headerRight: {
		width: '100%', // forces segmented control to match header width
	},
	content: {
		flex: 1,
		// ⬇️ key change: let Section handle horizontal padding
		paddingHorizontal: 0,
		backgroundColor: palette.surfaceAlt,
	},
});
