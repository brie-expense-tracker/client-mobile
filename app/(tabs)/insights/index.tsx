// app/(tabs)/insights.tsx

import React, { useContext, useMemo, useState, useRef } from 'react';
import {
	SafeAreaView,
	Text,
	StyleSheet,
	ActivityIndicator,
	View,
	TouchableOpacity,
	Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useProfile } from '../../../src/context/profileContext';
import AICoach from './components/AICoach';
import TutorialProgress from './components/TutorialProgress';
import { useProgression } from '../../../src/context/progressionContext';
import { ProgressionService } from '../../../src/services/progressionService';

export default function InsightsHubScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { profile, markAICoachSeen, updateAIInsightsSettings } = useProfile();
	const {
		checkProgression,
		progression,
		loading: progressionLoading,
	} = useProgression();

	// Track if this is the first time showing AI Coach after tutorial completion
	const [isFirstTimeAICoach, setIsFirstTimeAICoach] = useState(false);

	// Track if insights have been generated to prevent duplicates
	const [insightsGenerated, setInsightsGenerated] = useState(false);

	// Use ref for more reliable debouncing
	const lastRefreshTimeRef = useRef(0);

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';

	// Check if tutorial is actually completed (all 4 steps)
	const isTutorialActuallyCompleted = useMemo(() => {
		// Use progression from context or fall back to profile
		const effectiveProgression = progression || profile?.progression || null;

		const completed =
			ProgressionService.isTutorialFullyCompleted(effectiveProgression);

		// Also check if all steps are completed based on completion stats
		const allStepsCompleted =
			effectiveProgression?.tutorialSteps &&
			Object.values(effectiveProgression.tutorialSteps).every(
				(step) => step === true
			);

		return completed || allStepsCompleted;
	}, [progression, profile]);

	// Only refresh progression data when screen comes into focus if tutorial is not completed
	useFocusEffect(
		React.useCallback(() => {
			const now = Date.now();
			const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

			// Check if progression data is recent enough (within last 30 seconds)
			const progressionLastCheck = progression?.lastProgressionCheck;
			const isProgressionRecent = progressionLastCheck
				? now - new Date(progressionLastCheck).getTime() < 30000
				: false;

			// Only refresh if tutorial is not completed AND we haven't refreshed recently (debounce)
			// AND progression data is not recent enough
			if (
				!isTutorialActuallyCompleted &&
				timeSinceLastRefresh > 10000 &&
				!isProgressionRecent
			) {
				console.log('📱 Insights: Screen focused, refreshing progression...');
				lastRefreshTimeRef.current = now;
				checkProgression()
					.then(() => {
						console.log('📱 Insights: Progression refresh completed');
					})
					.catch((error) => {
						console.error('📱 Insights: Error refreshing progression:', error);
					});
			} else {
				console.log(
					'📱 Insights: Skipping refresh (debounced, tutorial completed, or data recent)'
				);
			}
		}, [
			checkProgression,
			isTutorialActuallyCompleted,
			progression?.lastProgressionCheck,
		])
	);

	// Determine if this is the initial load (no data yet)
	const isInitialLoad =
		(progressionLoading && !progression) ||
		(transactionsLoading && (!transactions || transactions.length === 0));

	if (isInitialLoad) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	// Show tutorial progress when tutorial is not completed
	if (!isTutorialActuallyCompleted) {
		console.log('📱 Insights: Showing tutorial progress screen');

		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<View style={styles.titleSection}>
							<Ionicons name="bulb" size={24} color="#fff" />
							<Text style={styles.headerTitle}>AI Coach</Text>
						</View>
					</View>
					<Text style={styles.headerSubtitle}>
						Complete the steps below to unlock personalized insights
					</Text>
				</View>

				<TutorialProgress
					onTutorialCompleted={async () => {
						console.log('📱 Insights: Tutorial completed callback triggered');

						// Show immediate completion alert
						Alert.alert(
							'🎉 Tutorial Complete!',
							"Congratulations! You've completed the tutorial and unlocked AI insights.",
							[{ text: 'Continue' }]
						);

						// Prevent duplicate insight generation
						if (insightsGenerated) {
							console.log(
								'📱 Insights: Insights already generated, skipping...'
							);
							return;
						}

						try {
							// First, update progression and mark AI Coach as seen
							await checkProgression();
							await markAICoachSeen();

							// Set flag to indicate this is the first time showing AI Coach
							setIsFirstTimeAICoach(true);

							// Generate personalized insights for the user
							console.log(
								'🎯 Generating personalized insights after tutorial completion...'
							);
							const { InsightsService } = await import(
								'../../../src/services/insightsService'
							);

							// Generate insights with better error handling
							const result = await InsightsService.generateInsights('weekly');

							if (result.success) {
								console.log('✅ Personalized insights generated successfully!');
								setInsightsGenerated(true); // Mark as generated
								// Show success feedback to user
								setTimeout(() => {
									Alert.alert(
										'✨ AI Insights Ready!',
										'Your personalized financial insights have been generated. Discover your spending patterns and get smart recommendations!',
										[{ text: 'Great!' }]
									);
								}, 1000);
							} else {
								console.warn('⚠️ Insights generation returned success: false');
								// Still proceed even if insights generation fails
							}
						} catch (error) {
							console.error(
								'❌ Error generating insights after tutorial completion:',
								error
							);
							// Don't block the flow if insight generation fails
							// Show a fallback message to the user
							setTimeout(() => {
								Alert.alert(
									'AI Insights Generated',
									'Your tutorial is complete! AI insights will be available shortly.',
									[{ text: 'OK' }]
								);
							}, 1000);
						}
					}}
				/>
			</SafeAreaView>
		);
	}

	// Show message when AI insights are disabled
	if (!aiInsightsEnabled) {
		return (
			<SafeAreaView style={styles.center}>
				<View style={styles.disabledContainer}>
					<Ionicons name="bulb-outline" size={64} color="#ccc" />
					<Text style={styles.disabledTitle}>AI Insights Disabled</Text>
					<Text style={styles.disabledText}>
						Weekly updates and personalized financial recommendations are
						currently disabled. Enable them to see your generated insights.
					</Text>
					<TouchableOpacity
						style={styles.enableButton}
						onPress={async () => {
							try {
								// Enable AI insights programmatically
								await updateAIInsightsSettings({ enabled: true });
								Alert.alert(
									'AI Insights Enabled!',
									'Your AI insights have been enabled. You should now see your generated insights.',
									[{ text: 'Great!' }]
								);
							} catch (error) {
								console.error('Error enabling AI insights:', error);
								// Fallback to settings page
								router.push('/(tabs)/settings/aiInsights');
							}
						}}
					>
						<Text style={styles.enableButtonText}>Enable AI Insights</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.settingsButton}
						onPress={() => router.push('/(tabs)/settings/aiInsights')}
					>
						<Text style={styles.settingsButtonText}>Go to Settings</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Main AI Coach view - simplified and direct
	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<View style={styles.titleSection}>
						<Ionicons name="bulb" size={24} color="#fff" />
						<Text style={styles.headerTitle}>AI Coach</Text>
					</View>
				</View>
				<Text style={styles.headerSubtitle}>
					Personalized financial insights and smart actions
				</Text>
				<Text style={styles.frequencyText}>
					Updates:{' '}
					{userFrequency.charAt(0).toUpperCase() + userFrequency.slice(1)}
				</Text>
			</View>

			{/* AICoach handles all the logic internally */}
			<AICoach isFirstTime={isFirstTimeAICoach} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#2E78B7' },

	header: {
		paddingHorizontal: 20,
		paddingBottom: 20,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	titleSection: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#fff',
		marginLeft: 12,
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#e0eaf0',
	},
	frequencyText: {
		fontSize: 12,
		color: '#e0eaf0',
		marginTop: 4,
		fontStyle: 'italic',
	},
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	disabledContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: '#fff',
	},
	disabledTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#333',
		marginTop: 24,
		marginBottom: 16,
		textAlign: 'center',
	},
	disabledText: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
	},
	enableButton: {
		backgroundColor: '#2E78B7',
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 32,
	},
	enableButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
	settingsButton: {
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#2E78B7',
	},
	settingsButtonText: {
		color: '#2E78B7',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
});
