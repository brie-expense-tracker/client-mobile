// app/(tabs)/insights/[period].tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
	SafeAreaView,
	Text,
	ActivityIndicator,
	StyleSheet,
	ScrollView,
	Alert,
	View,
	TouchableOpacity,
	Animated,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import {
	MaterialCommunityIcons,
	FontAwesome,
	Ionicons,
} from '@expo/vector-icons';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import HistoricalComparison from '../../../src/components/HistoricalComparison';
import IntelligentActions from '../../../src/components/IntelligentActions';
import {
	navigateToBudgetsWithModal,
	navigateToGoalsWithModal,
} from '../../../src/utils/navigationUtils';

export default function InsightDetail() {
	const router = useRouter();
	const { period } = useLocalSearchParams<{
		period: 'daily' | 'weekly' | 'monthly';
	}>();
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeStep, setActiveStep] = useState(0);
	const [expandedSections, setExpandedSections] = useState({
		summary: true,
		comparison: false,
	});
	const [refreshingInsights, setRefreshingInsights] = useState(false); // Add state for insights refresh
	const [completionAlertShown, setCompletionAlertShown] = useState(false); // Prevent duplicate alerts

	// Animation values
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;

	// Initialize animation values
	useEffect(() => {
		fadeAnim.setValue(0);
		slideAnim.setValue(50);
	}, []); // Only run once on mount

	useEffect(() => {
		async function load() {
			try {
				const res = await InsightsService.getInsights(period);
				const data =
					res.success && Array.isArray(res.data) && res.data.length > 0
						? res.data
						: ((await InsightsService.generateInsights(period))
								.data as AIInsight[]);
				setInsights(data);
			} catch (err) {
				console.warn(err);
				Alert.alert('Error', 'Could not load insights.');
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [period]);

	// Animate step changes and initial load
	useEffect(() => {
		// Only animate if insights are loaded and not in loading state
		if (insights.length > 0 && !loading) {
			// Reset animation values
			fadeAnim.setValue(0);
			slideAnim.setValue(50);

			// Start animation with a small delay to ensure smooth transition
			const animationTimer = setTimeout(() => {
				Animated.parallel([
					Animated.timing(fadeAnim, {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}),
					Animated.timing(slideAnim, {
						toValue: 0,
						duration: 300,
						useNativeDriver: true,
					}),
				]).start();
			}, 50); // Small delay to prevent glitch

			return () => clearTimeout(animationTimer);
		}
	}, [activeStep, insights.length, loading]); // Remove fadeAnim and slideAnim from dependencies

	// Mark insights as read when they are viewed
	useEffect(() => {
		const markInsightsAsRead = async () => {
			if (insights.length > 0) {
				try {
					// Mark all insights as read
					const markPromises = insights
						.filter((insight) => !insight.isRead)
						.map((insight) => InsightsService.markInsightAsRead(insight._id));

					if (markPromises.length > 0) {
						await Promise.all(markPromises);

						// Update local state to mark as read
						setInsights((prevInsights) =>
							prevInsights.map((insight) => ({ ...insight, isRead: true }))
						);
					}
				} catch (error) {
					console.error('Error marking insights as read:', error);
				}
			}
		};

		// Mark as read after a short delay to ensure the screen is fully loaded
		const timer = setTimeout(markInsightsAsRead, 500);
		return () => clearTimeout(timer);
	}, [insights]);

	// Refresh insights when returning to the screen
	useFocusEffect(
		React.useCallback(() => {
			// Refresh insights when the screen comes into focus
			// This could be used to refresh data if needed
		}, [])
	);

	// Handle when all smart actions are completed
	const handleAllActionsCompleted = useCallback(async () => {
		// Prevent duplicate alerts
		if (completionAlertShown) return;
		setCompletionAlertShown(true);

		try {
			setRefreshingInsights(true);

			// Use the specialized refresh method for post-action insights
			const response = await InsightsService.refreshInsightsAfterActions(
				period
			);

			if (response.success && response.data && Array.isArray(response.data)) {
				// Update insights with new data
				setInsights(response.data);

				// Show single comprehensive success message
				Alert.alert(
					'All Actions Completed! 🎉',
					'Your actions have been completed successfully and your insights have been refreshed with new recommendations.',
					[{ text: 'OK' }]
				);

				// Reset to intro step to show new insights
				setActiveStep(0);
			} else {
				// Show fallback message if refresh fails
				Alert.alert(
					'Actions Completed! ✅',
					'Your actions have been completed successfully!',
					[{ text: 'OK' }]
				);
			}
		} catch (error) {
			console.error(
				'Error refreshing insights after actions completed:',
				error
			);
			// Show fallback message if refresh fails
			Alert.alert(
				'Actions Completed! ✅',
				'Your actions have been completed successfully!',
				[{ text: 'OK' }]
			);
		} finally {
			setRefreshingInsights(false);
		}
	}, [period, completionAlertShown]);

	// Reset completion alert flag when insight changes
	useEffect(() => {
		setCompletionAlertShown(false);
	}, [insights[0]?._id]); // Reset when current insight changes

	if (loading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
			</SafeAreaView>
		);
	}

	if (insights.length === 0) {
		return (
			<SafeAreaView style={styles.center}>
				<MaterialCommunityIcons
					name="clipboard-text-off"
					size={48}
					color="#ccc"
				/>
				<Text style={styles.emptyTitle}>No insights yet</Text>
				<Text style={styles.emptyText}>
					Add transactions to get personalized tips.
				</Text>
			</SafeAreaView>
		);
	}

	// We'll guide through the first insight step-by-step
	const insight = insights[0];

	// Calculate steps array - simplified flow: intro → review → actions
	const steps: ('intro' | 'review' | 'actions')[] = ['intro'];

	// Only add review step if there's metadata or historical comparison
	if (insight?.metadata) {
		steps.push('review');
	}
	steps.push('actions'); // Always show intelligent actions

	const totalSteps = steps.length;

	// Debug logging
	console.log('Steps array:', steps);
	console.log('Active step:', activeStep);
	console.log('Current step:', steps[activeStep]);
	console.log('Total steps:', totalSteps);

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const headerDate = insight.generatedAt
		? new Date(insight.generatedAt).toLocaleDateString()
		: '';

	// Progress bar width
	const progressPercent = ((activeStep + 1) / totalSteps) * 100;

	// Toggle section expansion
	const toggleSection = (section: 'summary' | 'comparison') => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	// Render current step
	const renderStep = () => {
		const step = steps[activeStep];
		console.log('Rendering step:', step);

		// Fallback to intro if step is undefined
		if (!step) {
			console.log('Step is undefined, falling back to intro');
			return (
				<View style={styles.stepContainer}>
					<Text style={styles.stepTitle}>{insight.title}</Text>
					<Text style={styles.stepMessage}>{insight.message}</Text>
					{insight.detailedExplanation &&
						insight.detailedExplanation !== insight.message && (
							<Text style={styles.bodyText}>{insight.detailedExplanation}</Text>
						)}
				</View>
			);
		}

		switch (step) {
			case 'intro':
				return (
					<Animated.View
						style={[
							styles.stepContainer,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						{/* Show refresh indicator if refreshing insights */}
						{refreshingInsights && (
							<View style={styles.refreshIndicator}>
								<ActivityIndicator size="small" color="#2E78B7" />
								<Text style={styles.refreshText}>Updating insights...</Text>
							</View>
						)}

						<Text style={styles.stepTitle}>{insight.title}</Text>
						<Text style={styles.stepMessage}>{insight.message}</Text>
						{/* Include detailed explanation in intro if it's not redundant */}
						{insight.detailedExplanation &&
							insight.detailedExplanation !== insight.message && (
								<Text style={styles.bodyText}>
									{insight.detailedExplanation}
								</Text>
							)}
					</Animated.View>
				);

			case 'review':
				return (
					<Animated.View
						style={[
							styles.stepContainer,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						<Text style={styles.sectionTitle}>Review Your Data</Text>

						{/* Summary Section */}
						{insight.metadata && (
							<View style={styles.reviewSection}>
								<TouchableOpacity
									style={styles.sectionHeader}
									onPress={() => toggleSection('summary')}
								>
									<Text style={styles.sectionHeaderText}>
										Financial Summary
									</Text>
									<Ionicons
										name={
											expandedSections.summary ? 'chevron-up' : 'chevron-down'
										}
										size={20}
										color="#666"
									/>
								</TouchableOpacity>

								{expandedSections.summary && (
									<View style={styles.sectionContent}>
										<MetadataRow
											label="Income"
											icon="arrow-down"
											value={`$${insight.metadata.totalIncome.toFixed(2)}`}
										/>
										<MetadataRow
											label="Expenses"
											icon="arrow-up"
											value={`$${insight.metadata.totalExpenses.toFixed(2)}`}
										/>
										<MetadataRow
											label="Net"
											icon={
												insight.metadata.netIncome >= 0
													? 'arrow-up'
													: 'arrow-down'
											}
											value={`$${insight.metadata.netIncome.toFixed(2)}`}
											valueStyle={{
												color:
													insight.metadata.netIncome >= 0
														? '#66BB6A'
														: '#FF6B6B',
											}}
										/>

										{/* AI Insights Link */}
										<TouchableOpacity
											style={styles.aiInsightsLink}
											onPress={() => router.push('/(tabs)/settings/aiInsights')}
										>
											<View style={styles.aiInsightsLinkContent}>
												<Ionicons
													name="settings-outline"
													size={16}
													color="#007ACC"
												/>
												<Text style={styles.aiInsightsLinkText}>
													Customize AI Insights
												</Text>
											</View>
											<Ionicons
												name="chevron-forward"
												size={16}
												color="#007ACC"
											/>
										</TouchableOpacity>
									</View>
								)}
							</View>
						)}

						{/* Historical Comparison Section */}
						{insight.metadata?.historicalComparison && (
							<View style={styles.reviewSection}>
								<TouchableOpacity
									style={styles.sectionHeader}
									onPress={() => toggleSection('comparison')}
								>
									<Text style={styles.sectionHeaderText}>
										Historical Comparison
									</Text>
									<Ionicons
										name={
											expandedSections.comparison
												? 'chevron-up'
												: 'chevron-down'
										}
										size={20}
										color="#666"
									/>
								</TouchableOpacity>

								{expandedSections.comparison && (
									<View style={styles.sectionContent}>
										<HistoricalComparison
											historicalComparison={
												insight.metadata.historicalComparison
											}
											period={period}
										/>
									</View>
								)}
							</View>
						)}

						{/* Fallback if no metadata */}
						{!insight.metadata && (
							<View>
								<Text style={styles.bodyText}>
									No review data available for this insight.
								</Text>

								{/* AI Insights Link for fallback case */}
								<TouchableOpacity
									style={styles.aiInsightsLink}
									onPress={() => router.push('/(tabs)/settings/aiInsights')}
								>
									<View style={styles.aiInsightsLinkContent}>
										<Ionicons
											name="settings-outline"
											size={16}
											color="#007ACC"
										/>
										<Text style={styles.aiInsightsLinkText}>
											Customize AI Insights
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={16} color="#007ACC" />
								</TouchableOpacity>
							</View>
						)}
					</Animated.View>
				);

			case 'actions':
				return (
					<Animated.View
						style={[
							styles.stepContainer,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						<Text style={styles.sectionTitle}>Take Action</Text>
						<Text style={styles.bodyText}>
							Ready to improve your financial health? Choose an action below:
						</Text>
						<IntelligentActions
							insight={insight}
							period={period}
							onActionExecuted={(action, result) => {
								console.log('Action executed:', action, result);

								// If a detection action was completed, navigate to relevant screen
								if (action.type === 'detect_completion' && result.success) {
									// Navigate directly based on the detection type
									if (action.detectionType === 'transaction_count') {
										router.push('/(tabs)/transaction');
									} else if (action.detectionType === 'budget_created') {
										navigateToBudgetsWithModal();
									} else if (action.detectionType === 'goal_created') {
										navigateToGoalsWithModal();
									} else if (action.detectionType === 'preferences_updated') {
										router.push('/(tabs)/settings/aiInsights');
									}
								}
							}}
							onAllActionsCompleted={handleAllActionsCompleted} // Add new callback
						/>
					</Animated.View>
				);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<View style={styles.titleSection}>
						<Ionicons name="analytics" size={24} color="#fff" />
						<Text style={styles.headerTitle}>{cap(period)} Guide</Text>
					</View>
				</View>
				{headerDate ? (
					<Text style={styles.headerDate}>Generated on {headerDate}</Text>
				) : null}
			</View>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
			>
				{/* Step Content */}
				{renderStep()}
			</ScrollView>

			{/* Navigation Buttons - Fixed at bottom */}
			<View style={styles.navContainer}>
				{/* Progress Bar */}
				<View style={styles.progressBarContainer}>
					<View
						style={[styles.progressBar, { width: `${progressPercent}%` }]}
					/>
				</View>

				<View style={styles.navRow}>
					<RectButton
						onPress={() => setActiveStep((s) => Math.max(s - 1, 0))}
						enabled={activeStep !== 0}
						style={[
							styles.navBackButton,
							activeStep === 0 && styles.navDisabled,
						]}
					>
						<Text style={styles.navText}>Back</Text>
					</RectButton>

					{activeStep < totalSteps - 1 ? (
						<RectButton
							onPress={() => setActiveStep((s) => s + 1)}
							style={styles.navButton}
						>
							<Text style={styles.navText}>Next</Text>
						</RectButton>
					) : (
						<RectButton
							onPress={() => {
								router.replace('/insights');
							}}
							style={styles.navButton}
						>
							<Text style={styles.navText}>Finish</Text>
						</RectButton>
					)}
				</View>
			</View>
		</View>
	);
}

// Reusable sub-components
function MetadataRow({
	label,
	value,
	icon,
	valueStyle,
}: {
	label: string;
	value: string;
	icon: React.ComponentProps<typeof FontAwesome>['name'];
	valueStyle?: object;
}) {
	return (
		<View style={styles.metaRow}>
			<View style={styles.metaLabelRow}>
				<FontAwesome
					name={icon}
					size={14}
					color="#555"
					style={{ marginRight: 4 }}
				/>
				<Text style={styles.metaLabel}>{label}</Text>
			</View>
			<Text style={[styles.metaValue, valueStyle]}>{value}</Text>
		</View>
	);
}

// Styles
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	scrollView: { flex: 1 },
	content: { paddingBottom: 100 }, // Add extra padding to account for fixed nav buttons
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyTitle: { fontSize: 20, fontWeight: '600', color: '#999', marginTop: 12 },
	emptyText: {
		fontSize: 14,
		color: '#bbb',
		textAlign: 'center',
		marginHorizontal: 16,
	},
	header: {
		padding: 16,
		paddingBottom: 20,
		paddingTop: 70,
		backgroundColor: '#2E78B7',
		elevation: 5,
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 10,
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
	headerDate: {
		fontSize: 14,
		color: '#e0eaf0',
	},

	stepIndicator: {
		textAlign: 'center',
		color: '#888',
		marginBottom: 12,
		fontSize: 14,
		fontWeight: '500',
	},

	progressBarContainer: {
		height: 6,
		backgroundColor: '#ddd',
		marginHorizontal: 16,
		borderRadius: 3,
		overflow: 'hidden',
		marginBottom: 16,
	},
	progressBar: {
		height: 6,
		backgroundColor: '#007ACC',
		borderRadius: 3,
	},

	stepContainer: {
		padding: 16,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		marginBottom: 24,
	},
	stepTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#222',
		marginBottom: 12,
	},
	stepMessage: { fontSize: 16, color: '#555', lineHeight: 22 },

	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#222',
		marginBottom: 12,
	},
	bodyText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },

	reviewSection: {
		marginBottom: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#fafafa',
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
	},
	sectionHeaderText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	sectionContent: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},

	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	metaLabelRow: { flexDirection: 'row', alignItems: 'center' },
	metaLabel: { fontSize: 14, color: '#555' },
	metaValue: { fontSize: 14, fontWeight: '600', color: '#333' },

	navContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#ffffff',
		paddingVertical: 16,
		// paddingBottom: 32, // Extra padding for safe area

		elevation: 8,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: -2 },
		shadowRadius: 8,
	},
	navRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	navButton: {
		backgroundColor: '#007ACC',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 24,
		elevation: 2,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
	},
	navBackButton: {
		backgroundColor: '#4097d1',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 24,
		elevation: 2,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
	},
	navDisabled: { backgroundColor: '#aacbe1' },
	navText: { color: '#fff', fontWeight: '600', fontSize: 16 },

	aiInsightsLink: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginTop: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	aiInsightsLinkContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	aiInsightsLinkText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
		marginLeft: 8,
	},
	refreshIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E3F2FD',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#2196F3',
	},
	refreshText: {
		marginLeft: 8,
		color: '#1976D2',
		fontSize: 14,
		fontWeight: '500',
	},
});
