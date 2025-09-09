import React, { useState } from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
	useAnimatedStyle,
	withSpring,
} from 'react-native-reanimated';
import {
	accessibilityProps,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../src/utils/accessibility';

export default function DashboardLayout() {
	const [isPressed, setIsPressed] = useState(false);

	// Animated style for button press feedback
	const animatedButtonStyle = useAnimatedStyle(() => ({
		transform: [{ scale: withSpring(isPressed ? 0.95 : 1) }],
		opacity: withSpring(isPressed ? 0.7 : 1),
	}));

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="notifications"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Notifications',
					headerShadowVisible: false,
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<Animated.View style={animatedButtonStyle}>
							<BorderlessButton
								onPress={() => router.back()}
								onActiveStateChange={setIsPressed}
								style={{ width: 50 }}
								{...accessibilityProps.button}
								accessibilityLabel={generateAccessibilityLabel.button(
									'Go back'
								)}
								accessibilityHint={voiceOverHints.navigate}
							>
								<Ionicons
									name="chevron-back"
									size={24}
									color="#333"
									accessibilityRole="image"
									accessibilityLabel="Back arrow"
								/>
							</BorderlessButton>
						</Animated.View>
					),
				}}
			/>
			<Stack.Screen name="ledger" options={{ headerShown: false }} />
		</Stack>
	);
}
