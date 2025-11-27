import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { palette, radius, space, shadow } from './theme';

type CardProps = {
	style?: ViewStyle;
	children: React.ReactNode;
	inset?: boolean;
	elevated?: boolean; // 👈 NEW
};

export const Card: React.FC<CardProps> = ({
	style,
	children,
	inset = true,
	elevated = false,
}) => (
	<View
		style={[
			styles.card,
			elevated && styles.cardElevated,
			inset && styles.cardInset,
			style,
		]}
	>
		{children}
	</View>
);

const styles = StyleSheet.create({
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	cardElevated: {
		...shadow.card,
	},
	cardInset: {
		padding: space.md,
	},
});
