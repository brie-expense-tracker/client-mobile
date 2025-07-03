import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { BorderlessButton } from 'react-native-gesture-handler';

const _layout = () => {
	const [isPressed, setIsPressed] = useState(false);

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="[period]"
				options={{ headerShown: false }}
				// options={({ route }) => {
				// 	const params = route.params as { period?: string };
				// 	const period = params?.period;

				// 	return {
				// 		headerShown: true,
				// 		headerBackButtonDisplayMode: 'minimal',
				// 		headerTitle: period
				// 			? `${period.charAt(0).toUpperCase() + period.slice(1)} Insights`
				// 			: 'Insights',
				// 		headerShadowVisible: false,
				// 		headerTitleStyle: {
				// 			fontSize: 20,
				// 			fontWeight: '600',
				// 			color: '#333',
				// 		},
				// 		headerStyle: {
				// 			backgroundColor: '#ffffff',
				// 		},

				// 		headerLeft: () => (
				// 			<BorderlessButton
				// 				onPress={() => router.back()}
				// 				onActiveStateChange={setIsPressed}
				// 				style={{ width: 50 }}
				// 			>
				// 				<Ionicons name="chevron-back" size={24} color="#333" />
				// 			</BorderlessButton>
				// 		),
				// 	};
				// }}
			/>
		</Stack>
	);
};

export default _layout;
