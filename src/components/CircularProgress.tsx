import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
	size?: number;
	strokeWidth?: number;
	value: number; // 0..100
	trackColor?: string;
	barColor?: string;
	label?: string;
	labelColor?: string;
};

export default function CircularProgress({
	size = 64,
	strokeWidth = 8,
	value,
	trackColor = '#e5e7eb',
	barColor = '#10b981',
	label,
	labelColor = '#0f172a',
}: Props) {
	const clamped = Math.max(0, Math.min(100, value));
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = useMemo(
		() => circumference - (circumference * clamped) / 100,
		[circumference, clamped]
	);

	return (
		<View
			style={{
				width: size,
				height: size,
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Svg
				width={size}
				height={size}
				style={{ transform: [{ rotate: '-90deg' }] }}
			>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={trackColor}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={barColor}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={circumference}
					strokeDashoffset={dashOffset}
					strokeLinecap="round"
				/>
			</Svg>
			{label ? (
				<Text
					style={{ position: 'absolute', fontWeight: '800', color: labelColor }}
				>
					{label}
				</Text>
			) : null}
		</View>
	);
}
