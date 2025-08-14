import React, { useEffect, useMemo, useRef } from 'react';
import {
	View,
	Animated,
	Easing,
	StyleSheet,
	Text,
	ViewStyle,
} from 'react-native';

type Props = {
	/** 0–100 */
	percent: number;
	/** bar height (px) */
	height?: number;
	/** main brand color */
	color?: string;
	/** track color */
	trackColor?: string;
	/** animate on mount / change */
	animated?: boolean;
	/** optional label on the right, e.g. "2% used" */
	rightLabel?: string;
	/** optional label on the left, e.g. "$23 / $1200" */
	leftLabel?: string;
	/** container style override */
	style?: ViewStyle;
};

const LinearProgressBar: React.FC<Props> = ({
	percent,
	height = 6,
	color = '#0EA5E9', // sky-500
	trackColor = '#EEF2F7', // very light gray/blue
	animated = true,
	leftLabel,
	rightLabel,
	style,
}) => {
	const clamped = Math.max(0, Math.min(100, percent));
	const anim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!animated) {
			anim.setValue(clamped);
			return;
		}
		Animated.timing(anim, {
			toValue: clamped,
			duration: 650,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [clamped, animated, anim]);

	const radius = height / 2;

	const barWidth = anim.interpolate({
		inputRange: [0, 100],
		outputRange: ['0%', '100%'],
	});

	// Slightly darker edge for depth (no gradients/deps needed)
	const darker = useMemo(() => {
		// quick tone-down
		return shade(color, -12);
	}, [color]);

	return (
		<View style={style}>
			{(leftLabel || rightLabel) && (
				<View style={styles.headerRow}>
					<Text style={styles.leftLabel}>{leftLabel}</Text>
					<Text style={styles.rightLabel}>{rightLabel}</Text>
				</View>
			)}

			<View
				style={[
					styles.track,
					{ height, borderRadius: radius, backgroundColor: trackColor },
				]}
			>
				{/* Fill */}
				<Animated.View
					style={[
						styles.fill,
						{
							width: barWidth,
							height,
							borderRadius: radius,
							backgroundColor: color,
							// subtle inner shadow / edge
							borderTopColor: '#FFFFFF',
							borderTopWidth: 0.5,
							borderBottomColor: darker,
							borderBottomWidth: 0.5,
						},
					]}
				/>

				{/* Gloss highlight */}
				<View
					pointerEvents="none"
					style={[
						styles.gloss,
						{
							height: Math.max(2, Math.floor(height * 0.35)),
							borderRadius: radius,
						},
					]}
				/>
			</View>
		</View>
	);
};

// tiny util to darken/lighten hex by percent
function shade(hex: string, percent: number) {
	const c = hex.replace('#', '');
	const num = parseInt(c.length === 3 ? c.replace(/(.)/g, '$1$1') : c, 16);
	const r = (num >> 16) + Math.round(2.55 * percent);
	const g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
	const b = (num & 0x0000ff) + Math.round(2.55 * percent);
	return (
		'#' +
		(
			0x1000000 +
			(r < 255 ? (r < 0 ? 0 : r) : 255) * 0x10000 +
			(g < 255 ? (g < 0 ? 0 : g) : 255) * 0x100 +
			(b < 255 ? (b < 0 ? 0 : b) : 255)
		)
			.toString(16)
			.slice(1)
	);
}

const styles = StyleSheet.create({
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	leftLabel: {
		fontSize: 14,
		color: '#4B5563',
		fontWeight: '500',
	},
	rightLabel: {
		fontSize: 14,
		color: '#6B7280',
		fontWeight: '500',
	},
	track: {
		width: '100%',
		overflow: 'hidden',
	},
	fill: {
		position: 'absolute',
		left: 0,
		top: 0,
	},
	cap: {
		position: 'absolute',
		top: 0,
		right: 0,
	},
	gloss: {
		position: 'absolute',
		left: 2,
		right: 2,
		top: 1,
		backgroundColor: 'rgba(255,255,255,0.35)',
	},
});

export default LinearProgressBar;
