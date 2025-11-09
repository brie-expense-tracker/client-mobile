import React from 'react';
import { View, Text, StyleSheet, ViewStyle, SafeAreaView } from 'react-native';
import { palette, radius, space, type } from './theme';

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
	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.container}>
				{(title || right) && (
					<View style={[styles.header, headerStyle]}>
						<View style={{ flex: 1 }}>
							{!!title && <Text style={[type.h1, styles.title]}>{title}</Text>}
							{!!subtitle && (
								<Text style={[type.body, styles.subtitle]}>{subtitle}</Text>
							)}
						</View>
						{right}
					</View>
				)}
				<View style={styles.content}>{children}</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.bg },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.xl,
		paddingBottom: space.md,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
		backgroundColor: palette.bg,
	},
	title: { color: palette.text },
	subtitle: { color: palette.textMuted, marginTop: 4 },
	content: {
		flex: 1,
		paddingHorizontal: space.xl,
		paddingTop: space.lg,
	},
});
