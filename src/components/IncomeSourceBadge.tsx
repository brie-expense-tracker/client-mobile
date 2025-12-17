import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius } from '../ui/theme';

type IncomeSource = 'user-declared' | 'observed' | 'none';
type BadgeTone = 'soft' | 'ghost';

interface IncomeSourceBadgeProps {
	source: IncomeSource;
	confidence?: number;
	compact?: boolean;

	/** soft = filled pill (great under label); ghost = subtle (great on right side) */
	tone?: BadgeTone;
}

export const IncomeSourceBadge: React.FC<IncomeSourceBadgeProps> = ({
	source,
	confidence = 0,
	compact = false,
	tone = 'soft',
}) => {
	const confidencePercent = Math.round(confidence * 100);

	const meta = useMemo(() => {
		const isObserved = source === 'observed';
		const tint = isObserved ? '16,185,129' : '14,165,233';
		const color = isObserved ? palette.success : palette.primaryMuted;

		return {
			icon: isObserved
				? ('checkmark-circle' as const)
				: ('person-outline' as const),
			label: isObserved
				? compact
					? 'Observed'
					: 'From Paychecks'
				: compact
				? 'Declared'
				: 'User Declared',
			color,

			// tone styles
			bg:
				tone === 'soft'
					? `rgba(${tint},0.14)` // filled pill
					: `rgba(${tint},0.06)`, // ghost tint
			border: tone === 'soft' ? `rgba(${tint},0.18)` : 'transparent', // ghost: no outline
			text: tone === 'soft' ? color : `rgba(${tint},0.95)`,
			iconColor: tone === 'soft' ? color : `rgba(${tint},0.95)`,
		};
	}, [source, compact, tone]);

	if (source === 'none') return null;

	const showConfidence =
		source === 'observed' &&
		!compact &&
		confidencePercent > 0 &&
		tone !== 'ghost';

	return (
		<View
			style={[
				styles.badge,
				{ backgroundColor: meta.bg, borderColor: meta.border },
				compact ? styles.badgeCompact : styles.badgeRegular,
				tone === 'ghost' && styles.badgeGhost,
			]}
		>
			<Ionicons
				name={meta.icon}
				size={compact ? 12 : 14}
				color={meta.iconColor}
				style={{ marginTop: 0.5 }}
			/>
			<Text
				style={[
					styles.text,
					compact ? styles.textCompact : styles.textRegular,
					{ color: meta.text },
				]}
				numberOfLines={1}
			>
				{meta.label}
				{showConfidence ? ` • ${confidencePercent}%` : ''}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	badge: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.pill,
		borderWidth: 1,
		maxWidth: 140, // give it breathing room
	},
	badgeGhost: {
		borderWidth: 0,
		paddingHorizontal: 8,
		paddingVertical: 4,
		opacity: 0.95,
	},

	badgeRegular: {
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	badgeCompact: {
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},

	text: {
		fontWeight: '600', // ghost looks better at 600 than 700
		flexShrink: 1,
	},
	textRegular: {
		fontSize: 12,
	},
	textCompact: {
		fontSize: 11,
	},
});

export default IncomeSourceBadge;
