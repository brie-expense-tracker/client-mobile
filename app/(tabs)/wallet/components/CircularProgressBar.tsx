import React, { useEffect, useMemo, useRef } from 'react';
import {
	View,
	Animated,
	Easing,
	StyleSheet,
	Text,
	ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
	percent: number; // 0–100
	size?: number; // diameter
	strokeWidth?: number;
	color?: string;
	trackColor?: string;
	animated?: boolean;
	centerLabel?: string;
	subtitle?: string;
	style?: ViewStyle;
};

const CircularProgressBar: React.FC<Props> = ({
	percent,
	size = 120,
	strokeWidth = 8,
	color = '#0EA5E9',
	trackColor = '#EEF2F7',
	animated = true,
	centerLabel,
	subtitle,
	style,
}) => {
	const clamped = Math.max(0, Math.min(100, percent));
	const anim = useRef(new Animated.Value(0)).current;

	// radius/circumference are stable for given size/stroke
	const { radius, circumference } = useMemo(() => {
		const r = (size - strokeWidth) / 2;
		return { radius: r, circumference: 2 * Math.PI * r };
	}, [size, strokeWidth]);

	useEffect(() => {
		if (!animated) {
			anim.setValue(clamped);
			return;
		}
		// animate from current -> new percent
		Animated.timing(anim, {
			toValue: clamped,
			duration: 800,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false, // strokeDashoffset isn't supported by native driver
		}).start();
	}, [clamped, animated, anim]);

	// strokeDasharray is fixed to the full circumference
	const dashArray = `${circumference} ${circumference}`;

	// offset = (100 - progress) * circumference / 100
	const dashOffset = Animated.multiply(
		Animated.subtract(100, anim),
		circumference / 100
	);

	return (
		<View style={[styles.container, style]}>
			<Svg width={size} height={size}>
				{/* Track */}
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={trackColor}
					strokeWidth={strokeWidth}
					fill="transparent"
				/>
				{/* Progress */}
				<AnimatedCircle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={color}
					strokeWidth={strokeWidth}
					fill="transparent"
					strokeDasharray={dashArray}
					strokeDashoffset={dashOffset as unknown as number}
					strokeLinecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`} // start at 12 o'clock
				/>
			</Svg>

			{/* Center content */}
			<View style={[styles.centerContent, { width: size, height: size }]}>
				{centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
				{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { alignItems: 'center', justifyContent: 'center' },
	centerContent: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerLabel: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1F2937',
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 14,
		color: '#6B7280',
		fontWeight: '500',
		textAlign: 'center',
		marginTop: 4,
	},
});

export default CircularProgressBar;
