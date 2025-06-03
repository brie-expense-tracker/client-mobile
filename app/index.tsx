import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

const Index = () => {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
	if (!isOnboardingCompleted) {
		return <Redirect href="/onboardingOne" />;
	}
	return <Redirect href="/(tabs)/dashboard" />;
};

export default Index;
