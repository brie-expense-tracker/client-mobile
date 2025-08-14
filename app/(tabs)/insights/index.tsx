// app/(tabs)/insights.tsx - Unified AI Experience

import React, {
	useContext,
	useEffect,
	useMemo,
	useState,
	useRef,
	useCallback,
} from 'react';
import {
	SafeAreaView,
	Text,
	StyleSheet,
	ActivityIndicator,
	View,
	TouchableOpacity,
	Alert,
	ScrollView,
	FlatList,
	RefreshControl,
	Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { TransactionContext } from '../../../src/context/transactionContext';
import { useProfile } from '../../../src/context/profileContext';
import AICoach from './components/AICoach';
import TutorialProgress from './components/TutorialProgress';
import { useProgression } from '../../../src/context/progressionContext';
import { ProgressionService } from '../../../src/services/progressionService';
import { useInsightsHub } from '../../../src/hooks';
import useThreads from '../../../src/hooks/useThreads';
import useActions from '../../../src/hooks/useActions';

type TabType = 'insights' | 'coach' | 'chat' | 'actions';

export default function UnifiedAIScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { profile, markAICoachSeen, updateAIInsightsSettings } = useProfile();
	const {
		checkProgression,
		progression,
		loading: progressionLoading,
	} = useProgression();

	// Animation values for better UX
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const slideAnim = useRef(new Animated.Value(0)).current;
	const [isAnimating, setIsAnimating] = useState(false);

	// Consolidated state management for unified AI experience
	const [aiExperienceState, setAiExperienceState] = useState({
		activeTab: 'insights' as TabType,
		isFirstTimeAICoach: false,
		insightsGenerated: false,
		error: null as string | null,
		retryCount: 0,
		isRefreshing: false,
		lastRefreshTime: 0,
	});
	const lastRefreshTimeRef = useRef(0);

	// Hooks for different AI features
	const { insights, loadingInsights, onRefresh } = useInsightsHub('week');
	const { threads, loading: threadsLoading } = useThreads();
	const { actions, loading: actionsLoading } = useActions();

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';

	// Check if tutorial is actually completed
	const isTutorialActuallyCompleted = useMemo(() => {
		const effectiveProgression = progression || profile?.progression || null;
		const completed =
			ProgressionService.isTutorialFullyCompleted(effectiveProgression);
		const allStepsCompleted =
			effectiveProgression?.tutorialSteps &&
			Object.values(effectiveProgression.tutorialSteps).every(
				(step) => step === true
			);
		return completed || allStepsCompleted;
	}, [progression, profile]);

	// Memoize tab content to avoid unnecessary re-renders
	const tabContent = useMemo(() => {
		switch (aiExperienceState.activeTab) {
			case 'insights':
				return (
					<View style={styles.tabContentContainer}>
						<AICoach isFirstTime={aiExperienceState.isFirstTimeAICoach} />
					</View>
				);
			case 'coach':
				return (
					<View style={styles.tabContentContainer}>
						<View style={styles.coachSection}>
							<Text style={styles.sectionTitle}>AI Financial Coach</Text>
							<Text style={styles.sectionSubtitle}>
								Get personalized financial guidance and recommendations
							</Text>

							{/* Quick Start Options */}
							<View style={styles.quickStartGrid}>
								<TouchableOpacity
									style={styles.quickStartCard}
									onPress={() => setActiveTab('chat')}
									accessibilityRole="button"
									accessibilityLabel="Start chat with AI coach"
								>
									<Ionicons
										name="chatbubble-ellipses"
										size={32}
										color="#2E78B7"
									/>
									<Text style={styles.quickStartTitle}>Start Chat</Text>
									<Text style={styles.quickStartSubtitle}>
										Ask questions about your finances
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.quickStartCard}
									onPress={() => setActiveTab('actions')}
									accessibilityRole="button"
									accessibilityLabel="View smart actions"
								>
									<Ionicons name="list" size={32} color="#2E78B7" />
									<Text style={styles.quickStartTitle}>Smart Actions</Text>
									<Text style={styles.quickStartSubtitle}>
										View recommended actions
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.quickStartCard}
									onPress={() => router.push('/(tabs)/budgets/goals')}
									accessibilityRole="button"
									accessibilityLabel="View financial goals"
								>
									<Ionicons name="trophy" size={32} color="#2E78B7" />
									<Text style={styles.quickStartTitle}>Goals</Text>
									<Text style={styles.quickStartSubtitle}>
										Track your progress
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.quickStartCard}
									onPress={() => router.push('/(stack)/settings/aiInsights')}
									accessibilityRole="button"
									accessibilityLabel="Review weekly reflection"
								>
									<Ionicons name="refresh" size={32} color="#2E78B7" />
									<Text style={styles.quickStartTitle}>Review</Text>
									<Text style={styles.quickStartSubtitle}>
										Weekly reflection
									</Text>
								</TouchableOpacity>
							</View>

							{/* Recent Conversations */}
							{threads.length > 0 && (
								<View style={styles.recentSection}>
									<Text style={styles.sectionTitle}>Recent Conversations</Text>
									<FlatList
										data={threads.slice(0, 3)}
										keyExtractor={(item) => item.id}
										renderItem={({ item }) => (
											<TouchableOpacity
												style={styles.conversationItem}
												onPress={() => setActiveTab('chat')}
												accessibilityRole="button"
												accessibilityLabel={`Open conversation: ${item.title}`}
											>
												<Ionicons
													name="chatbubble-outline"
													size={20}
													color="#2E78B7"
												/>
												<View style={styles.conversationInfo}>
													<Text style={styles.conversationTitle}>
														{item.title}
													</Text>
													<Text style={styles.conversationSubtitle}>
														{item.kpi}
													</Text>
												</View>
												<Ionicons
													name="chevron-forward"
													size={16}
													color="#666"
												/>
											</TouchableOpacity>
										)}
										scrollEnabled={false}
									/>
								</View>
							)}
						</View>
					</View>
				);
			case 'chat':
				return (
					<View style={styles.tabContentContainer}>
						<View style={styles.chatContainer}>
							<View style={styles.chatHeader}>
								<Text style={styles.chatTitle}>AI Chat</Text>
								<Text style={styles.chatSubtitle}>
									Ask me anything about your finances
								</Text>
							</View>

							<TouchableOpacity
								style={styles.startChatButton}
								onPress={() => setActiveTab('chat')}
								accessibilityRole="button"
								accessibilityLabel="Start new conversation"
							>
								<Ionicons name="chatbubble-outline" size={24} color="#fff" />
								<Text style={styles.startChatButtonText}>
									Start New Conversation
								</Text>
							</TouchableOpacity>

							{threads.length > 0 && (
								<View style={styles.chatHistory}>
									<Text style={styles.sectionTitle}>Recent Chats</Text>
									<FlatList
										data={threads}
										keyExtractor={(item) => item.id}
										renderItem={({ item }) => (
											<TouchableOpacity
												style={styles.chatItem}
												onPress={() => setActiveTab('chat')}
												accessibilityRole="button"
												accessibilityLabel={`Open chat: ${item.title}`}
											>
												<View style={styles.chatItemContent}>
													<Text style={styles.chatItemTitle}>{item.title}</Text>
													<Text style={styles.chatItemDate}>
														{new Date(
															item.updatedAt || item.createdAt
														).toLocaleDateString()}
													</Text>
												</View>
												<Ionicons
													name="chevron-forward"
													size={16}
													color="#666"
												/>
											</TouchableOpacity>
										)}
									/>
								</View>
							)}
						</View>
					</View>
				);
			case 'actions':
				return (
					<View style={styles.tabContentContainer}>
						<View style={styles.actionsSection}>
							<Text style={styles.sectionTitle}>Smart Actions</Text>
							<Text style={styles.sectionSubtitle}>
								Recommended actions based on your financial data
							</Text>

							{actionsLoading ? (
								<ActivityIndicator
									size="large"
									style={styles.loadingIndicator}
									color="#2E78B7"
								/>
							) : actions.length > 0 ? (
								<FlatList
									data={actions}
									keyExtractor={(item) => item.id}
									renderItem={({ item }) => (
										<View style={styles.actionItem}>
											<View style={styles.actionHeader}>
												<Ionicons
													name="flash-outline"
													size={20}
													color="#2E78B7"
												/>
												<Text style={styles.actionTitle}>{item.title}</Text>
												<View
													style={[
														styles.priorityBadge,
														{
															backgroundColor: getPriorityColor(item.priority),
														},
													]}
												>
													<Text style={styles.priorityText}>
														{item.priority}
													</Text>
												</View>
											</View>
											<Text style={styles.actionDescription}>
												{item.description}
											</Text>
										</View>
									)}
									scrollEnabled={false}
								/>
							) : (
								<View style={styles.emptyState}>
									<Ionicons name="checkmark-circle" size={48} color="#ccc" />
									<Text style={styles.emptyTitle}>All caught up!</Text>
									<Text style={styles.emptySubtitle}>
										No pending actions at the moment.
									</Text>
								</View>
							)}
						</View>
					</View>
				);
			default:
				return null;
		}
	}, [
		aiExperienceState.activeTab,
		aiExperienceState.isFirstTimeAICoach,
		threads,
		actions,
		actionsLoading,
	]);

	// State setters with proper error handling
	const setActiveTab = useCallback(
		(tab: TabType) => {
			if (aiExperienceState.activeTab === tab || isAnimating) return;
			setIsAnimating(true);
			// Animate out
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 120,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 30,
					duration: 120,
					useNativeDriver: true,
				}),
			]).start(() => {
				setAiExperienceState((prev) => ({ ...prev, activeTab: tab }));
				// Reset values instantly
				fadeAnim.setValue(0);
				slideAnim.setValue(-30);
				// Animate in
				Animated.parallel([
					Animated.timing(fadeAnim, {
						toValue: 1,
						duration: 180,
						useNativeDriver: true,
					}),
					Animated.timing(slideAnim, {
						toValue: 0,
						duration: 180,
						useNativeDriver: true,
					}),
				]).start(() => setIsAnimating(false));
			});
		},
		[aiExperienceState.activeTab, fadeAnim, slideAnim, isAnimating]
	);

	const setIsFirstTimeAICoach = useCallback((isFirstTime: boolean) => {
		setAiExperienceState((prev) => ({
			...prev,
			isFirstTimeAICoach: isFirstTime,
		}));
	}, []);

	const setInsightsGenerated = useCallback((generated: boolean) => {
		setAiExperienceState((prev) => ({
			...prev,
			insightsGenerated: generated,
		}));
	}, []);

	const clearError = useCallback(() => {
		setAiExperienceState((prev) => ({
			...prev,
			error: null,
			retryCount: 0,
		}));
	}, []);

	const handleError = useCallback(
		(error: Error) => {
			console.error('AI Experience Error:', error);

			setAiExperienceState((prev) => ({
				...prev,
				error: error.message,
			}));

			if (aiExperienceState.retryCount < 3) {
				setTimeout(() => {
					setAiExperienceState((prev) => ({
						...prev,
						retryCount: prev.retryCount + 1,
					}));
					// Retry the operation that failed
					checkProgression().catch(console.error);
				}, 1000 * (aiExperienceState.retryCount + 1));
			}
		},
		[aiExperienceState.retryCount, checkProgression]
	);

	// Enhanced refresh handling
	const handleRefresh = useCallback(async () => {
		const now = Date.now();
		if (now - aiExperienceState.lastRefreshTime < 5000) {
			return; // Prevent rapid refreshes
		}

		setAiExperienceState((prev) => ({
			...prev,
			isRefreshing: true,
			lastRefreshTime: now,
		}));

		try {
			await Promise.all([
				checkProgression(),
				// Add other refresh operations here
			]);
		} catch (error) {
			handleError(error as Error);
		} finally {
			setAiExperienceState((prev) => ({
				...prev,
				isRefreshing: false,
			}));
		}
	}, [aiExperienceState.lastRefreshTime, checkProgression, handleError]);

	// Refresh progression data when component mounts if tutorial is not completed
	useEffect(() => {
		const now = Date.now();
		const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
		const progressionLastCheck = progression?.lastProgressionCheck;
		const isProgressionRecent = progressionLastCheck
			? now - new Date(progressionLastCheck).getTime() < 30000
			: false;

		if (
			!isTutorialActuallyCompleted &&
			timeSinceLastRefresh > 10000 &&
			!isProgressionRecent
		) {
			console.log(
				'📱 Unified AI: Component mounted, refreshing progression...'
			);
			lastRefreshTimeRef.current = now;
			checkProgression()
				.then(() => {
					console.log('📱 Unified AI: Progression refresh completed');
				})
				.catch((error) => {
					console.error('📱 Unified AI: Error refreshing progression:', error);
					handleError(error as Error);
				});
		}
	}, [
		checkProgression,
		isTutorialActuallyCompleted,
		progression?.lastProgressionCheck,
		handleError,
	]);

	// Determine if this is the initial load
	const isInitialLoad =
		(progressionLoading && !progression) ||
		(transactionsLoading && (!transactions || transactions.length === 0));

	// Show error state if there's an error
	if (aiExperienceState.error) {
		return (
			<SafeAreaView style={styles.center}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={64} color="#dc2626" />
					<Text style={styles.errorTitle}>Something went wrong</Text>
					<Text style={styles.errorMessage}>{aiExperienceState.error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={clearError}>
						<Text style={styles.retryButtonText}>Try Again</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={() => router.push('/(stack)/settings/aiInsights')}
					>
						<Text style={styles.secondaryButtonText}>Check Settings</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	if (isInitialLoad) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" color="#2E78B7" />
				<Text style={styles.loadingText}>Loading AI experience...</Text>
			</SafeAreaView>
		);
	}

	// Show tutorial progress when tutorial is not completed
	if (!isTutorialActuallyCompleted) {
		console.log('📱 Unified AI: Showing tutorial progress screen');

		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<View style={styles.titleSection}>
							<Ionicons name="sparkles" size={24} color="#fff" />
							<Text style={styles.headerTitle}>AI Assistant</Text>
						</View>
					</View>
					<Text style={styles.headerSubtitle}>
						Complete the steps below to unlock your AI financial assistant
					</Text>
				</View>

				<TutorialProgress
					onTutorialCompleted={async () => {
						console.log('📱 Unified AI: Tutorial completed callback triggered');

						Alert.alert(
							'🎉 Tutorial Complete!',
							"Congratulations! You've unlocked your AI financial assistant.",
							[{ text: 'Continue' }]
						);

						if (aiExperienceState.insightsGenerated) {
							console.log(
								'📱 Unified AI: Insights already generated, skipping...'
							);
							return;
						}

						try {
							await checkProgression();
							await markAICoachSeen();
							setIsFirstTimeAICoach(true);

							console.log(
								'🎯 Generating personalized insights after tutorial completion...'
							);
							const { InsightsService } = await import(
								'../../../src/services/insightsService'
							);

							const result = await InsightsService.generateInsights('weekly');

							if (result.success) {
								console.log('✅ Personalized insights generated successfully!');
								setInsightsGenerated(true);
								setTimeout(() => {
									Alert.alert(
										'✨ AI Assistant Ready!',
										'Your AI financial assistant is ready! Get personalized insights, coaching, and smart recommendations.',
										[{ text: 'Great!' }]
									);
								}, 1000);
							}
						} catch (error) {
							console.error(
								'❌ Error generating insights after tutorial completion:',
								error
							);
							setTimeout(() => {
								Alert.alert(
									'AI Assistant Ready',
									'Your tutorial is complete! Your AI assistant will be available shortly.',
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
					<Ionicons name="sparkles" size={64} color="#ccc" />
					<Text style={styles.disabledTitle}>AI Assistant Disabled</Text>
					<Text style={styles.disabledText}>
						Your AI financial assistant is currently disabled. Enable it to get
						personalized insights, coaching, and smart recommendations.
					</Text>
					<TouchableOpacity
						style={styles.enableButton}
						onPress={async () => {
							try {
								await updateAIInsightsSettings({ enabled: true });
								Alert.alert(
									'AI Assistant Enabled!',
									'Your AI financial assistant has been enabled. You should now see your personalized insights and coaching.',
									[{ text: 'Great!' }]
								);
							} catch (error) {
								console.error('Error enabling AI assistant:', error);
								router.push('/(stack)/settings/aiInsights');
							}
						}}
					>
						<Text style={styles.enableButtonText}>Enable AI Assistant</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.settingsButton}
						onPress={() => router.push('/(stack)/settings/aiInsights')}
					>
						<Text style={styles.settingsButtonText}>Go to Settings</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Tab Button Component with improved badge validation and accessibility
	const TabButton = ({
		tab,
		label,
		icon,
		isActive,
		badge,
	}: {
		tab: TabType;
		label: string;
		icon: string;
		isActive: boolean;
		badge?: number;
	}) => {
		// Enhanced badge validation with proper type checking
		const validBadge = useMemo(() => {
			if (typeof badge !== 'number' || isNaN(badge) || badge <= 0) {
				return 0;
			}
			// Cap badge at 99 to prevent UI overflow
			return Math.min(badge, 99);
		}, [badge]);

		return (
			<TouchableOpacity
				style={[
					styles.tabButton,
					isActive && styles.tabButtonActive,
					isAnimating && { opacity: 0.5 },
				]}
				onPress={() => setActiveTab(tab)}
				accessibilityRole="tab"
				accessibilityState={{ selected: isActive, disabled: isAnimating }}
				accessibilityLabel={`${label} tab${
					validBadge > 0 ? ` with ${validBadge} notifications` : ''
				}`}
				disabled={isAnimating}
			>
				<View style={styles.tabIconContainer}>
					<Ionicons
						name={icon as any}
						size={20}
						color={isActive ? '#2E78B7' : '#666'}
					/>
					{validBadge > 0 && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>
								{validBadge > 99 ? '99+' : validBadge.toString()}
							</Text>
						</View>
					)}
				</View>
				<Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
					{label}
				</Text>
			</TouchableOpacity>
		);
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high':
				return '#dc2626';
			case 'medium':
				return '#f59e0b';
			case 'low':
				return '#10b981';
			default:
				return '#6b7280';
		}
	};

	// Calculate badges for tabs
	const insightsBadge = Array.isArray(insights)
		? insights.filter((i) => !i.isRead).length
		: 0;
	const actionsBadge = Array.isArray(actions)
		? actions.filter((a) => !a.executed).length
		: 0;

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<View style={styles.titleSection}>
						<Ionicons name="sparkles" size={24} color="#fff" />
						<Text style={styles.headerTitle}>AI Assistant</Text>
					</View>
					<TouchableOpacity
						style={styles.settingsButton}
						onPress={() => router.push('/(stack)/settings/aiInsights')}
						accessibilityRole="button"
						accessibilityLabel="AI settings"
					>
						<Ionicons name="settings-outline" size={20} color="#fff" />
					</TouchableOpacity>
				</View>
				<Text style={styles.headerSubtitle}>
					Your personalized financial AI assistant
				</Text>
				<Text style={styles.frequencyText}>
					Updates:{' '}
					{userFrequency.charAt(0).toUpperCase() + userFrequency.slice(1)}
				</Text>
			</View>

			{/* Tab Navigation */}
			<View style={styles.tabBar}>
				<TabButton
					tab="insights"
					label="Insights"
					icon="bulb-outline"
					isActive={aiExperienceState.activeTab === 'insights'}
					badge={insightsBadge || 0}
				/>
				<TabButton
					tab="coach"
					label="Coach"
					icon="person-outline"
					isActive={aiExperienceState.activeTab === 'coach'}
				/>
				<TabButton
					tab="chat"
					label="Chat"
					icon="chatbubble-outline"
					isActive={aiExperienceState.activeTab === 'chat'}
				/>
				<TabButton
					tab="actions"
					label="Actions"
					icon="list-outline"
					isActive={aiExperienceState.activeTab === 'actions'}
					badge={actionsBadge || 0}
				/>
			</View>

			{/* Content Area with Single ScrollView */}
			<View style={styles.contentContainer}>
				<Animated.View
					style={{
						flex: 1,
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
					pointerEvents={isAnimating ? 'none' : 'auto'}
				>
					<ScrollView
						style={styles.mainScrollView}
						contentContainerStyle={styles.scrollContent}
						refreshControl={
							<RefreshControl
								refreshing={loadingInsights || aiExperienceState.isRefreshing}
								onRefresh={onRefresh}
								colors={['#2E78B7']}
								tintColor="#2E78B7"
							/>
						}
						showsVerticalScrollIndicator={false}
						bounces={true}
						scrollEventThrottle={16}
					>
						{tabContent}
					</ScrollView>
				</Animated.View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#2E78B7' },
	header: {
		paddingHorizontal: 20,
		paddingBottom: 20,
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
	tabBar: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderColor: '#e5e7eb',
	},
	tabButton: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 8,
		minHeight: 60, // Improved touch target
	},
	tabButtonActive: {
		borderBottomWidth: 2,
		borderColor: '#2E78B7',
	},
	tabIconContainer: {
		position: 'relative',
		marginBottom: 4,
	},
	tabLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	tabLabelActive: {
		color: '#2E78B7',
		fontWeight: '600',
	},
	badge: {
		position: 'absolute',
		top: -8,
		right: -8,
		backgroundColor: '#dc2626',
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	badgeText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '600',
	},
	contentContainer: { flex: 1, backgroundColor: '#fff' },
	mainScrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	tabContentContainer: {
		flex: 1,
		paddingHorizontal: 20,
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
		marginBottom: 16,
		minHeight: 48, // Improved touch target
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
		minHeight: 48, // Improved touch target
	},
	settingsButtonText: {
		color: '#2E78B7',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
	// Coach section styles
	coachSection: {
		paddingVertical: 16,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 24,
	},
	quickStartGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 32,
	},
	quickStartCard: {
		width: '48%',
		backgroundColor: '#f9fafb',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginBottom: 16,
		minHeight: 120, // Improved touch target
	},
	quickStartTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginTop: 8,
		marginBottom: 4,
	},
	quickStartSubtitle: {
		fontSize: 12,
		color: '#666',
		textAlign: 'center',
	},
	recentSection: {
		marginTop: 16,
	},
	conversationItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		marginBottom: 8,
		minHeight: 60, // Improved touch target
	},
	conversationInfo: {
		flex: 1,
		marginLeft: 12,
	},
	conversationTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
	},
	conversationSubtitle: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	// Chat section styles
	chatContainer: {
		flex: 1,
		paddingVertical: 16,
	},
	chatHeader: {
		alignItems: 'center',
		marginBottom: 32,
	},
	chatTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	chatSubtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
	},
	startChatButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2E78B7',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		marginBottom: 32,
		minHeight: 56, // Improved touch target
	},
	startChatButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	chatHistory: {
		flex: 1,
	},
	chatItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		backgroundColor: '#f9fafb',
		borderRadius: 12,
		marginBottom: 12,
		minHeight: 64, // Improved touch target
	},
	chatItemContent: {
		flex: 1,
	},
	chatItemTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
	},
	chatItemDate: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	// Actions section styles
	actionsSection: {
		paddingVertical: 16,
	},
	loadingIndicator: {
		marginTop: 32,
	},
	actionItem: {
		backgroundColor: '#f9fafb',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	actionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	actionTitle: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	priorityText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	actionDescription: {
		fontSize: 13,
		color: '#666',
		lineHeight: 18,
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#666',
		marginTop: 16,
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#fff',
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginTop: 16,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 16,
		color: '#666',
		marginTop: 8,
		textAlign: 'center',
		marginBottom: 24,
	},
	retryButton: {
		backgroundColor: '#2E78B7',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginBottom: 12,
		minHeight: 44, // Improved touch target
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	secondaryButton: {
		backgroundColor: '#f8f9fa',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e9ecef',
		minHeight: 44, // Improved touch target
	},
	secondaryButtonText: {
		color: '#666',
		fontSize: 16,
		fontWeight: '600',
	},
});
