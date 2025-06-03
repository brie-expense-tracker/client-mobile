import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack } from 'expo-router';

export default function OnboardingOne() {
	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>
				<Image
					style={styles.logoImage}
					source={require('../../assets/images/brie-logos.png')}
				/>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Spend Smarter Save More</Text>
					<Text style={styles.subtitle}>
						Brie is a tool that helps you manage your money and save more.
					</Text>
				</View>
				<View style={styles.buttonContainer}>
					<Link replace asChild href={'./onboardingTwo'}>
						<Pressable style={styles.button}>
							<LinearGradient
								colors={['#0095FF', '#0095FF']}
								style={styles.gradient}
							>
								<Text style={styles.buttonText}>Get Started</Text>
							</LinearGradient>
						</Pressable>
					</Link>
				</View>

				<View style={styles.loginContainer}>
					<Text style={styles.loginText}>Already have account?</Text>
					<Link replace href={'/login-test'}>
						<Text style={styles.loginLink}>Log In</Text>
					</Link>
				</View>
			</View>
			<Stack.Screen options={{ headerShown: false }} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		backgroundColor: '#fff',
	},
	contentContainer: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 10,
	},
	logoImage: {
		width: 100,
		height: 40,
		marginBottom: 40,
		resizeMode: 'contain',
	},
	moneyManImage: {
		marginBottom: 40,
	},
	titleContainer: {
		width: '100%',
		paddingHorizontal: 40,
	},
	title: {
		fontWeight: '600',
		marginHorizontal: 'auto',
		width: '80%',
		fontSize: 36,
		textAlign: 'center',
		marginTop: 20,
	},
	subtitle: {
		marginHorizontal: 'auto',
		width: '100%',
		fontSize: 16,
		textAlign: 'center',
		marginVertical: 10,
		color: '#6b7280',
	},
	buttonContainer: {
		width: '80%',
		shadowColor: '#0095FF',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 15,
		elevation: 5,
		marginTop: 30,
	},
	button: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		alignSelf: 'center',
	},
	gradient: {
		width: '100%',
	},
	buttonText: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: 'bold',
		marginVertical: 18,
	},
	loginContainer: {
		flexDirection: 'row',
		gap: 8,
		width: '100%',
		position: 'absolute',
		bottom: 40,
		justifyContent: 'center',
	},
	loginText: {
		color: '#6b7280',
	},
	loginLink: {
		color: '#0e5475',
		opacity: 0.7,
		fontWeight: 'bold',
	},
});
