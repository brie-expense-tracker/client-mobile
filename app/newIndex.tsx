import { Link, SplashScreen, Stack } from 'expo-router';
import { Text, View } from 'react-native';
SplashScreen.preventAutoHideAsync();
setTimeout(SplashScreen.hideAsync, 2000);

export default function Index() {
	return (
		<View className="bg-slate-700 w-full h-full items-center justify-center">
			<Text className="text-6xl font-bold text-green-600 w-full text-center">
				Spend smarter save more
			</Text>
			<Link
				replace
				className="mt-6 p-2 w-4/5 text-center rounded-3xl border-solid border-2 bg-white text-2xl text-black"
				href={'/onboardingOne'}
			>
				onboarding 1
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl bg-white text-2xl text-black"
				href={'/onboardingTwo'}
			>
				onboarding 2
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl border-solid border-2 border-gray-200 text-2xl text-gray-200"
				href={'/expenseTracker'}
			>
				Expense Tracker
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl border-solid border-2 border-gray-200 text-2xl text-gray-200"
				href={'/addExpense'}
			>
				Add Expense
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl border-solid border-2 border-gray-200 text-2xl text-gray-200"
				href={'/addIncome'}
			>
				Add Income
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl bg-white text-2xl text-black"
				href={'/signup'}
			>
				Sign up
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl bg-white text-2xl text-black"
				href={'/dashboard'}
			>
				Dashboard
			</Link>
			<Link
				className="mt-4 p-2 w-4/5 text-center rounded-3xl bg-white text-2xl text-black"
				href={'/home'}
			>
				Home
			</Link>
			<Stack.Screen options={{ headerShown: false, headerTitle: '' }} />
		</View>
	);
}
