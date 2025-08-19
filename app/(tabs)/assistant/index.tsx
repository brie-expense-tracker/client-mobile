// app/(tabs)/insights.tsx — Brie AI (clean, focused assistant)
// Enhanced AI system with conversation context and intelligent responses

import React, {
	useState,
	useCallback,
	useRef,
	useEffect,
	useContext,
	useMemo,
} from 'react';
import {
	SafeAreaView,
	Text,
	StyleSheet,
	View,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	FlatList,
	UIManager,
	AccessibilityInfo,
	Alert,
} from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { TransactionContext } from '../../../src/context/transactionContext';
import { useProfile } from '../../../src/context/profileContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { CustomGPTService } from '../../../src/services/customGPTService';
import PaywallModal from './components/PaywallModal';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ————————————————————————————————————————————————————————————
// Types
interface Message {
	id: string;
	text: string;
	isUser: boolean;
	timestamp: Date;
	type: 'text' | 'insight' | 'data' | 'action' | 'suggestion';
	data?: any;
}

interface SuggestedPrompt {
	id: string;
	text: string;
	icon: keyof typeof Ionicons.glyphMap;
	category: 'spending' | 'budget' | 'goals' | 'general';
}

// ————————————————————————————————————————————————————————————
// Hooks
const useReducedMotion = () => {
	const [reduce, setReduce] = useState(false);
	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
		const sub = AccessibilityInfo.addEventListener(
			'reduceMotionChanged',
			setReduce
		);
		return () => sub.remove();
	}, []);
	return reduce;
};

// ————————————————————————————————————————————————————————————
// Enhanced UI Components
const Header = ({
	onOpenSettings,
	currentUsage,
}: {
	onOpenSettings: () => void;
	currentUsage: any;
}) => {
	const [showUsageIndicator, setShowUsageIndicator] = useState(false);
	const [usagePercent, setUsagePercent] = useState(0);

	// Check if user is approaching limits for subtle usage indicator
	useEffect(() => {
		if (!currentUsage || currentUsage.subscriptionTier !== 'free') {
			setShowUsageIndicator(false);
			return;
		}

		// Debug logging to see actual usage values
		console.log('🔍 [Header] Current usage:', {
			tokens: `${currentUsage.currentTokens}/${currentUsage.tokenLimit}`,
			requests: `${currentUsage.currentRequests}/${currentUsage.requestLimit}`,
			conversations: `${currentUsage.currentConversations}/${currentUsage.conversationLimit}`,
		});

		// Calculate real usage percentages
		const tokenUsagePercent =
			(currentUsage.currentTokens / currentUsage.tokenLimit) * 100;
		const requestUsagePercent =
			(currentUsage.currentRequests / currentUsage.requestLimit) * 100;
		const conversationUsagePercent =
			(currentUsage.currentConversations / currentUsage.conversationLimit) *
			100;

		console.log('🔍 [Header] Usage percentages:', {
			tokens: tokenUsagePercent.toFixed(1) + '%',
			requests: requestUsagePercent.toFixed(1) + '%',
			conversations: conversationUsagePercent.toFixed(1) + '%',
		});

		// Get the highest usage percentage
		const maxUsagePercent = Math.max(
			tokenUsagePercent,
			requestUsagePercent,
			conversationUsagePercent
		);

		// Only show indicator when actually approaching limits (above 60%)
		if (maxUsagePercent > 60) {
			console.log(
				'🔍 [Header] Showing usage indicator at',
				maxUsagePercent.toFixed(1) + '%'
			);
			setUsagePercent(maxUsagePercent);
			setShowUsageIndicator(true);
		} else {
			console.log('🔍 [Header] Hiding usage indicator (usage below 60%)');
			setShowUsageIndicator(false);
		}
	}, [currentUsage]);

	return (
		<View style={styles.headerWrap}>
			<SafeAreaView>
				<View style={styles.headerRow}>
					<View style={styles.brandRow}>
						<Ionicons name="sparkles" size={18} color="#1e293b" />
						<Text style={styles.brandText}>Brie AI</Text>
					</View>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={onOpenSettings}
						accessibilityLabel="Open AI insight settings"
						style={styles.settingsButton}
					>
						<Ionicons name="ellipsis-horizontal" size={20} color="#64748b" />
					</TouchableOpacity>
				</View>

				{/* Subtle usage indicator - only show when approaching limits */}
				{showUsageIndicator && (
					<View style={styles.usageIndicator}>
						<View style={styles.usageBar}>
							<View
								style={[
									styles.usageFill,
									{
										width: `${Math.min(usagePercent, 100)}%`,
										backgroundColor:
											usagePercent > 80
												? '#ff6b6b'
												: usagePercent > 60
												? '#ffa726'
												: '#4caf50',
									},
								]}
							/>
						</View>
						<Text style={styles.usageText}>
							{usagePercent > 80
								? 'High usage'
								: usagePercent > 60
								? 'Moderate usage'
								: 'Normal usage'}
						</Text>
					</View>
				)}
			</SafeAreaView>
		</View>
	);
};

const SuggestedPrompts = ({ onPick }: { onPick: (prompt: string) => void }) => {
	const [suggestions, setSuggestions] = useState<string[]>([
		'How do I create my first budget?',
		'What should I do with my emergency fund?',
		'How can I start saving more money?',
		'What are good financial goals to set?',
		'How do I track my expenses?',
		'What should I focus on financially?',
		'Create a new budget',
		'Add a new expense',
	]);

	// Update suggestions based on context when component mounts
	useEffect(() => {
		const updateSuggestions = async () => {
			try {
				// For now, use static suggestions since HybridAI doesn't have getSuggestedQuestions
				const staticSuggestions = [
					'How is my grocery budget doing?',
					'Am I on track with my financial goals?',
					'How is my spending trending?',
					"What's my current savings rate?",
					'Should I adjust any of my budgets?',
					'How can I improve my financial health?',
				];
				setSuggestions(staticSuggestions);
			} catch (error) {
				console.log(
					'[AI Assistant] Could not load contextual suggestions:',
					error
				);
			}
		};

		updateSuggestions();
	}, []);

	const prompts: SuggestedPrompt[] = suggestions.map((text, index) => ({
		id: (index + 1).toString(),
		text,
		icon: [
			'pie-chart',
			'trending-up',
			'flag',
			'bulb',
			'analytics',
			'compass',
			'add-circle',
			'receipt',
		][index] as keyof typeof Ionicons.glyphMap,
		category: [
			'budget',
			'spending',
			'goals',
			'general',
			'spending',
			'general',
			'budget',
			'spending',
		][index] as 'spending' | 'budget' | 'goals' | 'general',
	}));

	return (
		<View style={[styles.msgWrap, styles.msgAI]}>
			<Text style={styles.promptsTitle}>What would you like to know?</Text>
			<View style={styles.promptsGrid}>
				{prompts.map((prompt) => (
					<TouchableOpacity
						key={prompt.id}
						onPress={() => {
							console.log('🔍 [DEBUG] Prompt tapped:', prompt.text);
							onPick(prompt.text);
						}}
						style={styles.promptCard}
						activeOpacity={0.8}
					>
						<View style={styles.promptIcon}>
							<Ionicons name={prompt.icon} size={16} color="#2563eb" />
						</View>
						<Text style={styles.promptText}>{prompt.text}</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
};

// New component for the welcome message suggestions
const WelcomeSuggestions = ({
	onPick,
}: {
	onPick: (prompt: string) => void;
}) => {
	const suggestions = [
		{
			id: '1',
			text: 'Ask me about creating budgets or tracking expenses',
			icon: 'pie-chart' as keyof typeof Ionicons.glyphMap,
			category: 'budget' as const,
		},
		{
			id: '2',
			text: 'Get help setting and achieving financial goals',
			icon: 'flag' as keyof typeof Ionicons.glyphMap,
			category: 'goals' as const,
		},
		{
			id: '3',
			text: 'Learn about saving strategies and spending patterns',
			icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
			category: 'spending' as const,
		},
		{
			id: '4',
			text: 'Get personalized financial advice and tips',
			icon: 'bulb' as keyof typeof Ionicons.glyphMap,
			category: 'general' as const,
		},
	];

	return (
		<View style={[styles.msgWrap, styles.msgAI]}>
			<Text style={styles.promptsTitle}>
				Here&apos;s how I can help you today:
			</Text>
			<View style={styles.promptsGrid}>
				{suggestions.map((suggestion) => (
					<TouchableOpacity
						key={suggestion.id}
						onPress={() => {
							console.log(
								'🔍 [DEBUG] Welcome suggestion tapped:',
								suggestion.text
							);
							onPick(suggestion.text);
						}}
						style={styles.promptCard}
						activeOpacity={0.8}
					>
						<View style={styles.promptIcon}>
							<Ionicons name={suggestion.icon} size={16} color="#2563eb" />
						</View>
						<Text style={styles.promptText}>{suggestion.text}</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
};

const ScrollToBottomFab = ({
	visible,
	onPress,
}: {
	visible: boolean;
	onPress: () => void;
}) => {
	const scale = useSharedValue(0);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		scale.value = withTiming(visible ? 1 : 0, {
			duration: reduceMotion ? 0 : 180,
		});
	}, [visible, reduceMotion]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: scale.value,
	}));

	return (
		<Animated.View style={[styles.fabContainer, animatedStyle]}>
			<TouchableOpacity onPress={onPress} style={styles.fab}>
				<Ionicons name="arrow-down" size={18} color="#fff" />
			</TouchableOpacity>
		</Animated.View>
	);
};

const MessageBubble = ({
	m,
	onPickPrompt,
	onShowPremium,
	showPremiumHint,
}: {
	m: Message;
	onPickPrompt?: (text: string) => void;
	onShowPremium?: () => void;
	showPremiumHint?: boolean;
}) => {
	console.log('🔍 [DEBUG] MessageBubble rendering message:', m);
	console.log('🔍 [DEBUG] Message type:', m.type);
	console.log('🔍 [DEBUG] onPickPrompt function:', onPickPrompt);

	if (m.type === 'suggestion') {
		console.log('🔍 [DEBUG] Rendering suggestion component');
		// Check if this is welcome suggestions or regular suggestions
		if (m.data?.isWelcomeSuggestions) {
			return <WelcomeSuggestions onPick={onPickPrompt!} />;
		}
		return <SuggestedPrompts onPick={onPickPrompt!} />;
	}

	if (m.type === 'insight') {
		console.log('🔍 [DEBUG] Rendering InsightsCard component');
		return (
			<InsightsCard
				insights={m.data?.insights || []}
				suggestions={m.data?.suggestions || []}
			/>
		);
	}

	return (
		<View style={[styles.msgWrap, m.isUser ? styles.msgUser : styles.msgAI]}>
			<Text
				style={[
					styles.msgText,
					m.isUser ? styles.msgTextUser : styles.msgTextAI,
				]}
			>
				{m.text}
			</Text>
			<Text style={m.isUser ? styles.msgTimeUser : styles.msgTimeAI}>
				{m.timestamp.toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				})}
			</Text>

			{/* Premium features hint - only show when explicitly triggered */}
			{!m.isUser && m.type === 'text' && showPremiumHint && onShowPremium && (
				<TouchableOpacity
					onPress={onShowPremium}
					style={styles.premiumHint}
					activeOpacity={0.7}
				>
					<View style={styles.premiumHintContent}>
						<Ionicons name="sparkles" size={14} color="#8b5cf6" />
						<Text style={styles.premiumHintText}>
							Unlock advanced insights & unlimited conversations
						</Text>
						<Ionicons name="chevron-forward" size={14} color="#8b5cf6" />
					</View>
				</TouchableOpacity>
			)}
		</View>
	);
};

const InsightsCard = ({
	insights,
	suggestions,
}: {
	insights: any[];
	suggestions: any[];
}) => {
	const getInsightIcon = (type: string) => {
		switch (type) {
			case 'warning':
				return 'warning';
			case 'info':
				return 'information-circle';
			case 'suggestion':
				return 'bulb';
			default:
				return 'sparkles';
		}
	};

	const getInsightColor = (type: string) => {
		switch (type) {
			case 'warning':
				return '#ef4444';
			case 'info':
				return '#3b82f6';
			case 'suggestion':
				return '#10b981';
			default:
				return '#8b5cf6';
		}
	};

	const getSuggestionIcon = (type: string) => {
		switch (type) {
			case 'action':
				return 'play-circle';
			case 'tip':
				return 'lightbulb';
			default:
				return 'checkmark-circle';
		}
	};

	const getSuggestionColor = (type: string) => {
		switch (type) {
			case 'action':
				return '#f59e0b';
			case 'tip':
				return '#8b5cf6';
			default:
				return '#10b981';
		}
	};

	return (
		<>
			{/* Insights Section - Independent of message bubble */}
			{insights.length > 0 && (
				<View style={styles.insightsSection}>
					<View style={styles.insightsHeader}>
						<Ionicons name="sparkles" size={16} color="#8b5cf6" />
						<Text style={styles.insightsTitle}>Quick Insights</Text>
					</View>
					<View style={styles.insightsList}>
						{insights.map((insight, index) => (
							<View key={index} style={styles.insightCard}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.type) as any}
										size={16}
										color={getInsightColor(insight.type)}
									/>
								</View>
								<View style={styles.insightContent}>
									<Text style={styles.insightTitle}>{insight.title}</Text>
									<Text style={styles.insightMessage} numberOfLines={4}>
										{insight.message}
									</Text>
									{insight.priority === 'high' && (
										<View style={styles.priorityBadge}>
											<Text style={styles.priorityText}>High Priority</Text>
										</View>
									)}
								</View>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Message Bubble */}
			<View style={[styles.msgWrap, styles.msgAI]}>
				{/* Suggestions Section */}
				{suggestions.length > 0 && (
					<View style={styles.suggestionsSection}>
						<View style={styles.suggestionsHeader}>
							<Ionicons name="flag" size={16} color="#f59e0b" />
							<Text style={styles.suggestionsTitle}>Smart Suggestions</Text>
						</View>
						<View style={styles.suggestionsList}>
							{suggestions.map((suggestion, index) => (
								<View key={index} style={styles.suggestionCard}>
									<View style={styles.suggestionIconContainer}>
										<Ionicons
											name={getSuggestionIcon(suggestion.type) as any}
											size={16}
											color={getSuggestionColor(suggestion.type)}
										/>
									</View>
									<View style={styles.suggestionContent}>
										<Text style={styles.suggestionTitle}>
											{suggestion.title}
										</Text>
										<Text
											style={styles.suggestionDescription}
											numberOfLines={2}
										>
											{suggestion.description}
										</Text>
										<View style={styles.suggestionBadge}>
											<Text style={styles.suggestionBadgeText}>
												{suggestion.category}
											</Text>
										</View>
									</View>
								</View>
							))}
						</View>
					</View>
				)}
			</View>
		</>
	);
};

const TypingDots = () => {
	const o1 = useSharedValue(0.3);
	const o2 = useSharedValue(0.3);
	const o3 = useSharedValue(0.3);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		if (reduceMotion) return;

		// Use runOnJS to handle the setTimeout on the JS thread
		const startAnimation = () => {
			// First dot
			o1.value = withTiming(1, { duration: 500 }, () => {
				o1.value = withTiming(0.3, { duration: 700 });
			});

			// Second dot with delay
			setTimeout(() => {
				o2.value = withTiming(1, { duration: 500 }, () => {
					o2.value = withTiming(0.3, { duration: 700 });
				});
			}, 150);

			// Third dot with delay
			setTimeout(() => {
				o3.value = withTiming(1, { duration: 500 }, () => {
					o3.value = withTiming(0.3, { duration: 700 });
				});
			}, 300);
		};

		startAnimation();

		// Set up continuous loop
		const interval = setInterval(() => {
			startAnimation();
		}, 1200); // Total cycle time

		return () => clearInterval(interval);
	}, [reduceMotion, o1, o2, o3]);

	const d1 = useAnimatedStyle(() => ({ opacity: o1.value }));
	const d2 = useAnimatedStyle(() => ({ opacity: o2.value }));
	const d3 = useAnimatedStyle(() => ({ opacity: o3.value }));

	return (
		<View style={[styles.msgWrap, styles.msgAI]}>
			<View style={styles.typingRow}>
				<Animated.View style={[styles.dot, d1]} />
				<Animated.View style={[styles.dot, d2]} />
				<Animated.View style={[styles.dot, d3]} />
				<Text style={styles.typingText}>Analyzing your finances…</Text>
			</View>
		</View>
	);
};

// ————————————————————————————————————————————————————————————
// Main Component
export default function AIAssistant() {
	const router = useRouter();
	const { profile } = useProfile();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);

	const [messages, setMessages] = useState<Message[]>([]);
	const [inputText, setInputText] = useState('');
	const [isTyping, setIsTyping] = useState(false);
	const [showFab, setShowFab] = useState(false);
	// Generate session ID for this conversation
	const sessionId = useMemo(
		() =>
			`mobile_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		[]
	);

	// Transform budgets to include utilization property and ensure type compatibility
	const budgetsWithUtilization = useMemo(() => {
		return (
			budgets?.map((budget) => ({
				...budget,
				spent: budget.spent || 0,
				utilization: budget.spent ? (budget.spent / budget.amount) * 100 : 0,
				createdAt: budget.createdAt ? new Date(budget.createdAt) : new Date(),
				updatedAt: budget.updatedAt ? new Date(budget.updatedAt) : new Date(),
			})) || []
		);
	}, [budgets]);

	// Transform goals to ensure type compatibility
	const goalsWithCompatibility = useMemo(() => {
		return (
			goals?.map((goal) => ({
				...goal,
				targetAmount: goal.target || 0,
				currentAmount: goal.current || 0,
				progress: goal.percent || 0,
				deadline: goal.deadline ? new Date(goal.deadline) : new Date(),
				createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(),
				updatedAt: goal.updatedAt ? new Date(goal.updatedAt) : new Date(),
			})) || []
		);
	}, [goals]);

	// Transform transactions to ensure type compatibility
	const transactionsWithCompatibility = useMemo(() => {
		return (
			transactions?.map((transaction) => ({
				...transaction,
				date: transaction.date ? new Date(transaction.date) : new Date(),
				createdAt: new Date(), // Default to now since transaction context doesn't provide this
				updatedAt: new Date(), // Default to now since transaction context doesn't provide this
			})) || []
		);
	}, [transactions]);

	const [aiService] = useState(
		() =>
			new CustomGPTService({
				budgets: budgetsWithUtilization,
				goals: goalsWithCompatibility,
				transactions: transactionsWithCompatibility,
				userProfile: profile
					? {
							monthlyIncome: profile.monthlyIncome,
							financialGoal: profile.financialGoal,
							riskProfile: profile.riskProfile?.tolerance,
					  }
					: undefined,
			})
	);

	// Paywall state
	const [showPaywall, setShowPaywall] = useState(false);
	const [paywallReason, setPaywallReason] = useState('');
	const [showPremiumHint, setShowPremiumHint] = useState(false);
	const [currentUsage, setCurrentUsage] = useState({
		currentTokens: 0,
		tokenLimit: 10000,
		currentRequests: 0,
		requestLimit: 50,
		currentConversations: 0,
		conversationLimit: 20,
		subscriptionTier: 'free',
		estimatedCost: 0,
	});

	const listRef = useRef<FlatList>(null);

	// Function to provide intelligent fallback responses using custom GPT service
	const getFallbackResponse = (userQuestion: string): string => {
		try {
			// Use the custom GPT service for fallback responses
			const response = aiService.getFallbackResponse(userQuestion);
			return response;
		} catch (error) {
			console.log(
				'[FallbackResponse] Error using custom GPT, falling back to basic response:',
				error
			);

			// Basic fallback if custom GPT fails
			return `I can help you with your finances! Here are some things you can ask me about:

• **Budgets**: "How is my grocery budget doing?"
• **Goals**: "Am I on track with my savings goal?"
• **Spending**: "How is my spending trending?"
• **General**: "What's my overall financial health?"

What would you like to know more about?`;
		}
	};

	// Initialize with welcome message
	useEffect(() => {
		if (messages.length === 0) {
			const initializeWelcomeMessage = async () => {
				try {
					// Get personalized welcome message using AI service
					const context = await aiService.getConversationContext();
					const { financial } = context;

					let welcomeText = `Hey! I'm your financial copilot. I'm here to help you build better money habits and reach your financial goals. `;

					if (
						financial?.currentBudgets &&
						financial.currentBudgets.length > 0
					) {
						const totalBudget = financial.currentBudgets.reduce(
							(sum, b) => sum + b.remaining,
							0
						);
						welcomeText += `I can see you have ${
							financial.currentBudgets.length
						} active budgets with $${totalBudget.toFixed(
							2
						)} remaining this period. `;
					} else {
						welcomeText += `Let's start by creating your first budget to track your spending! `;
					}

					if (financial?.activeGoals && financial.activeGoals.length > 0) {
						const avgProgress =
							financial.activeGoals.reduce((sum, g) => sum + g.progress, 0) /
							financial.activeGoals.length;
						welcomeText += `You're tracking ${
							financial.activeGoals.length
						} goals with an average progress of ${avgProgress.toFixed(1)}%. `;
					} else {
						welcomeText += `Setting financial goals will help you stay motivated and focused! `;
					}

					if (financial.monthlyOverview.savingsRate > 0) {
						welcomeText += `Great job on your ${financial.monthlyOverview.savingsRate.toFixed(
							1
						)}% savings rate! `;
					} else {
						welcomeText += `Building an emergency fund is a great first step! `;
					}

					welcomeText += `\n\nWhat would you like to work on first?`;

					const welcomeMessage: Message = {
						id: 'welcome',
						text: welcomeText,
						isUser: false,
						timestamp: new Date(),
						type: 'text',
					};

					// Add welcome suggestions as a separate message
					const welcomeSuggestionsMessage: Message = {
						id: 'welcome-suggestions',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
						data: { isWelcomeSuggestions: true },
					};

					setMessages([welcomeMessage, welcomeSuggestionsMessage]);
				} catch (error) {
					console.log(
						'[AI Assistant] Could not get context for welcome message:',
						error
					);

					// Fallback welcome message
					const totalExpenses = (transactions || []).reduce(
						(sum, t) => sum + (t.amount || 0),
						0
					);
					const welcomeMessage: Message = {
						id: 'welcome',
						text: `Hey! I'm your financial copilot. I'm here to help you build better money habits and reach your financial goals.

I can see you have ${
							(transactions || []).length
						} expenses totaling $${totalExpenses.toFixed(2)}. You've set up ${
							(budgets || []).length
						} budgets and are tracking ${(goals || []).length} goals.

What would you like to work on first?`,
						isUser: false,
						timestamp: new Date(),
						type: 'text',
					};

					// Add welcome suggestions as a separate message
					const welcomeSuggestionsMessage: Message = {
						id: 'welcome-suggestions',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
						data: { isWelcomeSuggestions: true },
					};

					setMessages([welcomeMessage, welcomeSuggestionsMessage]);
				}
			};

			initializeWelcomeMessage();
		}
	}, [transactions, budgets, goals, messages.length, aiService]);

	// Add suggested prompts and contextual insights when starting conversation
	useEffect(() => {
		console.log('🔍 [DEBUG] Messages length changed to:', messages.length);
		if (messages.length === 1) {
			console.log('🔍 [DEBUG] Adding suggested prompts and insights');

			const addContextualContent = async () => {
				try {
					// Get personalized insights
					const insights = await aiService.getPersonalizedInsights();
					const suggestions = await aiService.getContextualSuggestions();

					// Add engaging insights cards instead of plain text
					// You can set this to false to completely remove insights
					// Options: true (full insights), 'compact' (minimal), false (no insights)
					const showInsights = true; // Set to 'compact' for minimal version, false to disable completely

					if (showInsights && insights && insights.length > 0) {
						const insightsMessage: Message = {
							id: 'contextual-insights',
							text: '',
							isUser: false,
							timestamp: new Date(),
							type: 'insight', // New message type for insights
							data: {
								insights: insights.slice(0, 2),
								suggestions: suggestions?.slice(0, 2) || [],
							},
						};
						setMessages((prev) => [...prev, insightsMessage]);
					}

					// Add getting started guide for new users
					if (
						(!budgets || budgets.length === 0) &&
						(!goals || goals.length === 0)
					) {
						const gettingStartedMessage: Message = {
							id: 'getting-started',
							text: `🚀 **Getting Started Guide**

Since you're new to Brie, here's a quick 3-step plan to get you started:

**Step 1: Create Your First Budget**
• Tap the + button → "Add Budget"
• Start with Food or Transportation
• Set a realistic monthly limit

**Step 2: Set a Financial Goal**
• Tap the + button → "Add Goal"  
• Choose "Emergency Fund" as your first goal
• Aim for 3-6 months of expenses

**Step 3: Track Your First Expense**
• Tap the + button → "Add Expense"
• Log your next purchase
• Link it to your budget

Ready to get started? Tap any of the quick action buttons below!`,
							isUser: false,
							timestamp: new Date(),
							type: 'text',
						};
						setMessages((prev) => [...prev, gettingStartedMessage]);
					}

					// Add suggested prompts
					const promptsMessage: Message = {
						id: 'suggested-prompts',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
					};
					setMessages((prev) => [...prev, promptsMessage]);
				} catch (error) {
					console.log(
						'[AI Assistant] Could not get contextual content:',
						error
					);

					// Fallback: add getting started guide and suggested prompts
					if (
						(!budgets || budgets.length === 0) &&
						(!goals || goals.length === 0)
					) {
						const gettingStartedMessage: Message = {
							id: 'getting-started',
							text: `🚀 **Getting Started Guide**

Since you're new to Brie, here's a quick 3-step plan to get you started:

**Step 1: Create Your First Budget**
• Tap the + button → "Add Budget"
• Start with Food or Transportation
• Set a realistic monthly limit

**Step 2: Set a Financial Goal**
• Tap the + button → "Add Goal"  
• Choose "Emergency Fund" as your first goal
• Aim for 3-6 months of expenses

**Step 3: Track Your First Expense**
• Tap the + button → "Add Expense"
• Log your next purchase
• Link it to your budget

Ready to get started? Tap any of the quick action buttons below!`,
							isUser: false,
							timestamp: new Date(),
							type: 'text',
						};
						setMessages((prev) => [...prev, gettingStartedMessage]);
					}

					const promptsMessage: Message = {
						id: 'suggested-prompts',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
					};
					setMessages((prev) => [...prev, promptsMessage]);
				}
			};

			addContextualContent();
		}
	}, [messages.length, aiService, budgets.length, goals.length]);

	// Remove suggested prompts after user starts conversation
	useEffect(() => {
		if (messages.length > 2) {
			// User has sent a message, remove the suggested prompts
			setMessages((prev) => prev.filter((msg) => msg.type !== 'suggestion'));
		}
	}, [messages.length]);

	const handleSendMessage = useCallback(
		async (text: string) => {
			console.log('🔍 [DEBUG] handleSendMessage called with:', text);
			console.log('🔍 [DEBUG] Current messages count:', messages.length);

			if (!text.trim()) {
				console.log('❌ [DEBUG] Empty text, returning early');
				return;
			}

			const userMessage: Message = {
				id: Date.now().toString(),
				text: text.trim(),
				isUser: true,
				timestamp: new Date(),
				type: 'text',
			};

			console.log('🔍 [DEBUG] Created user message:', userMessage);
			setMessages((prev) => {
				console.log('🔍 [DEBUG] Previous messages:', prev.length);
				const newMessages = [...prev, userMessage];
				console.log(
					'🔍 [DEBUG] New messages array length:',
					newMessages.length
				);
				return newMessages;
			});

			// Scroll to bottom after user message
			setTimeout(() => {
				listRef.current?.scrollToEnd({ animated: true });
			}, 100);

			setInputText('');
			setIsTyping(true);

			// Scroll to bottom when typing starts
			setTimeout(() => {
				listRef.current?.scrollToEnd({ animated: true });
			}, 50);

			try {
				// Get AI response using the hybrid AI service
				console.log('🔍 [DEBUG] Getting AI response for:', text.trim());
				const aiResponse = await aiService.getResponse(text.trim());

				// Log the actual AI response for debugging
				console.log('🔍 [DEBUG] Raw AI response:', aiResponse?.response);

				// Update usage information for AI responses
				if (aiResponse.usage) {
					setCurrentUsage((prev) => ({
						...prev,
						currentTokens:
							prev.currentTokens + (aiResponse.usage!.estimatedTokens || 0),
						currentRequests: prev.currentRequests + 1,
						currentConversations: prev.currentConversations + 1,
					}));
				}

				// Check if the AI response actually answers the user's question
				const userQuestion = text.trim().toLowerCase();
				const aiResponseText = aiResponse?.response?.toLowerCase() || '';

				// Check if AI response contains relevant keywords from the user's question
				const questionKeywords = userQuestion
					.split(' ')
					.filter((word) => word.length > 3);
				const hasRelevantContent = questionKeywords.some(
					(keyword) =>
						aiResponseText.includes(keyword) ||
						aiResponseText.includes(keyword.replace('ing', '')) ||
						aiResponseText.includes(keyword.replace('ies', 'y'))
				);

				const shouldUseFallback =
					!hasRelevantContent && aiResponseText.length < 100;

				if (shouldUseFallback) {
					console.log(
						'🔍 [DEBUG] AI response not relevant enough, using fallback instead'
					);
					const fallbackResponse = getFallbackResponse(text.trim());

					const fallbackMessage: Message = {
						id: (Date.now() + 1).toString(),
						text: fallbackResponse,
						isUser: false,
						timestamp: new Date(),
						type: 'text',
					};

					setMessages((prev) => [...prev, fallbackMessage]);

					// Scroll to bottom after fallback message
					setTimeout(() => {
						listRef.current?.scrollToEnd({ animated: true });
					}, 100);
				} else {
					const aiMessage: Message = {
						id: (Date.now() + 1).toString(),
						text:
							aiResponse?.response ||
							"I apologize, but I couldn't generate a response at this time.",
						isUser: false,
						timestamp: new Date(),
						type: 'text',
					};

					console.log('🔍 [DEBUG] Created AI response:', aiMessage);
					setMessages((prev) => {
						console.log(
							'🔍 [DEBUG] Adding AI response, current count:',
							prev.length
						);
						return [...prev, aiMessage];
					});

					// Scroll to bottom after AI message
					setTimeout(() => {
						listRef.current?.scrollToEnd({ animated: true });
					}, 100);
				}

				// Show premium hint only when approaching limits (not after every response)
				if (currentUsage.subscriptionTier === 'free') {
					const tokenUsagePercent =
						(currentUsage.currentTokens / currentUsage.tokenLimit) * 100;
					const requestUsagePercent =
						(currentUsage.currentRequests / currentUsage.requestLimit) * 100;
					const conversationUsagePercent =
						(currentUsage.currentConversations /
							currentUsage.conversationLimit) *
						100;

					// Only show hint when any usage is above 70% (approaching limit) and haven't shown it yet
					if (
						(tokenUsagePercent > 70 ||
							requestUsagePercent > 70 ||
							conversationUsagePercent > 70) &&
						!showPremiumHint
					) {
						// Show subtle usage warning first
						setTimeout(() => {
							// Add a subtle usage warning message
							const usageWarningMessage: Message = {
								id: (Date.now() + 2).toString(),
								text: `💡 **Usage Notice**: You're approaching your free tier limits (${Math.max(
									tokenUsagePercent,
									requestUsagePercent,
									conversationUsagePercent
								).toFixed(0)}% used). Consider upgrading for unlimited access.`,
								isUser: false,
								timestamp: new Date(),
								type: 'text',
							};
							setMessages((prev) => [...prev, usageWarningMessage]);

							// Scroll to bottom after usage warning message
							setTimeout(() => {
								listRef.current?.scrollToEnd({ animated: true });
							}, 100);

							// Then show premium hint after a delay
							setTimeout(() => {
								setShowPremiumHint(true);
							}, 2000);
						}, 1000);
					}
				}
			} catch (error: any) {
				console.error('❌ [DEBUG] Error getting AI response:', error);
				console.log('🔍 [DEBUG] Error details:', {
					message: error.message,
					response: error.response?.status,
					data: error.response?.data,
				});

				// Check if it's a paywall/usage limit error
				if (
					error.response?.status === 429 &&
					error.response?.data?.upgradeRequired
				) {
					const errorData = error.response.data;
					setPaywallReason(errorData.reason || 'usage_limit_exceeded');
					setCurrentUsage({
						currentTokens: errorData.usage?.currentTokens || 0,
						tokenLimit: errorData.usage?.tokenLimit || 10000,
						currentRequests: errorData.usage?.currentRequests || 0,
						requestLimit: errorData.usage?.requestLimit || 50,
						currentConversations: errorData.usage?.currentConversations || 0,
						conversationLimit: errorData.usage?.conversationLimit || 20,
						subscriptionTier: errorData.usage?.subscriptionTier || 'free',
						estimatedCost: errorData.usage?.estimatedCost || 0,
					});
					setShowPaywall(true);
					return;
				}

				// Always use fallback response if AI service fails - no more generic messages!
				console.log('🔍 [DEBUG] Using fallback response for:', text.trim());
				const fallbackResponse = getFallbackResponse(text.trim());
				console.log('🔍 [DEBUG] Fallback response:', fallbackResponse);

				const fallbackMessage: Message = {
					id: (Date.now() + 1).toString(),
					text: fallbackResponse,
					isUser: false,
					timestamp: new Date(),
					type: 'text',
				};

				setMessages((prev) => [...prev, fallbackMessage]);

				// Scroll to bottom after error fallback message
				setTimeout(() => {
					listRef.current?.scrollToEnd({ animated: true });
				}, 100);
			} finally {
				setIsTyping(false);

				// Scroll to bottom when typing stops
				setTimeout(() => {
					listRef.current?.scrollToEnd({ animated: true });
				}, 50);
			}

			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		},
		[messages.length, aiService, currentUsage.subscriptionTier, showPremiumHint]
	);

	const onScroll = useCallback((event: any) => {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const isCloseToBottom =
			contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
		setShowFab(!isCloseToBottom);
	}, []);

	// Disable insights if not enabled
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	if (!aiInsightsEnabled) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<Header
					onOpenSettings={() => router.push('/(stack)/settings/aiInsights')}
					currentUsage={currentUsage}
				/>
				<View style={styles.centerState}>
					<Ionicons name="sparkles" size={48} color="#9ca3af" />
					<Text style={styles.centerTitle}>Enable AI Insights</Text>
					<Text style={styles.centerBody}>
						Get personalized financial insights and recommendations from your AI
						copilot
					</Text>
					<TouchableOpacity
						onPress={() => router.push('/(stack)/settings/aiInsights')}
						style={styles.primaryBtn}
					>
						<Text style={styles.primaryBtnText}>Enable insights</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const handleShowPremium = () => {
		setPaywallReason('premium_features');
		setShowPaywall(true);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<Header
				onOpenSettings={() => router.push('/(stack)/settings/aiInsights')}
				currentUsage={currentUsage}
			/>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				{/* ——— Chat */}
				<FlatList
					ref={listRef}
					data={messages}
					keyExtractor={(m) => m.id}
					renderItem={({ item }) => (
						<MessageBubble
							m={item}
							onPickPrompt={handleSendMessage}
							onShowPremium={handleShowPremium}
							showPremiumHint={showPremiumHint}
						/>
					)}
					contentContainerStyle={styles.listContent}
					style={styles.list}
					onScroll={onScroll}
					scrollEventThrottle={16}
				/>
				{isTyping && <TypingDots />}

				{/* ——— Scroll to bottom FAB */}
				<ScrollToBottomFab
					visible={showFab}
					onPress={() => listRef.current?.scrollToEnd({ animated: true })}
				/>

				{/* ——— Input */}
				<View style={styles.inputBar}>
					<TextInput
						style={styles.input}
						value={inputText}
						onChangeText={setInputText}
						placeholder="Ask about your finances..."
						placeholderTextColor="#9aa3af"
						maxLength={500}
						multiline={true}
						textAlignVertical="top"
					/>
					<TouchableOpacity
						disabled={!inputText.trim()}
						onPress={() => handleSendMessage(inputText)}
						style={[
							styles.sendBtn,
							!inputText.trim() && styles.sendBtnDisabled,
						]}
						activeOpacity={0.9}
					>
						<Ionicons
							name="send"
							size={18}
							color={inputText.trim() ? '#fff' : '#cbd5e1'}
						/>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>

			{/* Paywall Modal */}
			<PaywallModal
				visible={showPaywall}
				onClose={() => setShowPaywall(false)}
				onUpgrade={async (tier: string) => {
					try {
						// Call the upgrade API
						await aiService.upgradeSubscription(tier);
						Alert.alert('Success', `Successfully upgraded to ${tier} tier!`);
						setShowPaywall(false);
					} catch (error) {
						console.error('Upgrade failed:', error);
						Alert.alert(
							'Upgrade Failed',
							'There was an error processing your upgrade. Please try again.'
						);
					}
				}}
				currentUsage={currentUsage}
				reason={paywallReason}
			/>
		</SafeAreaView>
	);
}

// ————————————————————————————————————————————————————————————
const styles = StyleSheet.create({
	// Theme
	safeArea: { flex: 1, backgroundColor: '#ffffff' },
	container: { flex: 1, backgroundColor: '#ffffff' },

	// Header
	headerWrap: {
		position: 'relative',
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	brandText: {
		color: '#1e293b',
		fontWeight: '600',
		fontSize: 20,
		letterSpacing: -0.2,
	},
	settingsButton: {
		padding: 6,
		borderRadius: 16,
		backgroundColor: 'transparent',
	},

	// Subtle usage indicator
	usageIndicator: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fef3c7',
		borderBottomWidth: 1,
		borderBottomColor: '#fde68a',
		paddingVertical: 4,
		paddingHorizontal: 10,
		zIndex: 1,
		alignItems: 'center',
	},
	usageBar: {
		width: '80%',
		height: 6,
		backgroundColor: '#e2e8f0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	usageFill: {
		height: '100%',
		borderRadius: 3,
	},
	usageText: {
		fontSize: 12,
		color: '#92400e',
		fontWeight: '600',
		marginTop: 4,
	},

	// Suggested Prompts (now part of chat messages)
	promptsTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 16,
		textAlign: 'center',
	},
	promptsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		justifyContent: 'space-between',
	},
	promptCard: {
		width: '48%',
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	promptIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#eff6ff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	promptText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#374151',
		lineHeight: 18,
	},

	// FAB
	fabContainer: {
		position: 'absolute',
		right: 18,
		bottom: 160,
		zIndex: 1000,
	},
	fab: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2563eb',
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 8,
		borderWidth: 2,
		borderColor: '#fff',
	},

	// List / messages
	list: { flex: 1 },
	listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
	msgWrap: {
		marginBottom: 12,
		maxWidth: '88%',
		borderRadius: 18,
		paddingVertical: 12,
		paddingHorizontal: 16,
		overflow: 'hidden', // Ensure content doesn't overflow
	},
	msgUser: {
		alignSelf: 'flex-end',
		backgroundColor: '#2a89f7',
		borderBottomRightRadius: 8,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	msgAI: {
		alignSelf: 'flex-start',
		backgroundColor: '#f8fafc',
		borderColor: '#e2e8f0',
		borderWidth: 1,
		maxWidth: '95%', // Allow AI messages to be wider for better insight visibility
	},
	msgText: { fontSize: 14, lineHeight: 24, fontWeight: '500' },
	msgTextUser: { color: '#fff', fontWeight: '600' },
	msgTextAI: { color: '#0f172a', fontWeight: '500' },
	msgTime: {
		fontSize: 11,

		alignSelf: 'flex-end',
		fontWeight: '500',
	},
	msgTimeUser: {
		fontSize: 11,
		color: '#ffffff',

		alignSelf: 'flex-end',
		fontWeight: '500',
	},
	msgTimeAI: {
		fontSize: 11,
		color: '#94a3b8',

		alignSelf: 'flex-start',
		fontWeight: '500',
	},

	typingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 6,
	},
	dot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		backgroundColor: '#9ca3af',
		marginRight: 6,
	},
	typingText: {
		color: '#475569',
		marginLeft: 4,
		fontSize: 13,
		fontStyle: 'italic',
		fontWeight: '500',
	},

	// Input bar
	inputBar: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: 16,
		paddingHorizontal: 20,
		paddingBottom: 20,
		backgroundColor: '#fff',
		borderTopColor: '#eef2f7',
		borderTopWidth: StyleSheet.hairlineWidth,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: -2 },
		elevation: 3,
	},
	input: {
		flex: 1,
		backgroundColor: '#f8fafc',
		borderWidth: 1.5,
		borderColor: '#e2e8f0',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		minHeight: 44,
		maxHeight: 120,
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 2,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	sendBtn: {
		marginLeft: 10,
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2563eb',
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},
	sendBtnDisabled: { backgroundColor: '#e5e7eb' },

	// Empty/disabled states
	centerState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		backgroundColor: '#fff',
		gap: 12,
	},
	centerTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#0f172a',
		textAlign: 'center',
	},
	centerBody: { fontSize: 14, color: '#475569', textAlign: 'center' },
	primaryBtn: {
		marginTop: 8,
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	primaryBtnText: { color: '#fff', fontWeight: '700' },

	// Premium hint styles - more subtle
	premiumHint: {
		marginTop: 8,
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		overflow: 'hidden',
		opacity: 0.9,
	},
	premiumHintContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		gap: 6,
	},
	premiumHintText: {
		flex: 1,
		fontSize: 12,
		color: '#64748b',
		fontWeight: '500',
		fontStyle: 'italic',
	},

	// Insights Card styles
	insightsSection: {
		marginBottom: 12,
		width: '100%', // Ensure full width within the message container
		alignSelf: 'stretch', // Allow insights to use full available width
	},
	insightsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	insightsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	insightsList: {
		gap: 10, // Increased gap between insight cards for better separation
	},
	insightCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 12, // Increased padding for better spacing
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
		minHeight: 60, // Ensure minimum height for content visibility
	},
	insightIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#f8fafc',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		flexShrink: 0,
	},
	insightContent: {
		flex: 1,
		minWidth: 0, // Allow text to wrap properly
		paddingRight: 4, // Add some right padding for better text spacing
	},
	insightTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 2,
	},
	insightMessage: {
		fontSize: 12,
		color: '#64748b',
		lineHeight: 18, // Increased line height for better readability
		marginBottom: 6,
		flexWrap: 'wrap', // Ensure text wraps properly
	},
	priorityBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#fef2f2',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#dc2626',
	},

	// Suggestions Section styles
	suggestionsSection: {
		marginTop: 12,
	},
	suggestionsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	suggestionsList: {
		gap: 8,
	},
	suggestionCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	suggestionIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#f8fafc',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		flexShrink: 0,
	},
	suggestionContent: {
		flex: 1,
		minWidth: 0, // Allow text to wrap properly
	},
	suggestionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 2,
	},
	suggestionDescription: {
		fontSize: 12,
		color: '#64748b',
		lineHeight: 16,
		marginBottom: 6,
		flexWrap: 'wrap', // Ensure text wraps properly
	},
	suggestionBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#f0f9ff',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	suggestionBadgeText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#0369a1',
		textTransform: 'capitalize',
	},
});
