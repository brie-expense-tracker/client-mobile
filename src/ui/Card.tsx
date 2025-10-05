import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { palette, radius, space, shadow } from './theme';

export const Card: React.FC<{
	style?: ViewStyle;
	children: React.ReactNode;
}> = ({ style, children }) => (
	<View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		padding: space.lg,
		...shadow.card,
	},
});
