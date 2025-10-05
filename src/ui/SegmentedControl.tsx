import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { palette, radius, space, type } from './theme';

export const SegmentedControl = ({
	segments,
	value,
	onChange,
}: {
	segments: { key: string; label: string }[];
	value: string;
	onChange: (key: string) => void;
}) => (
	<View style={styles.wrap}>
		{segments.map((s) => {
			const active = value === s.key;
			return (
				<TouchableOpacity
					key={s.key}
					style={[styles.segment, active && styles.segmentActive]}
					onPress={() => onChange(s.key)}
				>
					<Text
						style={[type.small, { color: active ? '#fff' : palette.textMuted }]}
					>
						{s.label}
					</Text>
				</TouchableOpacity>
			);
		})}
	</View>
);

const styles = StyleSheet.create({
	wrap: {
		flexDirection: 'row',
		backgroundColor: palette.subtle,
		borderRadius: radius.pill,
		padding: 4,
		alignSelf: 'flex-start',
	},
	segment: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: radius.pill,
		marginHorizontal: 2,
	},
	segmentActive: {
		backgroundColor: palette.text,
	},
});
