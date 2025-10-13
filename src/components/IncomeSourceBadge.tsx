import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IncomeSource = 'user-declared' | 'observed' | 'none';

interface IncomeSourceBadgeProps {
	source: IncomeSource;
	confidence?: number;
	compact?: boolean;
}

export const IncomeSourceBadge: React.FC<IncomeSourceBadgeProps> = ({
	source,
	confidence = 0,
	compact = false,
}) => {
	if (source === 'none') {
		return null;
	}

	const getStyles = () => {
		if (source === 'observed') {
			return {
				container: styles.observedContainer,
				text: styles.observedText,
				icon: 'checkmark-circle' as const,
				iconColor: '#059669',
				label: compact ? 'Observed' : 'From Paychecks',
			};
		} else {
			return {
				container: styles.declaredContainer,
				text: styles.declaredText,
				icon: 'person' as const,
				iconColor: '#0284c7',
				label: compact ? 'Declared' : 'User Declared',
			};
		}
	};

	const badgeStyles = getStyles();
	const confidencePercent = Math.round(confidence * 100);

	return (
		<View style={[styles.badge, badgeStyles.container]}>
			<Ionicons
				name={badgeStyles.icon}
				size={compact ? 12 : 14}
				color={badgeStyles.iconColor}
			/>
			<Text style={[styles.text, badgeStyles.text]}>
				{badgeStyles.label}
				{source === 'observed' && !compact && confidencePercent > 0
					? ` (${confidencePercent}%)`
					: ''}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	observedContainer: {
		backgroundColor: '#d1fae5',
		borderWidth: 1,
		borderColor: '#059669',
	},
	declaredContainer: {
		backgroundColor: '#dbeafe',
		borderWidth: 1,
		borderColor: '#0284c7',
	},
	text: {
		fontSize: 11,
		fontWeight: '600',
	},
	observedText: {
		color: '#059669',
	},
	declaredText: {
		color: '#0284c7',
	},
});

export default IncomeSourceBadge;

