// app/(tabs)/insights.tsx

import React, { useContext, useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useProfile } from '../../../src/context/profileContext';
import AICoach from './components/AICoach';
import TutorialProgress from './components/TutorialProgress';
import { Period } from '../../../src/hooks';
import { useProgression } from '../../../src/context/progressionContext';
import { ProgressionService } from '../../../src/services/progressionService';

export default function InsightsHubScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { profile, markAICoachSeen, updateAIInsightsSettings } = useProfile();
	const {
		checkProgression,
		progression,
		loading: progressionLoading,
	} = useProgression();

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';

	// Map user frequency to Period type
	const getDefaultPeriod = (): Period => {
		switch (userFrequency) {
			case 'daily':
				return 'week';
			case 'weekly':
				return 'month';
			case 'monthly':
				return 'quarter';
			default:
				return 'month';
		}
	};

	const defaultPeriod = getDefaultPeriod();

	// Check if tutorial is actually completed (all 4 steps)
	const isTutorialActuallyCompleted = useMemo(() => {
		console.log('🔍 Checking tutorial completion...');
		console.log('🔍 Progression data:', progression);
		console.log('🔍 Profile data:', profile);
		console.log('🔍 Profile progression data:', profile?.progression);

		// Use progression from context or fall back to profile
		const effectiveProgression = progression || profile?.progression || null;
		console.log('🔍 Effective progression data:', effectiveProgression);

		const completed =
			ProgressionService.isTutorialFullyCompleted(effectiveProgression);
		console.log('🔍 Tutorial actually completed:', completed);

		return completed;
	}, [progression, profile]);

	// Show loading while checking progression
	if (progressionLoading || transactionsLoading) {
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
				<LinearGradient
					colors={['#2E78B7', '#66e24a']}
					style={styles.headerGradient}
				>
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
				</LinearGradient>

				<TutorialProgress
					onTutorialCompleted={async () => {
						console.log('📱 Insights: Tutorial completed callback triggered');
						await checkProgression();
						// Mark AI Coach as seen in profile
						await markAICoachSeen();
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
			<LinearGradient
				colors={['#2E78B7', '#e24a4a']}
				style={styles.headerGradient}
			>
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
			</LinearGradient>

			{/* AICoach handles all the logic internally */}
			<AICoach />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#2E78B7' },
	headerGradient: {
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		backgroundColor: '#2E78B7',
	},
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
