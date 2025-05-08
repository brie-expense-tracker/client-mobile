// import {
// 	View,
// 	Text,
// 	Pressable,
// 	ImageBackground,
// 	TextInput,
// 	Alert,
// } from 'react-native';
// import React, { useState } from 'react';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Link, router, Stack } from 'expo-router';
// import { auth } from '@/config/firebaseConfig';
// import { createUserWithEmailAndPassword } from 'firebase/auth';

// export default function Signup() {
// 	const [email, setEmail] = useState('');
// 	const [password, setPassword] = useState('');

// 	// Email validator function
// 	const isValidEmail = (email: string) => {
// 		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 		return emailRegex.test(email);
// 	};

// 	// Password validator function
// 	const isValidPassword = (password: string) => {
// 		return password.length >= 6; // Minimum 6 characters for this example
// 	};

// 	const handleSignup = () => {
// 		if (!email || !password) {
// 			Alert.alert('Error', 'Please fill in all fields.');
// 			return;
// 		}

// 		if (!isValidEmail(email)) {
// 			Alert.alert('Error', 'Please enter a valid email address.');
// 			return;
// 		}

// 		if (!isValidPassword(password)) {
// 			Alert.alert('Error', 'Password must be at least 6 characters long.');
// 			return;
// 		}
// 		try {
// 			const userCredential = createUserWithEmailAndPassword(
// 				auth,
// 				email,
// 				password
// 			);
// 			console.log('201: Successfully created User.');

// 			router.replace('/dashboard');
// 		} catch (error) {
// 			console.log(error);
// 		}
// 	};
// 	return (
// 		<View className="w-screen h-screen bg-white">
// 			<ImageBackground
// 				className="w-screen h-3/4 absolute"
// 				source={require('../../assets/images/bg_onboarding.png')}
// 			/>
// 			<View className="w-full h-full px-8 justify-center">
// 				<View className="w-full h-1/2 justify-center items-center bg-white self-center shadow-lg shadow-gray-200 rounded-3xl p-6">
// 					<Text className="text-3xl text-black font-semibold mt-10">
// 						Sign up
// 					</Text>
// 					<Text className="font-bold text-sm text-gray-500 text-left w-full mb-2">
// 						Email
// 					</Text>
// 					<TextInput
// 						className="border-2 border-teal-700 w-full p-4 mb-4 rounded-xl"
// 						placeholder="Enter your email"
// 						value={email}
// 						onChangeText={setEmail}
// 						keyboardType="email-address"
// 						autoCapitalize="none"
// 					/>
// 					<Text className="font-bold text-sm text-gray-500 text-left w-full mb-2">
// 						Password
// 					</Text>
// 					<TextInput
// 						className="border-2 border-teal-700 w-full p-4 mb-10 rounded-xl"
// 						placeholder="Enter your password"
// 						value={password}
// 						onChangeText={setPassword}
// 						secureTextEntry
// 					/>
// 					{/* Sign up button */}
// 					<View
// 						className="w-4/5 self-center"
// 						style={{
// 							shadowColor: '#3ea15a',
// 							shadowOffset: { width: 0, height: 8 }, // Shift shadow down the Y-axis
// 							shadowOpacity: 0.6,
// 							shadowRadius: 15,
// 							elevation: 5, // for Android
// 						}}
// 					>
// 						<Pressable
// 							className="w-full rounded-full overflow-hidden self-center"
// 							onPress={handleSignup}
// 						>
// 							<LinearGradient colors={['#89D6A0', '#379C54']}>
// 								<Text className="text-white text-2xl text-center font-bold my-4">
// 									Sign Up
// 								</Text>
// 							</LinearGradient>
// 						</Pressable>
// 					</View>

// 					<View className="flex-row gap-x-1 w-full my-10 justify-center">
// 						<Text className="text-gray-500">Already have account?</Text>
// 						<Link replace className="text-black" href={'/login'}>
// 							<Text className=" text-green-800 opacity-70 font-bold">
// 								Log In
// 							</Text>
// 						</Link>
// 					</View>
// 				</View>
// 			</View>
// 			<Stack.Screen options={{ headerShown: false }} />
// 		</View>
// 	);
// }
