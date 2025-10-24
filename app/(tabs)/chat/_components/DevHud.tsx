import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
} from 'react-native';
import {
	getEffectiveFeatureFlags,
	assertProductionSafety,
} from '../../../../src/config/featureFlags';
import {
	modeStateService,
	ModeState,
} from '../../../../src/services/assistant/modeStateService';

// Safely import expo-updates with fallback
let Updates: any = null;
try {
	// Use dynamic import for better compatibility
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	Updates = require('expo-updates');
} catch {
	if (__DEV__) {
		console.log('expo-updates not available in development');
	} else {
		console.warn('expo-updates not available');
	}
}

interface DevHudProps {
	// Optional modeState prop for backward compatibility
	modeState?: ModeState;
}

// Gating logic as recommended
function shouldShowHud(): boolean {
	const isDev = __DEV__;
	const isInternalChannel =
		Updates?.channel && Updates.channel !== 'production';
	const featureFlags = getEffectiveFeatureFlags();

	// Allow HUD if:
	// 1. In development mode, OR
	// 2. On internal channel (dev/staging) with devHud feature flag enabled
	return isDev || (isInternalChannel && featureFlags.devHud);
}

export default function DevHud({ modeState: propModeState }: DevHudProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [currentModeState, setCurrentModeState] = useState<ModeState>(
		propModeState || modeStateService.getState()
	);
	const fadeAnim = useState(new Animated.Value(0))[0];

	// Production safety check
	useEffect(() => {
		assertProductionSafety();
	}, []);

	// Subscribe to mode state changes if no prop is provided
	useEffect(() => {
		if (!propModeState) {
			const unsubscribe = modeStateService.subscribe((state) => {
				setCurrentModeState(state);
			});
			return unsubscribe;
		}
	}, [propModeState]);

	// Use prop mode state if provided, otherwise use internal state
	const modeState = propModeState || currentModeState;

	// Auto-hide after 3 seconds when expanded
	useEffect(() => {
		if (isExpanded) {
			const timer = setTimeout(() => {
				setIsExpanded(false);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [isExpanded]);

	// Fade animation
	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: isVisible ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		}).start();
	}, [isVisible, fadeAnim]);

	// Don't render if gating logic says no
	if (!shouldShowHud()) {
		return null;
	}

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded);
		setIsVisible(!isVisible);
	};

	return (
		<View style={styles.container}>
			{/* Compact pill - always visible when HUD is enabled */}
			<TouchableOpacity
				style={styles.compactPill}
				onPress={toggleExpanded}
				activeOpacity={0.7}
			>
				<Text style={styles.compactText}>
					{modeState.current} • {modeState.isStable ? 'Stable' : 'Unstable'}
				</Text>
			</TouchableOpacity>

			{/* Expanded panel - only visible when tapped */}
			{isExpanded && (
				<Animated.View style={[styles.expandedPanel, { opacity: fadeAnim }]}>
					<Text style={styles.debugTitle}>Mode Machine State</Text>
					<Text style={styles.debugText}>Current: {modeState.current}</Text>
					<Text style={styles.debugText}>
						Stable: {modeState.isStable ? 'Yes' : 'No'}
					</Text>
					<Text style={styles.debugText}>
						Transitions: {modeState.history.length}
					</Text>
					{modeState.history.length > 0 && (
						<Text style={styles.debugText}>
							Last: {modeState.history[modeState.history.length - 1].from} →{' '}
							{modeState.history[modeState.history.length - 1].to}
							{modeState.history[modeState.history.length - 1].reason &&
								` (${modeState.history[modeState.history.length - 1].reason})`}
						</Text>
					)}
					<Text style={styles.debugText}>
						Channel: {Updates?.channel || 'unknown'}
					</Text>
					<Text style={styles.debugText}>
						Environment: {__DEV__ ? 'development' : 'production'}
					</Text>
					{!propModeState && (
						<>
							<Text style={styles.debugText}>
								Time in mode:{' '}
								{Math.round(
									(Date.now() -
										(modeState.history[modeState.history.length - 1]
											?.timestamp || Date.now())) /
										1000
								)}
								s
							</Text>
							<Text style={styles.debugText}>
								Stats: {modeStateService.getStats().totalTransitions}{' '}
								transitions, {modeStateService.getStats().errorCount} errors
							</Text>
						</>
					)}
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 100,
		right: 20,
		zIndex: 1000,
		// Non-blocking overlay - doesn't steal touches
		pointerEvents: 'box-none',
	},
	compactPill: {
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	compactText: {
		color: '#ffffff',
		fontSize: 10,
		fontWeight: '600',
	},
	expandedPanel: {
		position: 'absolute',
		top: 30,
		right: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.9)',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
		minWidth: 200,
		// Non-blocking overlay - doesn't steal touches
		pointerEvents: 'box-none',
	},
	debugTitle: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 8,
	},
	debugText: {
		color: '#d1d5db',
		fontSize: 10,
		marginBottom: 4,
	},
});
