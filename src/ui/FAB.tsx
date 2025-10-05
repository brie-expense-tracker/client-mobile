import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space, shadow } from './theme';

export const FAB = ({
	onPress,
	icon = 'add',
}: {
	onPress: () => void;
	icon?: any;
}) => (
	<TouchableOpacity
		style={styles.fab}
		onPress={onPress}
		accessibilityLabel="Add"
	>
		<Ionicons name={icon} size={22} color="#fff" />
	</TouchableOpacity>
);

const styles = StyleSheet.create({
	fab: {
		position: 'absolute',
		right: space.xl,
		bottom: space.xl,
		backgroundColor: palette.primary,
		borderRadius: radius.pill,
		padding: 16,
		...shadow.card,
	},
});
