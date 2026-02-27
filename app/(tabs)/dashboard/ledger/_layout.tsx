// _layout.tsx
import { router, Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FilterProvider } from '../../../../src/context/filterContext';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../../../src/ui/theme';

export const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export default function TransactionStack() {
	return (
		<SafeAreaProvider>
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
							backgroundColor: palette.bg,
						},
						headerTitleStyle: {
							fontSize: 20,
							fontWeight: '600',
							color: palette.text,
						},
						headerLeft: () => (
							<BorderlessButton
								onPress={() => router.back()}
								style={{ width: 50 }}
							>
								<Ionicons name="chevron-back" size={24} color={palette.text} />
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
		</SafeAreaProvider>
	);
}
