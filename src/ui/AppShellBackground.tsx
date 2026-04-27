import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from './theme';

/**
 * Decorative shell behind app content — mirrors `apps/web` root layout
 * (`app-shell`, `bg-art`, orbs, horizon, vignette).
 */
export function AppShellBackground() {
	const { width, height } = Dimensions.get('window');
	const orb = (
		w: number,
		bg: string,
		pos: { top?: number; bottom?: number; left?: number; right?: number },
	) => (
		<View
			pointerEvents="none"
			style={[
				styles.orb,
				{
					width: w,
					height: w,
					borderRadius: w / 2,
					backgroundColor: bg,
					...pos,
				},
			]}
		/>
	);

	const arcW = width * 1.35;
	const arcLeft = (width - arcW) / 2;

	return (
		<View style={styles.root} pointerEvents="none">
			<LinearGradient
				colors={['#121315', '#17181b', '#17181b']}
				locations={[0, 0.52, 1]}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 0.38, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			<LinearGradient
				colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
				locations={[0, 1]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 0.85 }}
				style={[styles.radialWash, { height: height * 0.55, top: -height * 0.08 }]}
			/>
			{orb(Math.min(width * 1.1, 520), 'rgba(111, 143, 138, 0.26)', {
				top: -height * 0.06,
				right: -width * 0.12,
			})}
			{orb(Math.min(width, 420), 'rgba(15, 16, 18, 0.72)', {
				bottom: -height * 0.12,
				left: -width * 0.22,
			})}
			{orb(Math.min(width * 0.65, 280), 'rgba(90, 115, 111, 0.22)', {
				top: height * 0.3,
				left: -width * 0.08,
			})}
			<LinearGradient
				colors={[
					'rgba(0,0,0,0.28)',
					'rgba(0,0,0,0)',
					'rgba(0,0,0,0)',
					'rgba(27,29,33,0.45)',
					'rgba(0,0,0,0.38)',
				]}
				locations={[0, 0.22, 0.48, 0.62, 1]}
				start={{ x: 0.5, y: 1 }}
				end={{ x: 0.5, y: 0 }}
				style={[StyleSheet.absoluteFill, { opacity: 0.88 }]}
			/>
			<LinearGradient
				colors={['rgba(18,19,21,0)', 'rgba(0,0,0,0.52)']}
				locations={[0.35, 1]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			<View
				style={[
					styles.arc,
					{
						width: arcW,
						height: height * 0.42,
						left: arcLeft,
						top: -height * 0.26,
					},
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: palette.bg,
		overflow: 'hidden',
	},
	radialWash: {
		position: 'absolute',
		left: '-18%',
		right: '-18%',
	},
	orb: {
		position: 'absolute',
		opacity: 0.5,
	},
	arc: {
		position: 'absolute',
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: 'rgba(111, 143, 138, 0.26)',
		opacity: 0.38,
	},
});
