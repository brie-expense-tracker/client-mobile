import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
} from 'react-native';
import {
	modeStateService,
	ModeState,
} from '../../../../src/services/assistant/modeStateService';
import { isDevMode } from '../../../../src/config/environment';

interface DevHudProps {
	// Optional modeState prop for backward compatibility
	modeState?: ModeState;
}

// Gating logic - ONLY show when dev mode is enabled
// Using isDevMode from environment.ts as single source of truth
function shouldShowHud(): boolean {
	// isDevMode requires both: NODE_ENV === 'development' AND DEV_MODE === true
	return isDevMode;
}

export default function DevHud({ modeState: propModeState }: DevHudProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [currentModeState, setCurrentModeState] = useState<ModeState>(
		propModeState || modeStateService.getState()
	);
	const fadeAnim = useState(new Animated.Value(0))[0];

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

	// Don't render if not in development mode
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
					<Text style={styles.debugText}>Channel: production</Text>
					<Text style={styles.debugText}>
						Environment: {isDevMode ? 'dev-mode' : 'production'}
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
