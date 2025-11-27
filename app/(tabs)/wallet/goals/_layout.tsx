import React from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const createHeaderOptions = (
	title: string,
	useBackButton: boolean = false
) => ({
	headerShown: true,
	headerBackButtonDisplayMode: 'minimal' as const,
	headerTitle: title,
	headerShadowVisible: false,
	headerStyle: {
		backgroundColor: '#ffffff',
	},
	headerTitleStyle: {
		fontSize: 20,
		fontWeight: '600' as const,
		color: '#333',
	},
	headerLeft: () => (
		<BorderlessButton
			onPress={() => (useBackButton ? router.back() : router.push('..'))}
			style={{ width: 50 }}
		>
			<Ionicons name="chevron-back" size={24} color="#333" />
		</BorderlessButton>
	),
});

export default function GoalsLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="new"
				options={createHeaderOptions('New goal', true)}
			/>
			<Stack.Screen
				name="[id]"
				options={createHeaderOptions('Goal details', true)}
			/>
			<Stack.Screen
				name="edit"
				options={createHeaderOptions('Edit Goal', true)}
			/>
		</Stack>
	);
}
