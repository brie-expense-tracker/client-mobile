import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, space, type } from './theme';

export const Section: React.FC<{
	title?: string;
	right?: React.ReactNode;
	children: React.ReactNode;
}> = ({ title, right, children }) => (
	<View style={styles.wrap}>
		{(title || right) && (
			<View style={styles.header}>
				{!!title && <Text style={[type.h2, styles.title]}>{title}</Text>}
				{right}
			</View>
		)}
		{children}
	</View>
);

const styles = StyleSheet.create({
	wrap: { marginTop: space.xl },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.md,
	},
	title: { color: palette.text },
});
