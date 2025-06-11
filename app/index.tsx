import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

const Index = () => {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(true);
	if (!isOnboardingCompleted) {
		return <Redirect href="/onboardingThree" />;
	}
	return <Redirect href="./(tabs)/dashboard" />;
	// return <Redirect href="./screens/homeTest" />;
};

export default Index;
