// _layout.tsx
import { router, Stack } from 'expo-router';
import { FilterProvider } from '../../../../src/context/filterContext';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export default function TransactionStack() {
	return (
		<FilterProvider>
			<Stack
				screenOptions={{
					animation: 'slide_from_right',
					gestureEnabled: true,
				}}
			>
				<Stack.Screen
					name="index"
					options={{ animation: 'slide_from_left', headerShown: false }}
				/>
				<Stack.Screen
					name="ledgerFilter"
					options={{
						headerShown: true,
						headerBackButtonDisplayMode: 'minimal',
						headerTitle: 'Filter',
						headerShadowVisible: false,
						headerStyle: {
							backgroundColor: '#ffffff',
						},
						headerTitleStyle: {
							fontSize: 20,
							fontWeight: '600',
							color: '#333',
						},
						headerLeft: () => (
							<BorderlessButton
								onPress={() => router.back()}
								style={{ width: 50 }}
							>
								<Ionicons name="chevron-back" size={24} color="#333" />
							</BorderlessButton>
						),
					}}
				/>
				<Stack.Screen
					name="edit"
					options={{
						headerShown: false,
					}}
				/>
			</Stack>
		</FilterProvider>
	);
}
