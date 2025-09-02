// app/(tabs)/insights.tsx — Brie AI (clean, focused assistant)
// Enhanced AI system with unified interface and intelligent context switching

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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useProfile } from '../../../src/context/profileContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useProfileContext } from '../../../src/hooks/useProfileContext';
import ProfileUpdateService from '../../../src/services/feature/profileUpdateService';
import TokenUsageService from '../../../src/services/feature/tokenUsageService';
import { EnhancedTieredAIService } from '../../../src/services/feature/enhancedTieredAIService';
import { logChat } from '../../../src/services/feature/analyticsService';
import {
	emit,
	startMessage,
	getSessionId,
	getMessageId,
} from '../../../src/services/feature/analytics/emit';
import { dualRunIfNeeded } from '../../../src/services/feature/analytics/shadow';
import {
	handleUserMessage,
	ChatContext,
} from '../../../src/services/feature/chatController';
import PaywallModal from './components/PaywallModal';
import MLInsightsPanel from './components/MLInsightsPanel';
import { useMLServices, MLInsight } from '../../../src/hooks/useMLServices';
import Header from './components/Header';
import MessageBubble from './components/MessageBubble';
import TypingDots from './components/TypingDots';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import {
	InterfaceMode,
	Message,
} from '../../../src/components/assistant/types';
import { FallbackCard } from '../../../src/components/FallbackCard';
import { InsightChipsRow } from '../../../src/components/InsightChipsRow';
import { InsightCard } from '../../../src/components/InsightChip';
import {
	createInitialModeState,
	transition,
	ModeState,
	ModeTransition,
} from '../../../src/components/assistant/modeMachine';
import {
	composeBudgetStatus,
	composeSpendingInsight,
	composeGoalProgress,
	composeGenericResponse,
	ChatResponse,
} from '../../../src/components/assistant/responseSchema';
import {
	enhancedIntentMapper,
	Intent,
	RouteDecision,
} from '../../../src/components/assistant/enhancedIntentMapper';
import {
	helpfulFallback,
	extractFinancialContext,
} from '../../../src/components/assistant/helpfulFallbacks';
import { NarrationService } from '../../../src/services/feature/narrationService';
import {
	SkeletonContainer,
	MessageSkeleton,
	InsightsPanelSkeleton,
} from '../../../src/components/SkeletonLoader';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../src/utils/accessibility';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ————————————————————————————————————————————————————————————
// Types
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
			color: '#3b82f6', // Blue for budgets
		},
		{
			id: '2',
			text: 'Get help setting and achieving financial goals',
			color: '#3b82f6', // Blue for goals
		},
		{
			id: '3',
			text: 'Learn about saving strategies and spending patterns',
			color: '#3b82f6', // Blue for spending
		},
		{
			id: '4',
			text: 'Get personalized financial advice and tips',
			color: '#3b82f6', // Blue for advice
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
						style={[
							styles.promptCard,
							{ borderLeftWidth: 4, borderColor: suggestion.color },
						]}
						activeOpacity={0.7}
					>
						<Text style={[styles.promptText, { color: suggestion.color }]}>
							{suggestion.text}
						</Text>
					</TouchableOpacity>
				))}
			</View>
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
				return '#3b82f6';
			case 'info':
				return '#3b82f6';
			case 'suggestion':
				return '#3b82f6';
			default:
				return '#3b82f6';
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
				return '#3b82f6';
			case 'tip':
				return '#3b82f6';
			default:
				return '#3b82f6';
		}
	};

	return (
		<>
			{/* Insights Section - Independent of message bubble */}
			{insights.length > 0 && (
				<View style={styles.insightsSection}>
					<View style={styles.insightsHeader}>
						<Ionicons name="sparkles" size={16} color="#3b82f6" />
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
							<Ionicons name="flag" size={16} color="#3b82f6" />
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

// New component for smart suggestions based on current mode
const SmartSuggestions = ({
	onPick,
	mode,
}: {
	onPick: (prompt: string) => void;
	mode: InterfaceMode;
}) => {
	const getSuggestions = (): string[] => {
		switch (mode) {
			case 'INSIGHTS':
				return [
					'Analyze my spending trends',
					'Show me budget performance',
					'What are my financial strengths?',
					'Identify spending opportunities',
				];
			case 'ACTIONS':
				return [
					'Create a new budget',
					'Set up a savings goal',
					'Track my expenses',
					'Optimize my spending',
				];
			case 'ANALYTICS':
				return [
					'Compare this month to last',
					'Show me detailed breakdown',
					'Predict future spending',
					'Analyze goal progress',
				];
			default:
				return [
					'How am I doing with my budget?',
					'What should I focus on financially?',
					'Show me my spending patterns',
					'Help me save more money',
				];
		}
	};

	const suggestions = getSuggestions();

	return (
		<View style={[styles.msgWrap, styles.msgAI]}>
			<Text style={styles.promptsTitle}>
				{`💡 Smart suggestions for ${mode} mode:`}
			</Text>
			<View style={styles.promptsGrid}>
				{suggestions.map((text, index) => (
					<TouchableOpacity
						key={index}
						onPress={() => {
							console.log('🔍 [DEBUG] Smart suggestion tapped:', text);
							onPick(text);
						}}
						style={[
							styles.promptCard,
							{ borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
						]}
						activeOpacity={0.7}
					>
						<Text style={[styles.promptText, { color: '#3b82f6' }]}>
							{text}
						</Text>
					</TouchableOpacity>
				))}
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
	const { profileContext, hasRecentUpdates, refreshContext } =
		useProfileContext();

	// Token usage tracking
	const tokenService = TokenUsageService.getInstance();

	// ML Services integration
	const {
		status: mlStatus,
		isLoading: mlLoading,
		error: mlError,
		getInsights,
		getMetrics,
		clearCache,
		isReady: mlReady,
		hasError: mlHasError,
		reset: mlReset,
	} = useMLServices();

	const [messages, setMessages] = useState<Message[]>([]);
	const [inputText, setInputText] = useState('');
	const [isTyping, setIsTyping] = useState(false);

	// Unified interface state with state machine
	const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>('CHAT');
	const [modeState, setModeState] = useState<ModeState>(
		createInitialModeState()
	);
	const [currentInsights, setCurrentInsights] = useState<MLInsight[]>([]);
	const [showInsightsPanel, setShowInsightsPanel] = useState(false);
	const [showActionsPanel, setShowActionsPanel] = useState(false);

	// Enhanced intent system state
	const [currentRouteDecision, setCurrentRouteDecision] =
		useState<RouteDecision | null>(null);

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

	// Smart context detection - automatically determines the best interface mode
	const detectInterfaceMode = useCallback(
		(userInput: string): InterfaceMode => {
			const input = userInput.toLowerCase();

			// Insights and analysis requests
			if (
				input.includes('how am i doing') ||
				input.includes('show me') ||
				input.includes('analyze') ||
				input.includes('insights') ||
				input.includes('patterns') ||
				input.includes('trends') ||
				input.includes('summary') ||
				input.includes('overview')
			) {
				return 'INSIGHTS';
			}

			// Action and help requests
			if (
				input.includes('help me') ||
				input.includes('what should i do') ||
				input.includes('how can i') ||
				input.includes('create') ||
				input.includes('set up') ||
				input.includes('adjust') ||
				input.includes('fix') ||
				input.includes('optimize')
			) {
				return 'ACTIONS';
			}

			// Analytics and detailed analysis
			if (
				input.includes('detailed') ||
				input.includes('breakdown') ||
				input.includes('compare') ||
				input.includes('forecast') ||
				input.includes('prediction') ||
				input.includes('deep dive')
			) {
				return 'ANALYTICS';
			}

			// Default to chat for general questions
			return 'CHAT';
		},
		[]
	);

	// Handle interface mode changes with state machine
	const switchToMode = useCallback(
		(mode: InterfaceMode, data?: any) => {
			// Use state machine for mode transitions
			const event = {
				type: 'FORCE_MODE' as const,
				mode,
				reason: 'user_request',
			};
			const { newState, transition: modeTransition } = transition(
				modeState,
				event
			);

			if (modeTransition) {
				setModeState(newState);
				setInterfaceMode(mode);

				// Log mode change for analytics
				console.log('🔍 [ModeMachine] Mode changed:', {
					from: modeTransition.from,
					to: modeTransition.to,
					reason: modeTransition.reason,
					timestamp: new Date().toISOString(),
				});
			}

			// Handle mode-specific actions
			switch (mode) {
				case 'INSIGHTS':
					setShowInsightsPanel(true);
					setShowActionsPanel(false);
					if (data?.insights) {
						setCurrentInsights(data.insights);
					}
					break;
				case 'ACTIONS':
					setShowActionsPanel(true);
					setShowInsightsPanel(false);
					break;
				case 'ANALYTICS':
					setShowInsightsPanel(true);
					setShowActionsPanel(false);
					break;
				default:
					setShowInsightsPanel(false);
					setShowActionsPanel(false);
			}
		},
		[modeState]
	);

	// Generate ML insights for the current context
	const generateMLInsights = useCallback(
		async (context: string) => {
			if (!mlReady) return;

			try {
				const insights = await getInsights(context, 'medium');
				setCurrentInsights(insights);
			} catch (error) {
				console.warn('[AI Assistant] Failed to generate ML insights:', error);
				// Fall back to basic insights
				setCurrentInsights([
					{
						type: 'info',
						title: 'Financial Overview',
						message:
							'Your financial data is ready for analysis. Ask me specific questions to get personalized insights.',
						confidence: 0.7,
						actionable: false,
					},
				]);
			}
		},
		[mlReady, getInsights]
	);

	// Smart suggestions based on current mode, context, and user's financial situation
	const getSmartSuggestions = useCallback((): string[] => {
		// Base suggestions that are always relevant
		const baseSuggestions = [
			'How am I doing with my budget?',
			'What should I focus on financially?',
			'Show me my spending patterns',
			'Help me save more money',
		];

		// Profile-aware suggestions based on recent updates
		if (profileContext && hasRecentUpdates) {
			const profileSuggestions = [];

			switch (profileContext.lastAction) {
				case 'optimize_income':
					profileSuggestions.push(
						'💼 How can I maximize my new income?',
						'📈 What opportunities should I explore?'
					);
					break;
				case 'reduce_expenses':
					profileSuggestions.push(
						'💰 How much can I save with these changes?',
						'📊 Show me the impact on my budget'
					);
					break;
				case 'set_savings_goal':
					profileSuggestions.push(
						'🎯 Help me track my savings progress',
						'📈 What strategies will accelerate my savings?'
					);
					break;
				case 'create_budget':
					profileSuggestions.push(
						'📊 How should I allocate my new budget?',
						'💡 Give me budget optimization tips'
					);
					break;
				case 'debt_strategy':
					profileSuggestions.push(
						'🚀 Help me create a debt payoff plan',
						'📉 Show me my debt reduction timeline'
					);
					break;
			}

			if (profileSuggestions.length > 0) {
				baseSuggestions.unshift(...profileSuggestions);
			}

			// Add profile-specific insights
			const profileService = ProfileUpdateService.getInstance();
			const insights = profileService.getProfileInsights(profileContext);
			const suggestions = profileService.getSuggestedActions(profileContext);

			if (insights.length > 0) {
				profileSuggestions.push(`💡 ${insights[0]}`);
			}

			if (suggestions.length > 0) {
				const highPrioritySuggestion = suggestions.find(
					(s) => s.priority === 'high'
				);
				if (highPrioritySuggestion) {
					profileSuggestions.push(`🚀 ${highPrioritySuggestion.label}`);
				}
			}
		}

		// Context-aware suggestions based on user's current financial state
		const contextualSuggestions = [];

		// Budget-related suggestions
		if (budgets && budgets.length > 0) {
			const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
			const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
			const utilization =
				totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

			if (utilization > 80) {
				contextualSuggestions.push(
					'⚠️ My budget is almost gone - help me stretch it!'
				);
			} else if (utilization > 50) {
				contextualSuggestions.push(
					'📊 How can I optimize my remaining budget?'
				);
			} else {
				contextualSuggestions.push(
					'💰 I have budget left - what should I do with it?'
				);
			}
		} else {
			contextualSuggestions.push('🎯 Help me create my first budget');
		}

		// Goal-related suggestions
		if (goals && goals.length > 0) {
			const avgProgress =
				goals.reduce((sum, g) => sum + (g.percent || 0), 0) / goals.length;
			if (avgProgress < 30) {
				contextualSuggestions.push(
					"🚀 I'm behind on my goals - give me a boost!"
				);
			} else if (avgProgress < 70) {
				contextualSuggestions.push('📈 How can I accelerate my goal progress?');
			} else {
				contextualSuggestions.push("🎉 I'm close to my goals - what's next?");
			}
		} else {
			contextualSuggestions.push('🎯 Help me set my first financial goal');
		}

		// Transaction-related suggestions
		if (transactions && transactions.length > 0) {
			if (transactions.length < 10) {
				contextualSuggestions.push('📝 Help me track more expenses');
			} else {
				contextualSuggestions.push('📊 Analyze my spending habits');
			}
		} else {
			contextualSuggestions.push('📱 Help me start tracking expenses');
		}

		// Mode-specific suggestions
		let modeSuggestions: string[] = [];
		switch (interfaceMode) {
			case 'INSIGHTS':
				modeSuggestions = [
					'Analyze my spending trends',
					'Show me budget performance',
					'What are my financial strengths?',
					'Identify spending opportunities',
				];
				break;
			case 'ACTIONS':
				modeSuggestions = [
					'Create a new budget',
					'Set up a savings goal',
					'Track my expenses',
					'Optimize my spending',
				];
				break;
			case 'ANALYTICS':
				modeSuggestions = [
					'Compare this month to last',
					'Show me detailed breakdown',
					'Predict future spending',
					'Analyze goal progress',
				];
				break;
			default:
				modeSuggestions = baseSuggestions;
		}

		// Combine contextual and mode-specific suggestions, prioritizing contextual ones
		return [...contextualSuggestions, ...modeSuggestions].slice(0, 6);
	}, [interfaceMode, budgets, goals, transactions]);

	// Initialize AI service
	const aiService = useMemo(
		() =>
			new EnhancedTieredAIService({
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
			}),
		[
			budgetsWithUtilization,
			goalsWithCompatibility,
			transactionsWithCompatibility,
			profile,
		]
	);

	// Initialize narration service for grounded, fact-based responses
	const narrationService = useMemo(
		() => new NarrationService(aiService, tokenService),
		[aiService, tokenService]
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

	// Function to provide helpful fallback responses with data-first guardrails
	const getFallbackResponse = (userQuestion: string): ChatResponse => {
		try {
			// Use the tiered AI service for fallback responses first
			const response = aiService.getFallbackResponse(userQuestion);
			return {
				message: response.response,
				sources: [{ kind: 'gpt' }],
				cost: { model: 'mini', estTokens: response.response.length / 4 },
			};
		} catch (error) {
			console.log(
				'[FallbackResponse] Error using tiered AI, using helpful fallback:',
				error
			);

			// Extract financial context from available data
			const financialContext = extractFinancialContext(
				budgets || [],
				goals || [],
				transactions || [],
				profile || {}
			);

			// Use the new helpful fallback system
			return helpfulFallback(userQuestion, financialContext);
		}
	};

	// Enhanced fallback handling with FallbackCard
	const handleFallbackResponse = useCallback(
		(
			userQuestion: string,
			reason: 'missing_data' | 'ambiguous' | 'guard_failed'
		) => {
			// Create a mock FactPack for fallback (in real implementation, this would come from server)
			const mockFactPack = {
				time_window: {
					start: new Date().toISOString().split('T')[0],
					end: new Date().toISOString().split('T')[0],
					tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
				},
				recurring: [],
				budgets: budgets || [],
				balances: [],
				goals: goals || [],
				transactions: transactions || [],
			};

			// Build fallback payload (this would normally come from server)
			const fallbackPayload = {
				status:
					reason === 'missing_data'
						? 'I can partially help now and finish once I have a bit more info.'
						: reason === 'ambiguous'
						? 'I can answer precisely after we narrow this down.'
						: "I paused because something didn't look safe to show.",
				tinyFact:
					budgets && budgets.length > 0
						? `You're at $${budgets[0].spent || 0}/$${
								budgets[0].amount || 0
						  } for ${budgets[0].name || 'your budget'}.`
						: undefined,
				actions: [
					{ label: 'Connect checking', action: 'CONNECT_ACCOUNT' as const },
					{
						label: 'Pick a time window',
						action: 'PICK_TIME_WINDOW' as const,
						payload: mockFactPack.time_window,
					},
					{ label: 'Open Budgets', action: 'OPEN_BUDGET' as const },
				],
				evidence: { factIds: [] },
				timeWindow: mockFactPack.time_window,
			};

			// Create fallback message
			const fallbackMessage: Message = {
				id: (Date.now() + 1).toString(),
				text: fallbackPayload.status,
				isUser: false,
				timestamp: new Date(),
				type: 'structured',
				structuredResponse: {
					message: fallbackPayload.status,
					details: fallbackPayload.tinyFact,
					actions: fallbackPayload.actions.map((a) => ({
						label: a.label,
						action:
							a.action === 'CONNECT_ACCOUNT'
								? 'OPEN_BUDGETS'
								: a.action === 'OPEN_BUDGET'
								? 'OPEN_BUDGETS'
								: a.action === 'PICK_TIME_WINDOW'
								? 'OPEN_BUDGETS'
								: 'OPEN_BUDGETS',
						params: a.payload,
					})),
					sources: [{ kind: 'cache' }],
					cost: { model: 'mini', estTokens: 0 },
					fallback: fallbackPayload,
				},
			};

			setMessages((prev) => [...prev, fallbackMessage]);

			// Log fallback for analytics
			console.log('🔍 [Fallback] Fallback shown:', {
				reason,
				userQuestion: userQuestion.substring(0, 100),
				timestamp: new Date().toISOString(),
			});
		},
		[budgets, goals, transactions]
	);

	// Handle structured response actions
	const handleStructuredAction = useCallback(
		(action: string, params?: any) => {
			console.log('🔍 [DEBUG] Handling structured action:', action, params);

			switch (action) {
				case 'OPEN_BUDGETS':
					router.push('/(tabs)/budgets/' as any);
					break;
				case 'ADJUST_LIMIT':
					if (params?.cat) {
						// Navigate to budget details with category focus
						router.push(
							`/(tabs)/budgets/editBudget?category=${params.cat}` as any
						);
					} else {
						router.push('/(tabs)/budgets/' as any);
					}
					break;
				case 'CREATE_RULE':
					router.push('/(tabs)/recurringExpenses/' as any);
					break;
				case 'VIEW_RECURRING':
					router.push('/(tabs)/recurringExpenses/' as any);
					break;
				default:
					console.log('🔍 [DEBUG] Unknown action:', action);
			}
		},
		[router]
	);

	// Function to compose structured responses using narration service
	const composeStructuredResponse = useCallback(
		async (userQuestion: string): Promise<ChatResponse> => {
			try {
				// Prepare facts from app data
				const facts = narrationService.prepareFacts(
					budgets || [],
					goals || [],
					transactions || [],
					profile,
					currentInsights
				);

				// Prepare user profile
				const userProfile = narrationService.prepareUserProfile(
					goals || [],
					profile?.preferences
				);

				// Generate narrated response with grounded facts
				const response = await narrationService.narrate(
					userQuestion,
					facts,
					userProfile,
					{
						useMiniModel: true, // Use mini model for cost efficiency
						enableCritic: true, // Enable fact-checking critic pass
						maxTokens: 150,
						temperature: 0.3,
					}
				);

				return response;
			} catch (error) {
				console.error('Narration service error:', error);

				// Fallback to deterministic template based on question type
				const question = userQuestion.toLowerCase();
				let fallbackType: 'budget' | 'goal' | 'spending' | 'general' =
					'general';

				if (
					question.includes('budget') ||
					question.includes('spending') ||
					question.includes('limit')
				) {
					fallbackType = 'budget';
				} else if (
					question.includes('goal') ||
					question.includes('save') ||
					question.includes('progress')
				) {
					fallbackType = 'goal';
				} else if (
					question.includes('spend') ||
					question.includes('expense') ||
					question.includes('pattern')
				) {
					fallbackType = 'spending';
				}

				// Use fallback template from the prompt builder
				const {
					fallbackTemplate,
				} = require('../../../src/components/assistant/promptBuilder');
				const facts = narrationService.prepareFacts(
					budgets || [],
					goals || [],
					transactions || [],
					profile,
					currentInsights
				);

				return fallbackTemplate(facts, fallbackType);
			}
		},
		[budgets, goals, transactions, profile, currentInsights, narrationService]
	);

	// Initialize with welcome message
	useEffect(() => {
		// Start tracking new conversation (optional - don't let failures break the app)
		try {
			tokenService.startConversation();

			// Run diagnostic to check AsyncStorage
			tokenService.checkAsyncStorageAvailability().then((isAvailable) => {
				console.log('🔍 [DEBUG] AsyncStorage available:', isAvailable);
			});
		} catch (error) {
			console.warn('Failed to start token tracking conversation:', error);
		}

		if (messages.length === 0) {
			const initializeWelcomeMessage = async () => {
				try {
					// Get personalized welcome message using AI service
					const context = await aiService.getConversationContext();
					const { financial } = context;

					let welcomeText = `Hey! I'm your financial copilot. I'm here to help you build better money habits and reach your financial goals.\n\nWhat would you like to work on first?`;

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

					// Add smart suggestions based on current context
					const smartSuggestionsMessage: Message = {
						id: 'smart-suggestions',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
						data: { isSmartSuggestions: true, mode: interfaceMode },
					};

					setMessages([
						welcomeMessage,
						welcomeSuggestionsMessage,
						smartSuggestionsMessage,
					]);
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
						text: `Hey! I'm your financial copilot. I'm here to help you build better money habits and reach your financial goals.\n\nWhat would you like to work on first?`,
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

					// Add smart suggestions based on current context
					const smartSuggestionsMessage: Message = {
						id: 'smart-suggestions',
						text: '',
						isUser: false,
						timestamp: new Date(),
						type: 'suggestion',
						data: { isSmartSuggestions: true, mode: interfaceMode },
					};

					setMessages([
						welcomeMessage,
						welcomeSuggestionsMessage,
						smartSuggestionsMessage,
					]);
				}
			};

			initializeWelcomeMessage();
		}
	}, [transactions, budgets, goals, messages.length, aiService, interfaceMode]);

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
					const showInsights = false; // Set to 'compact' for minimal version, false to disable completely

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

					// Add suggested prompts as fallback
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

	// Cleanup effect to end conversation tracking
	useEffect(() => {
		return () => {
			// End conversation and get summary when component unmounts (optional)
			try {
				const summary = tokenService.endConversation();
				console.log('🔍 [DEBUG] Conversation ended:', summary);
			} catch (error) {
				console.warn('Failed to end token tracking conversation:', error);
			}
		};
	}, []);

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
			console.log('🔍 [DEBUG] Message timestamp:', new Date().toISOString());

			if (!text.trim()) {
				console.log('❌ [DEBUG] Empty text, returning early');
				return;
			}

			// Start analytics tracking for this message
			const messageId = startMessage();

			// Track user message tokens (optional - don't let failures break the app)
			try {
				await tokenService.trackUserMessage(text.trim());
			} catch (error) {
				console.warn(
					'Token tracking failed, continuing without tracking:',
					error
				);
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

			// Smart context detection - automatically determine the best interface mode
			const detectedMode = detectInterfaceMode(text.trim());
			console.log('🔍 [DEBUG] Detected interface mode:', detectedMode);

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
				// Use the new chat controller for unified end-to-end flow
				console.log('🔍 [DEBUG] Using chat controller for:', text.trim());

				// Prepare chat context
				const chatContext: ChatContext = {
					userProfile: profile
						? {
								monthlyIncome: profile.monthlyIncome,
								financialGoal: profile.financialGoal,
								riskProfile: profile.riskProfile?.toString(),
						  }
						: undefined,
					budgets: budgets || [],
					goals: goals || [],
					transactions: transactions || [],
					currentUsage: {
						subscriptionTier: currentUsage.subscriptionTier,
						currentTokens: currentUsage.currentTokens,
						tokenLimit: currentUsage.tokenLimit,
					},
				};

				// Enhanced intent detection and routing
				const routeDecision = await enhancedIntentMapper.makeRouteDecision(
					text.trim(),
					chatContext
				);
				setCurrentRouteDecision(routeDecision);

				// Emit route decision analytics
				await emit({
					type: 'ai.route_decided',
					intent: routeDecision.primary.intent,
					p: routeDecision.primary.calibratedP,
					route:
						routeDecision.routeType === 'grounded'
							? 'grounded'
							: routeDecision.routeType === 'llm'
							? 'mini'
							: 'fallback',
					calibrated: routeDecision.primary.calibratedP > 0.5,
					token_budget: 200, // Default token budget
					session_id: getSessionId(),
					message_id: messageId,
				} as any);

				// Auto-clear route decision after 10 seconds to prevent blocking the chat
				setTimeout(() => {
					setCurrentRouteDecision(null);
				}, 10000);

				// Get response using chat controller (always proceed)
				const chatResponse = await handleUserMessage(text.trim(), chatContext);

				// Create AI message from chat response
				const aiMessage: Message = {
					id: (Date.now() + 1).toString(),
					text: chatResponse.message,
					isUser: false,
					timestamp: new Date(),
					type: 'structured',
					structuredResponse: chatResponse,
					groundingInfo: {
						wasGrounded: true, // Chat controller handles grounding
						confidence: 0.8,
						modelUsed: 'chat_controller',
					},
				};

				console.log('🔍 [DEBUG] Chat controller response:', {
					messageLength: chatResponse.message.length,
					hasActions: !!chatResponse.actions?.length,
					hasCards: !!chatResponse.cards?.length,
					sources: chatResponse.sources,
				});

				setMessages((prev) => [...prev, aiMessage]);
				setIsTyping(false);

				// Scroll to bottom after AI message
				setTimeout(() => {
					listRef.current?.scrollToEnd({ animated: true });
				}, 100);

				return; // Skip the old AI response flow
			} catch (error) {
				console.error(
					'Chat controller failed, falling back to old flow:',
					error
				);
				// Continue with old flow as fallback
			}

			// Fallback to old AI flow if chat controller fails
			try {
				console.log('🔍 [DEBUG] Falling back to old AI flow');

				// Emit fallback analytics
				await emit({
					type: 'ai.fallback_used',
					reason: 'chat_controller_failed',
					session_id: getSessionId(),
					message_id: messageId,
				} as any);

				// Get AI response using the tiered AI service as fallback
				const aiResponse = await aiService.getHybridOptimizedResponse(
					text.trim(),
					text.trim()
				);

				// Track AI response tokens (optional - don't let failures break the app)
				if (aiResponse.response) {
					try {
						await tokenService.trackAIResponse(
							aiResponse.response,
							aiResponse.modelUsed || 'gpt-3.5-turbo'
						);
					} catch (error) {
						console.warn(
							'AI response token tracking failed, continuing without tracking:',
							error
						);
					}
				}

				// Update usage information for AI responses
				if (aiResponse.usage) {
					setCurrentUsage((prev) => ({
						...prev,
						currentTokens:
							prev.currentTokens + (aiResponse.usage?.estimatedTokens || 0),
						currentRequests: prev.currentRequests + 1,
						currentConversations: prev.currentRequests + 1,
					}));
				}

				// Check if the AI response actually answers the user's question
				const userQuestion = text.trim().toLowerCase();
				const aiResponseText = aiResponse?.response?.toLowerCase() || '';

				console.log('🔍 [DEBUG] Relevance check:', {
					userQuestion,
					aiResponseLength: aiResponseText.length,
					aiResponsePreview: aiResponseText.substring(0, 100),
				});

				// Enhanced relevance checking with financial context awareness
				const questionKeywords = userQuestion
					.split(' ')
					.filter((word) => word.length > 2)
					.map((word) => word.toLowerCase());

				console.log('🔍 [DEBUG] Question keywords:', questionKeywords);

				// Check if AI response contains financial advice or actionable content
				const financialKeywords = [
					'budget',
					'saving',
					'goal',
					'spend',
					'money',
					'financial',
					'expense',
					'income',
					'debt',
					'invest',
					'save',
					'track',
					'manage',
					'plan',
					'strategy',
					'tip',
					'advice',
					'recommend',
					'suggest',
					'help',
				];

				const hasFinancialContent = financialKeywords.some((keyword) =>
					aiResponseText.toLowerCase().includes(keyword)
				);

				// Check for specific question relevance
				const hasRelevantContent = questionKeywords.some((keyword) => {
					const cleanKeyword = keyword.replace(/ing$|ies$|s$/, '');
					const keywordFound =
						aiResponseText.toLowerCase().includes(keyword) ||
						aiResponseText.toLowerCase().includes(cleanKeyword);

					console.log('🔍 [DEBUG] Keyword check:', {
						keyword,
						cleanKeyword,
						found: keywordFound,
						inResponse:
							aiResponseText.toLowerCase().includes(keyword) ||
							aiResponseText.toLowerCase().includes(cleanKeyword),
					});

					return keywordFound;
				});

				console.log('🔍 [DEBUG] Relevance result:', {
					hasRelevantContent,
					hasFinancialContent,
					questionKeywords,
					aiResponseLength: aiResponseText.length,
				});

				// More intelligent fallback trigger - only use fallback if response is clearly irrelevant
				const shouldUseFallback =
					!hasRelevantContent &&
					!hasFinancialContent &&
					aiResponseText.length < 30; // Much more lenient

				console.log('🔍 [DEBUG] Fallback decision:', {
					shouldUseFallback,
					reason: !hasRelevantContent
						? 'No relevant content'
						: 'Response too short',
					aiResponseLength: aiResponseText.length,
					threshold: 50,
				});

				if (shouldUseFallback) {
					console.log(
						'🔍 [DEBUG] AI response not relevant enough, using fallback instead'
					);

					// Use narration service for fallback responses
					try {
						const facts = narrationService.prepareFacts(
							budgets || [],
							goals || [],
							transactions || [],
							profile,
							currentInsights
						);

						const userProfile = narrationService.prepareUserProfile(
							goals || [],
							profile?.preferences
						);

						const structuredFallback = await narrationService.narrate(
							text.trim(),
							facts,
							userProfile,
							{ useMiniModel: true, enableCritic: false }
						);

						const fallbackMessage: Message = {
							id: (Date.now() + 1).toString(),
							text: structuredFallback.message,
							isUser: false,
							timestamp: new Date(),
							type: 'structured',
							structuredResponse: structuredFallback,
							// Add grounding info for fallback
							groundingInfo: {
								wasGrounded: false,
								confidence: 0.3,
								modelUsed: 'fallback-narration',
							},
						};

						setMessages((prev) => [...prev, fallbackMessage]);
					} catch (error) {
						console.error(
							'Fallback narration failed, using text fallback:',
							error
						);

						// Create fallback message with actionable buttons
						const fallbackMessage: Message = {
							id: (Date.now() + 1).toString(),
							text: "I'm having trouble providing a complete answer right now.",
							isUser: false,
							timestamp: new Date(),
							type: 'fallback', // New type for fallback with actions
							data: {
								fallbackType: 'grounding_failed',
								originalQuestion: text.trim(),
								factPackId: `fallback_${Date.now()}`,
							},
						};

						setMessages((prev) => [...prev, fallbackMessage]);
					}

					// Scroll to bottom after fallback message
					setTimeout(() => {
						listRef.current?.scrollToEnd({ animated: true });
					}, 100);
				} else {
					// Create the AI response message with structured response
					const structuredResponse = await composeStructuredResponse(
						text.trim()
					);

					// Log chat analytics for quality monitoring
					const startTime = Date.now();
					const responseTimeMs =
						startTime - (aiResponse?.timestamp?.getTime() || startTime);

					logChat({
						intent: 'GENERAL_QA',
						usedGrounding: !!aiResponse?.wasGrounded,
						model: aiResponse?.modelUsed || 'unknown',
						tokensIn: aiResponse?.usage?.estimatedTokens || 0,
						tokensOut: aiResponse?.response?.length || 0,
						hadActions: !!structuredResponse.actions?.length,
						hadCard: !!structuredResponse.cards?.length,
						fallback:
							structuredResponse.sources?.some((s) => s.kind === 'cache') ||
							false,
						userSatisfaction: undefined, // Will be set when user provides feedback
						responseTimeMs,
						groundingConfidence: aiResponse?.groundingConfidence,
						messageLength: aiResponse?.response?.length || 0,
						hasFinancialData: !!(
							budgets?.length ||
							goals?.length ||
							transactions?.length
						),
					});

					// Emit cost summary analytics
					await emit({
						type: 'ai.cost_summary',
						model:
							aiResponse?.modelUsed === 'gpt-4'
								? 'pro'
								: aiResponse?.modelUsed === 'gpt-3.5-turbo'
								? 'mini'
								: 'standard',
						input_tokens: aiResponse?.usage?.estimatedTokens || 0,
						output_tokens: aiResponse?.response?.length || 0,
						cache_hit: false,
						session_id: getSessionId(),
						message_id: messageId,
					} as any);

					const aiMessage: Message = {
						id: (Date.now() + 1).toString(),
						text: structuredResponse.message, // Keep text for backward compatibility
						isUser: false,
						timestamp: new Date(),
						type: 'structured', // Use structured type
						groundingInfo: {
							wasGrounded: aiResponse?.wasGrounded || false,
							confidence: aiResponse?.groundingConfidence,
							modelUsed: aiResponse?.modelUsed,
						},
						structuredResponse: structuredResponse, // Add structured response data
						hybridOptimization: aiResponse?.hybridOptimization, // Add hybrid cost optimization data
					};

					console.log('🔍 [DEBUG] Created structured AI response:', aiMessage);
					setMessages((prev) => {
						console.log(
							'🔍 [DEBUG] Adding structured AI response, current count:',
							prev.length
						);
						return [...prev, aiMessage];
					});

					// Auto-switch to appropriate interface mode based on detected mode
					if (detectedMode !== 'CHAT') {
						// Add a small delay to let the user see the AI response first
						setTimeout(() => {
							switchToMode(detectedMode);

							// If insights mode, try to get ML insights
							if (detectedMode === 'INSIGHTS' && mlReady) {
								generateMLInsights(text.trim());
							}
						}, 1500);
					}

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
				// Enhanced error logging for debugging
				console.log('🔍 [DEBUG] AI service error details:', {
					message: error.message,
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
					errorType: error.constructor.name,
					stack: error.stack?.split('\n').slice(0, 3), // First 3 lines of stack
				});

				// Check if it's a paywall/usage limit error
				if (
					error.response?.status === 429 &&
					error.response?.data?.upgradeRequired
				) {
					console.log('🔍 [DEBUG] Paywall error detected, showing paywall');
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

				// For all other errors, use enhanced fallback with FallbackCard
				console.log(
					'🔍 [DEBUG] Using enhanced fallback response for:',
					text.trim()
				);

				// Use the new fallback handler
				handleFallbackResponse(text.trim(), 'missing_data');

				// Scroll to bottom after error fallback message
				setTimeout(() => {
					listRef.current?.scrollToEnd({ animated: true });
				}, 100);
			} finally {
				setIsTyping(false);

				// Emit user outcome analytics (assume resolved for now)
				// In production, this would be updated based on user feedback
				emit({
					type: 'ai.user_outcome',
					resolved: true,
					cta_taken: null,
					session_id: getSessionId(),
					message_id: messageId,
				} as any).catch(console.warn); // Don't let analytics failures break the app

				// Scroll to bottom when typing stops
				setTimeout(() => {
					listRef.current?.scrollToEnd({ animated: true });
				}, 50);
			}

			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		},
		[
			messages.length,
			aiService,
			currentUsage.subscriptionTier,
			showPremiumHint,
			detectInterfaceMode,
			switchToMode,
			mlReady,
		]
	);

	// Disable insights if not enabled
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	if (!aiInsightsEnabled) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<Header
					onOpenSettings={() => router.push('/(stack)/settings/aiInsights')}
					currentUsage={currentUsage}
					interfaceMode={interfaceMode}
					onModeChange={switchToMode}
					hasProfileUpdates={hasRecentUpdates}
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
				interfaceMode={interfaceMode}
				onModeChange={switchToMode}
			/>

			{/* Unified AI Assistant Interface */}
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				{/* Dynamic Content Area */}
				<View style={styles.contentArea}>
					{/* Chat Messages */}
					<FlatList
						ref={listRef}
						data={messages}
						keyExtractor={(m) => m.id}
						renderItem={({ item }) => {
							// Handle fallback messages with FallbackCard
							if (item.structuredResponse?.fallback) {
								return (
									<FallbackCard
										status={item.structuredResponse.fallback.status}
										tinyFact={item.structuredResponse.fallback.tinyFact}
										actions={item.structuredResponse.fallback.actions}
										timeWindow={item.structuredResponse.fallback.timeWindow}
										onAction={(action) => {
											// Handle fallback actions
											switch (action.action) {
												case 'CONNECT_ACCOUNT':
													// Navigate to account connection
													router.push('/(stack)/settings/accounts' as any);
													break;
												case 'OPEN_BUDGET':
													router.push('/(tabs)/budgets/' as any);
													break;
												case 'PICK_TIME_WINDOW':
													// Show time window picker (could be a modal)
													console.log('Time window picker:', action.payload);
													break;
												case 'CREATE_RULE':
													router.push('/(stack)/addRecurringExpense' as any);
													break;
												case 'MARK_PAID':
													// Handle marking as paid
													console.log('Mark as paid:', action.payload);
													break;
												case 'SET_LIMIT':
													router.push('/(tabs)/budgets/' as any);
													break;
											}

											// Log fallback action for analytics
											console.log('🔍 [Fallback] Action clicked:', {
												action: action.action,
												label: action.label,
												timestamp: new Date().toISOString(),
											});
										}}
									/>
								);
							}

							// Regular message bubble
							return (
								<MessageBubble
									m={item}
									onPickPrompt={handleSendMessage}
									onShowPremium={handleShowPremium}
									showPremiumHint={showPremiumHint}
									onAction={handleStructuredAction}
								/>
							);
						}}
						contentContainerStyle={styles.listContent}
						style={styles.list}
						scrollEventThrottle={16}
						contentInsetAdjustmentBehavior="automatic"
						automaticallyAdjustContentInsets={true}
						contentInset={{ bottom: 20 }}
					/>
					{isTyping && <TypingDots />}
				</View>

				{/* Dynamic Interface Panels */}
				{showInsightsPanel && (
					<View style={styles.interfacePanel}>
						<View style={styles.panelHeader}>
							<Ionicons name="analytics" size={20} color="#3b82f6" />
							<Text style={styles.panelTitle}>AI Insights</Text>
							<TouchableOpacity
								onPress={() => setShowInsightsPanel(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={20} color="#6b7280" />
							</TouchableOpacity>
						</View>

						{/* Educational Disclaimer */}
						<View style={styles.disclaimerBanner}>
							<Ionicons name="information-circle" size={16} color="#ef4444" />
							<Text style={styles.disclaimerText}>
								These are educational insights, not financial advice. Always
								consult a qualified professional for financial decisions.
							</Text>
						</View>

						<MLInsightsPanel
							onInsightPress={(insight) => {
								setShowInsightsPanel(false);
								handleSendMessage(insight.message);
							}}
						/>

						{/* Insight Chips Row */}
						<InsightChipsRow
							insights={[
								{
									id: 'sample_1',
									severity: 'info',
									headline: 'Budget on track',
									detail: "You're spending within your monthly budget",
									evidence: { factIds: [] },
								},
								{
									id: 'sample_2',
									severity: 'warn',
									headline: 'Dining overspend',
									detail: 'Consider reducing dining out this week',
									cta: {
										label: 'Adjust Budget',
										action: 'OPEN_BUDGET',
										payload: { category: 'dining' },
									},
									evidence: { factIds: [] },
								},
							]}
							title="Quick Insights"
							onInsightPress={(insight) => {
								console.log('Insight pressed:', insight);
							}}
							onCTAPress={(action, payload) => {
								console.log('CTA pressed:', action, payload);
								// Handle insight actions
								if (action === 'OPEN_BUDGET') {
									router.push('/(tabs)/budgets/' as any);
								}
							}}
							variant="compact"
						/>

						<SmartSuggestions onPick={handleSendMessage} mode="INSIGHTS" />
					</View>
				)}

				{showActionsPanel && (
					<View style={styles.interfacePanel}>
						<View style={styles.panelHeader}>
							<Ionicons name="flash" size={20} color="#10b981" />
							<Text style={styles.panelTitle}>Quick Actions</Text>
							<TouchableOpacity
								onPress={() => setShowActionsPanel(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={20} color="#6b7280" />
							</TouchableOpacity>
						</View>
						<View style={styles.actionsGrid}>
							<TouchableOpacity
								style={styles.actionButton}
								onPress={() => {
									setShowActionsPanel(false);
									router.push('/(stack)/addBudget');
								}}
							>
								<Ionicons name="add-circle" size={24} color="#3b82f6" />
								<Text style={styles.actionText}>Create Budget</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.actionButton}
								onPress={() => {
									setShowActionsPanel(false);
									router.push('/(stack)/addGoal');
								}}
							>
								<Ionicons name="flag" size={24} color="#10b981" />
								<Text style={styles.actionText}>Set Goal</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.actionButton}
								onPress={() => {
									setShowActionsPanel(false);
									router.push('/(tabs)/transaction/expense');
								}}
							>
								<Ionicons name="add" size={24} color="#f59e0b" />
								<Text style={styles.actionText}>Add Expense</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.actionButton}
								onPress={() => {
									setShowActionsPanel(false);
									handleSendMessage('Show me my spending analysis');
								}}
							>
								<Ionicons name="analytics" size={24} color="#8b82f6" />
								<Text style={styles.actionText}>Analyze Spending</Text>
							</TouchableOpacity>
						</View>
						<SmartSuggestions onPick={handleSendMessage} mode="ACTIONS" />
					</View>
				)}

				{/* Unified Input */}
				<View style={styles.inputBar}>
					<TextInput
						style={styles.input}
						value={inputText}
						onChangeText={setInputText}
						placeholder={
							interfaceMode === 'CHAT'
								? 'Ask about your finances...'
								: interfaceMode === 'INSIGHTS'
								? 'Ask for specific insights....'
								: interfaceMode === 'ACTIONS'
								? 'What would you like me to help you with?'
								: 'Ask for detailed analytics or comparisons...'
						}
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

			{/* Analytics Dashboard - Developer Tool */}
			<AnalyticsDashboard />

			{/* Mode State Machine Analytics - Developer Tool */}
			{__DEV__ && (
				<View style={styles.debugPanel}>
					<Text style={styles.debugTitle}>Mode Machine State</Text>
					<Text style={styles.debugText}>Current: {modeState.current}</Text>
					<Text style={styles.debugText}>
						Stable: {modeState.isStable ? 'Yes' : 'No'}
					</Text>
					<Text style={styles.debugText}>
						Transitions: {modeState.history.length}
					</Text>
					{modeState.history.length > 0 && (
						<Text style={styles.debugText}>
							Last: {modeState.history[modeState.history.length - 1].from} →{' '}
							{modeState.history[modeState.history.length - 1].to}
						</Text>
					)}
				</View>
			)}

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
		backgroundColor: '#241499',
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
		backgroundColor: '#e7f0e2',
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
		gap: 12,
		justifyContent: 'center',
	},
	promptCard: {
		width: '46%',
		backgroundColor: '#f6f6f6',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
		borderBottomLeftRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	promptIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#eff2f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		flexShrink: 0,
	},
	promptText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#374151',
		lineHeight: 16,
		textAlign: 'center',
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
	listContent: {
		paddingHorizontal: 20,
		paddingTop: 12,
	},
	msgWrap: {
		marginBottom: 20,
		maxWidth: '88%',
		borderRadius: 20,
		borderBottomLeftRadius: 6,
		paddingVertical: 12,
		paddingHorizontal: 16,
		overflow: 'hidden', // Ensure content doesn't overflow
	},
	msgAI: {
		alignSelf: 'flex-start',
		backgroundColor: '#f1f5f9',
		borderColor: '#e2e8f0',
		borderWidth: 1,
		maxWidth: '95%', // Allow AI messages to be wider for better insight visibility
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
		backgroundColor: '#f1f5f9',
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
		backgroundColor: '#f1f5f9',
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

	// Unified Interface Styles
	contentArea: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		overflow: 'hidden',
	},
	interfacePanel: {
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
		paddingHorizontal: 20,
		paddingBottom: 20,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: -2 },
		elevation: 3,
	},
	panelHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingTop: 16,
	},
	panelTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1e293b',
		flex: 1,
		textAlign: 'center',
	},
	closeButton: {
		padding: 8,
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: '#f1f5f9',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	actionText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#374151',
		marginTop: 8,
	},

	// Disclaimer banner styles
	disclaimerBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef2f2',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	disclaimerText: {
		flex: 1,
		fontSize: 12,
		color: '#dc2626',
		marginLeft: 8,
		lineHeight: 16,
		fontWeight: '500',
	},
	// New styles for mode indicator
	modeIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eff6ff',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 4,
	},
	modeText: {
		fontSize: 12,
		fontWeight: '600',
	},

	// Input bar mode indicator
	inputModeIndicator: {
		marginRight: 10,
	},

	// Debug panel styles
	debugPanel: {
		position: 'absolute',
		top: 100,
		right: 20,
		backgroundColor: '#1f2937',
		padding: 12,
		borderRadius: 8,
		minWidth: 200,
		zIndex: 1000,
	},
	debugTitle: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 8,
	},
	debugText: {
		color: '#d1d5db',
		fontSize: 10,
		marginBottom: 4,
	},
});
