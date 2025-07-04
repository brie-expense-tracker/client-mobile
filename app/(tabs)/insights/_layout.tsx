import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { BorderlessButton } from 'react-native-gesture-handler';

const _layout = () => {
	const [isPressed, setIsPressed] = useState(false);

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="[period]" options={{ headerShown: false }} />
		</Stack>
	);
};

export default _layout;
