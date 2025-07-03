// app/(tabs)/insights.tsx

import React, { useEffect, useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	Text,
	Pressable,
	StyleSheet,
	ActivityIndicator,
	Alert,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import useAuth from '../../../src/context/AuthContext';

export default function InsightsHubScreen() {
	const router = useRouter();
	const { user, firebaseUser, profile } = useAuth();
	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);

	useEffect(() => {
		fetchInsights();
	}, []);

	async function fetchInsights() {
		try {
			setLoading(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
			});

			// Try to get existing insights with timeout
			const insightsPromise = Promise.allSettled([
				InsightsService.getInsights('daily'),
				InsightsService.getInsights('weekly'),
				InsightsService.getInsights('monthly'),
			]);

			const results = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as PromiseSettledResult<any>[];

			const [dailyResponse, weeklyResponse, monthlyResponse] = results.map(
				(result: PromiseSettledResult<any>) =>
					result.status === 'fulfilled'
						? result.value
						: {
								success: false,
								data: [],
								error: result.reason?.message || 'Request failed',
						  }
			);

			// Log responses for debugging
			console.log('Daily insights response:', dailyResponse);
			console.log('Weekly insights response:', weeklyResponse);
			console.log('Monthly insights response:', monthlyResponse);

			const allInsights = [
				...(dailyResponse.success &&
				dailyResponse.data &&
				Array.isArray(dailyResponse.data)
					? dailyResponse.data.slice(0, 1) // Only take 1 insight per period
					: []),
				...(weeklyResponse.success &&
				weeklyResponse.data &&
				Array.isArray(weeklyResponse.data)
					? weeklyResponse.data.slice(0, 1)
					: []),
				...(monthlyResponse.success &&
				monthlyResponse.data &&
				Array.isArray(monthlyResponse.data)
					? monthlyResponse.data.slice(0, 1)
					: []),
			];

			// Sort by most recent
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			// Take the most recent 3 insights
			const recentInsights = allInsights.slice(0, 3);

			if (recentInsights.length === 0) {
				// Check if any of the responses had specific errors
				const errors = [
					dailyResponse.error,
					weeklyResponse.error,
					monthlyResponse.error,
				].filter(Boolean);

				if (errors.length > 0) {
					console.log('Insights fetch errors:', errors);
					// Don't show alert, just set empty insights
					setInsights([]);
				} else {
					// Only generate one insight quickly instead of all three
					await generateQuickInsight();
				}
			} else {
				setInsights(recentInsights);
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			// Don't show alert, just set empty insights
			setInsights([]);
		} finally {
			setLoading(false);
		}
	}

	async function generateQuickInsight() {
		try {
			setGenerating(true);
			// Only generate one insight quickly (weekly is usually fastest)
			const response = await InsightsService.generateInsights('weekly');
			console.log('Quick insight generation response:', response);

			if (response.success && response.data && Array.isArray(response.data)) {
				setInsights(response.data.slice(0, 1));
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating quick insight:', error);
			setInsights([]);
		} finally {
			setGenerating(false);
		}
	}

	async function generateNewInsights() {
		try {
			setGenerating(true);
			const [dailyGen, weeklyGen, monthlyGen] = await Promise.all([
				InsightsService.generateInsights('daily'),
				InsightsService.generateInsights('weekly'),
				InsightsService.generateInsights('monthly'),
			]);

			const allInsights = [
				...(dailyGen.success && dailyGen.data && Array.isArray(dailyGen.data)
					? dailyGen.data
					: []),
				...(weeklyGen.success && weeklyGen.data && Array.isArray(weeklyGen.data)
					? weeklyGen.data
					: []),
				...(monthlyGen.success &&
				monthlyGen.data &&
				Array.isArray(monthlyGen.data)
					? monthlyGen.data
					: []),
			];

			// Sort by most recent and take top 3
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);
			setInsights(allInsights.slice(0, 3));
		} catch (error) {
			console.error('Error generating insights:', error);
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setGenerating(false);
		}
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<Text style={styles.header}>AI Coach</Text>

			<ScrollView contentContainerStyle={styles.container}>
				{insights && insights.length > 0 ? (
					insights.map((insight) => (
						<Pressable
							key={insight._id}
							style={styles.card}
							onPress={() => {
								router.push(`/insights/${insight.period}`);
							}}
						>
							<Text style={styles.periodLabel}>
								{insight.period.charAt(0).toUpperCase() +
									insight.period.slice(1)}
							</Text>
							<Text style={styles.message}>{insight.message}</Text>
							<Text style={styles.cta}>Tap to explore →</Text>
						</Pressable>
					))
				) : (
					<View style={styles.emptyState}>
						<Text style={styles.emptyText}>No insights available yet.</Text>
						<Text style={styles.emptySubtext}>
							Add some transactions to generate insights.
						</Text>

						<Pressable
							style={[
								styles.generateButton,
								generating && styles.generateButtonDisabled,
							]}
							onPress={generateNewInsights}
							disabled={generating}
						>
							{generating ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={styles.generateButtonText}>Generate Insights</Text>
							)}
						</Pressable>

						<Pressable style={styles.refreshButton} onPress={fetchInsights}>
							<Text style={styles.refreshButtonText}>Refresh</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#f9f9f9' },
	header: {
		fontSize: 28,
		fontWeight: '600',
		margin: 16,
	},
	container: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	periodLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	message: {
		fontSize: 16,
		fontWeight: '400',
		marginBottom: 12,
	},
	cta: {
		fontSize: 14,
		fontWeight: '500',
		color: '#2e78b7',
	},
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '500',
		color: '#666',
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	generateButton: {
		backgroundColor: '#2e78b7',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	generateButtonDisabled: {
		opacity: 0.6,
	},
	generateButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	refreshButton: {
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	refreshButtonText: {
		color: '#666',
		fontSize: 16,
		fontWeight: '500',
	},
});
