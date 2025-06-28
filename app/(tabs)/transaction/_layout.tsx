import React, { useState } from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function _layout() {
	const [isPressed, setIsPressed] = useState(false);

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
		</Stack>
	);
}
