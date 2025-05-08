import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

const Index = () => {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(true);
	if (!isOnboardingCompleted) {
		return <Redirect href="/onboardingTwo" />;
	}
	return <Redirect href="/screens/trackerScreen" />;
};

export default Index;
