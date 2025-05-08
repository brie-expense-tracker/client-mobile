import { View, Text, Image, Pressable, ImageBackground } from 'react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack } from 'expo-router';

export default function OnboardingTwo() {
	return (
		<View className="w-screen h-screen bg-white">
			<ImageBackground
				className="w-screen h-3/4 absolute"
				source={require('../../assets/images/bg_onboarding.png')}
			/>
			<View className="w-full h-full justify-center items-center">
				<Text className="font-bold text-5xl text-green-600 text-center my-32">
					Create Your Expense Tracker Account
				</Text>
				<View
					className="w-4/5 self-center"
					style={{
						shadowColor: '#3ea15a',
						shadowOffset: { width: 0, height: 8 }, // Shift shadow down the Y-axis
						shadowOpacity: 0.6,
						shadowRadius: 15,
						elevation: 5, // for Android
					}}
				>
					<Link replace asChild href={'/signup-test'}>
						<Pressable className="w-full rounded-full overflow-hidden self-center">
							<LinearGradient colors={['#89D6A0', '#379C54']}>
								<Text className="text-white text-2xl text-center font-bold my-4">
									Sign Up
								</Text>
							</LinearGradient>
						</Pressable>
					</Link>
				</View>

				<View className="flex-row gap-x-2 w-full my-10 justify-center">
					<Text className="text-gray-500">Already have account?</Text>
					<Link replace className="text-black" href={'/login-test'}>
						<Text className=" text-green-800 opacity-70 font-bold">Log In</Text>
					</Link>
				</View>
			</View>
			<Stack.Screen options={{ headerShown: false }} />
		</View>
	);
}
