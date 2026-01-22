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

	/** spacing between labels and bar */
	labelGap?: number;
};

const LinearProgressBar: React.FC<Props> = ({
	percent,
	height = 6,
	color = '#0EA5E9',
	trackColor = '#EEF2F7',
	animated = true,
	leftLabel,
	rightLabel,
	style,
	labelGap = 6, // ↓ tighter by default
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

	const darker = useMemo(() => shade(color, -12), [color]);

	// ✅ Only render labels if they have meaningful text
	const left = (leftLabel ?? '').trim();
	const right = (rightLabel ?? '').trim();
	const showLabels = left.length > 0 || right.length > 0;

	return (
		<View style={style}>
			{showLabels && (
				<View style={[styles.headerRow, { marginBottom: labelGap }]}>
					<Text style={styles.leftLabel} numberOfLines={1}>
						{left}
					</Text>
					<Text style={styles.rightLabel} numberOfLines={1}>
						{right}
					</Text>
				</View>
			)}

			<View
				style={[
					styles.track,
					{ height, borderRadius: radius, backgroundColor: trackColor },
				]}
			>
				<Animated.View
					style={[
						styles.fill,
						{
							width: barWidth,
							height,
							borderRadius: radius,
							backgroundColor: color,
							borderTopColor: '#FFFFFF',
							borderTopWidth: 0.5,
							borderBottomColor: darker,
							borderBottomWidth: 0.5,
						},
					]}
				/>

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
		alignItems: 'center',
	},
	leftLabel: {
		fontSize: 12, // ↓ smaller + cleaner
		color: '#6B7280',
		fontWeight: '600',
	},
	rightLabel: {
		fontSize: 12,
		color: '#9CA3AF',
		fontWeight: '600',
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
	gloss: {
		position: 'absolute',
		left: 2,
		right: 2,
		top: 1,
		backgroundColor: 'rgba(255,255,255,0.35)',
	},
});

export default LinearProgressBar;
