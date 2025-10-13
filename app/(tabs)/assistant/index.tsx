import React, {
	useState,
	useEffect,
	useRef,
	useContext,
	useCallback,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	FlatList,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
	OrchestratorAIService,
	OrchestratorAIResponse,
} from '../../../src/services/feature/orchestratorAIService';
import { useProfile } from '../../../src/context/profileContext';
import { useBudgets } from '../../../src/hooks/useBudgets';
import { useGoals } from '../../../src/hooks/useGoals';
import { TransactionContext } from '../../../src/context/transactionContext';
import MissingInfoCard, {
	MissingInfoChip,
} from '../../../src/components/assistant/cards/MissingInfoCard';
import IntentMissingInfoCard from '../../../src/components/assistant/cards/IntentMissingInfoCard';
import {
	missingInfoService,
	MissingInfoState,
} from '../../../src/services/feature/missingInfoService';
import {
	intentMissingInfoService,
	IntentMissingInfoState,
	IntentContext,
} from '../../../src/services/feature/intentMissingInfoService';
import {
	evaluateAnswerability,
	getDataSnapshot,
	convertMissingToChips,
	Intent,
} from '../../../src/services/feature/intentSufficiencyService';
import { ResilientApiService } from '../../../src/services/resilience/resilientApiService';
import {
	FallbackService,
	CachedSpendPlan,
	CachedBudget,
	CachedGoal,
} from '../../../src/services/resilience/fallbackService';
import FallbackCard from '../../../src/components/assistant/cards/FallbackCard';
import ServiceStatusIndicator from '../../../src/components/assistant/indicators/ServiceStatusIndicator';
import { TraceEventData } from '../../../src/services/feature/enhancedStreamingService';
import WhyThisTray from './components/WhyThisTray';
import DevHud from './_components/DevHud';
import {
	useMessagesReducerV2,
	Message,
} from '../../../src/hooks/useMessagesReducerV2';
import { useBulletproofStreamV3 } from '../../../src/hooks/useBulletproofStreamV3';
import { modeStateService } from '../../../src/services/assistant/modeStateService';
import { buildTestSseUrl } from '../../../src/networking/endpoints';
import { startStreaming } from '../../../src/services/streaming';
import { Image } from 'expo-image';
import {
	InsightsContextService,
	Insight,
} from '../../../src/services/insights/insightsContextService';
import ContextualInsightsPanel from '../../../src/components/assistant/panels/ContextualInsightsPanel';
import {
	AppEvents,
	EVT_AI_INSIGHTS_CHANGED,
	EVT_ASSISTANT_CONFIG_CHANGED,
	AIInsightsChangedEvent,
	AssistantConfigChangedEvent,
} from '../../../src/lib/eventBus';
import {
	toAssistantConfig,
	AssistantConfig,
	isPersonalizationOn,
	allowProactive,
	shouldEnrichPrompts,
} from '../../../src/state/assistantConfig';
import { useFeature } from '../../../src/config/features';
import { FooterBar } from '../../../src/ui';

export default function AssistantScreen() {
	const router = useRouter();
	const tabBarHeight = useBottomTabBarHeight();
	const { profile } = useProfile();
	const { budgets } = useBudgets() as { budgets: any[] };
	const aiInsightsEnabled = useFeature('aiInsights');
	const { goals } = useGoals() as { goals: any[] };
	const { transactions } = useContext(TransactionContext) as {
		transactions: any[];
	};

	// Keep local assistant config that reacts instantly to events
	const [config, setConfig] = useState<AssistantConfig>(() =>
		toAssistantConfig(
			profile?.preferences?.assistant,
			profile?.preferences?.aiInsights
		)
	);

	// Stay in sync with profile when it refetches
	useEffect(() => {
		setConfig(
			toAssistantConfig(
				profile?.preferences?.assistant,
				profile?.preferences?.aiInsights
			)
		);
	}, [profile?.preferences?.assistant, profile?.preferences?.aiInsights]);

	// React instantly to assistant config changes from anywhere in the app
	useEffect(() => {
		const handler = ({ config: newConfig }: AssistantConfigChangedEvent) => {
			console.log('🔧 [DEBUG] Assistant config event received:', newConfig);
			setConfig(newConfig);

			// Clear context when personalization is disabled
			if (!isPersonalizationOn(newConfig)) {
				const insightsServiceInstance = InsightsContextService.getInstance();
				insightsServiceInstance.clearContext();
				setCurrentConversationContext('');
			}
		};

		AppEvents.on(EVT_ASSISTANT_CONFIG_CHANGED, handler);
		return () => {
			AppEvents.off(EVT_ASSISTANT_CONFIG_CHANGED, handler);
		};
	}, []);

	// Legacy support for AI insights events
	useEffect(() => {
		const handler = ({ enabled }: AIInsightsChangedEvent) => {
			console.log('🔧 [DEBUG] Legacy AI insights event received:', { enabled });
			// Convert to new config format
			const newConfig = enabled
				? { ...config, mode: 'personalized' as const }
				: { ...config, mode: 'private' as const };
			setConfig(newConfig);
		};

		AppEvents.on(EVT_AI_INSIGHTS_CHANGED, handler);
		return () => {
			AppEvents.off(EVT_AI_INSIGHTS_CHANGED, handler);
		};
	}, [config]);

	// Debug: Log config changes
	useEffect(() => {
		console.log('🔧 [DEBUG] Assistant config changed:', {
			config,
			hasProfile: !!profile,
			isPersonalizationOn: isPersonalizationOn(config),
			allowProactive: allowProactive(config),
			timestamp: new Date().toISOString(),
		});
	}, [config, profile]);

	// Initialize messages with reducer
	const initialMessages: Message[] = [
		{
			id: '1',
			text: "Hey! I'm your financial copilot. I'm here to help you build better money habits and reach your financial goals.\n\nWhat would you like to work on first?",
			isUser: false,
			timestamp: new Date(),
		},
	];

	const {
		messages,
		dispatch,
		streamingRef,
		onDeltaReceived,
		addUserMessage,
		addAIPlaceholder,
		addDelta,
		finalizeMessage,
		setError,
		clearStreaming,
	} = useMessagesReducerV2(initialMessages);

	const [inputText, setInputText] = useState('');
	const [orchestratorService, setOrchestratorService] =
		useState<OrchestratorAIService | null>(null);
	const [missingInfoState, setMissingInfoState] = useState<MissingInfoState>({
		chips: [],
		collectedData: {},
		isCollecting: false,
		completionRate: 0,
	});
	const [intentMissingInfoState, setIntentMissingInfoState] =
		useState<IntentMissingInfoState>({
			chips: [],
			collectedData: {},
			isCollecting: false,
			completionRate: 0,
			currentIntent: null,
			refusalMessage: '',
		});
	const [debugInfo, setDebugInfo] = useState<string>('');
	const [uiTimeout, setUiTimeout] = useState<NodeJS.Timeout | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [showFallback, setShowFallback] = useState(false);
	const [fallbackData, setFallbackData] = useState<{
		spendPlan?: CachedSpendPlan | null;
		budgets?: CachedBudget[];
		goals?: CachedGoal[];
		lastSync?: Date | null;
	}>({});
	const [traceData, setTraceData] = useState<TraceEventData | null>(null);
	const [performanceData, setPerformanceData] = useState<{
		timeToFirstToken: number;
		totalTime: number;
		cacheHit: boolean;
		modelUsed: string;
		tokensUsed: number;
	} | null>(null);
	const [dataInitialized, setDataInitialized] = useState(false);
	const [lastProcessedMessage, setLastProcessedMessage] = useState<string>('');
	const [budgetStatus, setBudgetStatus] = useState<{
		spent: number;
		limit: number;
		remaining: number;
		percentage: number;
		canExpand: boolean;
	} | null>(null);
	const [showExpandButton, setShowExpandButton] = useState(false);
	const [currentConversationContext, setCurrentConversationContext] =
		useState('');
	const [insightsService] = useState(() =>
		InsightsContextService.getInstance()
	);

	// Mode state management
	const [modeState, setModeState] = useState(modeStateService.getState());

	// Use the streaming hook
	const { startStream, stopStream, isStreaming } = useBulletproofStreamV3({
		messages,
		dispatch,
		streamingRef,
		onDeltaReceived,
		addDelta,
		finalizeMessage,
		setError,
		clearStreaming,
	});

	// Derived state
	const streamingMessageId = streamingRef.current.messageId;

	// Keep a ref to the latest messages for verification
	const messagesRef = useRef(messages);
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	// Debug: Log messages state changes
	useEffect(() => {
		console.log('🔍 [DEBUG] Messages state changed:', {
			count: messages.length,
			ids: messages.map((m) => ({
				id: m.id,
				isUser: m.isUser,
				isStreaming: m.isStreaming,
			})),
			timestamp: new Date().toISOString(),
		});
	}, [messages]);

	// Load insights context (only if personalization is enabled)
	const loadInsightsContext = useCallback(async () => {
		if (!isPersonalizationOn(config)) return; // Guard: don't load if disabled

		try {
			// Load context from AsyncStorage (set by profile insights)
			await insightsService.loadContext();

			// Load insights with filtered data based on config
			const filteredBudgets = config.useBudgetsGoals ? budgets : [];
			const filteredGoals = config.useBudgetsGoals ? goals : [];
			const filteredTransactions = config.useTransactions ? transactions : [];

			await insightsService.loadInsights(
				profile,
				filteredBudgets,
				filteredGoals,
				filteredTransactions
			);

			console.log(
				'[Assistant] Loaded insights context and data with config:',
				config
			);
		} catch (error) {
			console.error('[Assistant] Failed to load insights context:', error);
		}
	}, [config, insightsService, profile, budgets, goals, transactions]);

	// Initialize orchestrator service when profile is available
	useEffect(() => {
		if (!profile) return;

		// Create a basic financial context from profile data
		const financialContext = {
			profile: {
				monthlyIncome: profile.monthlyIncome || 0,
				savings: profile.savings || 0,
				debt: profile.debt || 0,
				expenses: (profile.expenses as unknown as Record<string, number>) || {},
				financialGoal: profile.financialGoal || '',
				riskProfile: profile.riskProfile || {
					tolerance: 'moderate',
					experience: 'beginner',
				},
			},
			budgets: [],
			goals: [],
			transactions: [],
		};
		const service = new OrchestratorAIService(financialContext);
		setOrchestratorService(service);

		// Load fallback data
		loadFallbackData();

		// Handle insights based on config state
		if (isPersonalizationOn(config)) {
			loadInsightsContext();
		} else {
			insightsService.clearInsights(); // Clear cache when disabled
		}
	}, [
		profile,
		budgets,
		goals,
		transactions,
		loadInsightsContext,
		config,
		insightsService,
	]);

	// Track when data is initialized
	useEffect(() => {
		// Mark as initialized after a short delay to allow data to load
		const timer = setTimeout(() => {
			setDataInitialized(true);
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	// Subscribe to mode state changes
	useEffect(() => {
		const unsubscribe = modeStateService.subscribe((state) => {
			setModeState(state);
		});
		return unsubscribe;
	}, []);

	// Proactively clear cached insights when the user turns the toggle OFF
	useEffect(() => {
		const personalizationEnabled = isPersonalizationOn(config);
		console.log('🔧 [DEBUG] Config change effect triggered:', {
			config,
			personalizationEnabled,
			willClearContext: !personalizationEnabled,
		});

		if (!personalizationEnabled) {
			console.log(
				'🧹 [DEBUG] Clearing insights context and conversation context'
			);
			insightsService.clearInsights(); // Wipe any lingering context/insights
			setCurrentConversationContext(''); // Clear conversation-derived context
		}
	}, [config, insightsService]);

	// Track critical state changes only
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (lastMessage && lastMessage.isStreaming) {
			console.log('🔄 [Assistant] Stream started for message:', lastMessage.id);
		} else if (lastMessage && !lastMessage.isStreaming && lastMessage.text) {
			console.log('✅ [Assistant] Message completed:', {
				id: lastMessage.id,
				length: lastMessage.text.length,
				isUser: lastMessage.isUser,
			});
		}
	}, [messages]);

	// Load fallback data for offline use
	const loadFallbackData = async () => {
		try {
			const [spendPlan, budgets, goals, lastSync] = await Promise.all([
				FallbackService.getCachedSpendPlans().then((plans) => plans[0] || null),
				FallbackService.getCachedBudgets(),
				FallbackService.getCachedGoals(),
				FallbackService.getLastSyncTime(),
			]);

			setFallbackData({
				spendPlan,
				budgets,
				goals,
				lastSync,
			});
		} catch (error) {
			console.error('[Assistant] Failed to load fallback data:', error);
		}
	};

	// Subscribe to missing info service changes
	useEffect(() => {
		const unsubscribe = missingInfoService.subscribe((state) => {
			setMissingInfoState(state);
		});

		return unsubscribe;
	}, []);

	// Subscribe to intent missing info service changes
	useEffect(() => {
		const unsubscribe = intentMissingInfoService.subscribe((state) => {
			setIntentMissingInfoState(state);
		});

		return unsubscribe;
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (uiTimeout) {
				clearTimeout(uiTimeout);
			}
		};
	}, [uiTimeout]);

	// Handle missing info chip press
	const handleChipPress = (chip: MissingInfoChip) => {
		console.log('Chip pressed:', chip.label);
	};

	// Handle missing info value submission
	const handleValueSubmit = (chipId: string, value: string) => {
		missingInfoService.submitValue(chipId, value);
		console.log('Value submitted:', chipId, value);
	};

	// Handle intent missing info value submission (currently unused but kept for future use)
	// const handleIntentValueSubmit = (chipId: string, value: string) => {
	// 	intentMissingInfoService.submitValue(chipId, value);
	// 	console.log('Intent value submitted:', chipId, value);
	// };

	// Check intent sufficiency for a message (non-throwing version)
	const checkIntentSufficiency = async (
		message: string,
		context: IntentContext
	) => {
		try {
			// Try to determine intent from message (simplified approach)
			let intentId: Intent = 'GET_SPENDING_PLAN'; // Default intent

			// Simple keyword-based intent detection
			if (
				message.toLowerCase().includes('goal') ||
				message.toLowerCase().includes('allocate')
			) {
				intentId = 'GOAL_ALLOCATION';
			} else if (
				message.toLowerCase().includes('afford') ||
				message.toLowerCase().includes('can i buy')
			) {
				intentId = 'AFFORDABILITY_CHECK';
			} else if (
				message.toLowerCase().includes('bill') ||
				message.toLowerCase().includes('calendar')
			) {
				intentId = 'BILL_CALENDAR';
			} else if (
				message.toLowerCase().includes('runway') ||
				message.toLowerCase().includes('savings')
			) {
				intentId = 'SAVINGS_RUNWAY';
			} else if (
				message.toLowerCase().includes('debt') ||
				message.toLowerCase().includes('pay off')
			) {
				intentId = 'DEBT_PAYOFF';
			} else if (
				message.toLowerCase().includes('budget') ||
				message.toLowerCase().includes('spending')
			) {
				intentId = 'BUDGET_ANALYSIS';
			} else if (
				message.toLowerCase().includes('expense') ||
				message.toLowerCase().includes('track')
			) {
				intentId = 'EXPENSE_TRACKING';
			} else if (
				message.toLowerCase().includes('invest') ||
				message.toLowerCase().includes('portfolio')
			) {
				intentId = 'INVESTMENT_ADVICE';
			} else if (
				message.toLowerCase().includes('retirement') ||
				message.toLowerCase().includes('retire')
			) {
				intentId = 'RETIREMENT_PLANNING';
			}

			// Create data snapshot
			const snapshot = getDataSnapshot(
				context.budgets || [],
				context.goals || [],
				context.transactions || [],
				context.profile,
				dataInitialized
			);

			// Use non-throwing sufficiency check
			const result = await evaluateAnswerability(intentId, snapshot);

			if (result.error) {
				console.warn(
					'Intent sufficiency check had error, proceeding anyway:',
					result.error
				);
			}

			if (!result.sufficient) {
				// Convert missing data to chips
				const missingChips = convertMissingToChips(result.missing);

				return {
					shouldShowMissingInfo: true,
					refusalMessage: `I need more information to help you with ${intentId
						.toLowerCase()
						.replace(/_/g, ' ')}. Please provide: ${result.missing.join(', ')}`,
					missingSlots: missingChips,
				};
			}

			return {
				shouldShowMissingInfo: false,
				refusalMessage: '',
				missingSlots: [],
			};
		} catch (error) {
			console.error('Error checking intent sufficiency:', error);
			// Never throw - always allow the chat to continue
			return {
				shouldShowMissingInfo: false,
				refusalMessage: '',
				missingSlots: [],
			};
		}
	};

	// Handle completion of missing info collection
	const handleMissingInfoComplete = async () => {
		if (!orchestratorService) return;

		const collectedData = missingInfoService.getCollectedDataForAPI();
		console.log('Missing info collection complete:', collectedData);

		// Send collected data to AI for processing
		const followUpMessage = `I've provided the missing information: ${JSON.stringify(
			collectedData
		)}`;

		// Add user message using reducer
		addUserMessage(followUpMessage);

		try {
			const aiResponse: OrchestratorAIResponse =
				await orchestratorService.getResponse(followUpMessage);

			// Add AI response using reducer
			const aiMessageId = (Date.now() + 1).toString();
			addAIPlaceholder(aiMessageId);
			finalizeMessage(
				aiMessageId,
				aiResponse.response,
				aiResponse.performance,
				aiResponse.evidence
			);

			missingInfoService.clearCollectedData();
		} catch (error) {
			console.error('Error processing collected data:', error);
		}
	};

	// Handle completion of intent missing info collection
	const handleIntentMissingInfoComplete = async () => {
		if (!orchestratorService) return;

		const collectedData = intentMissingInfoService.getCollectedDataForAPI();
		console.log('Intent missing info collection complete:', collectedData);

		// Send collected data to AI for processing
		const followUpMessage = `I've provided the missing information: ${JSON.stringify(
			collectedData
		)}`;

		// Add user message using reducer
		addUserMessage(followUpMessage);

		try {
			const aiResponse: OrchestratorAIResponse =
				await orchestratorService.getResponse(followUpMessage);

			// Add AI response using reducer
			const aiMessageId = (Date.now() + 1).toString();
			addAIPlaceholder(aiMessageId);
			finalizeMessage(
				aiMessageId,
				aiResponse.response,
				aiResponse.performance,
				aiResponse.evidence
			);

			intentMissingInfoService.clearCollectedData();
		} catch (error) {
			console.error('Error processing collected data:', error);
		}
	};

	const handleSendMessage = async () => {
		const trimmedInput = inputText.trim();

		// Enhanced validation and recovery
		if (!trimmedInput) {
			return;
		}

		// Prevent duplicate message processing
		if (lastProcessedMessage === trimmedInput) {
			console.warn('🚨 [Assistant] Duplicate message detected, ignoring');
			setDebugInfo('Duplicate message ignored');
			return;
		}

		// Check for stuck streaming state and recover
		if (isStreaming && streamingMessageId) {
			const streamingMessage = messages.find(
				(m) => m.id === streamingMessageId
			);
			if (streamingMessage && streamingMessage.isStreaming) {
				const timeSinceLastUpdate = streamingMessage.timestamp
					? Date.now() - streamingMessage.timestamp.getTime()
					: 0;

				if (timeSinceLastUpdate > 10000) {
					console.warn('🚨 [Assistant] Stuck stream detected, recovering...', {
						messageId: streamingMessage.id,
						timeSinceLastUpdate: `${Math.round(timeSinceLastUpdate / 1000)}s`,
						hasContent: !!(streamingMessage.buffered || streamingMessage.text),
					});

					// Force clear streaming state
					clearStreaming();
					stopStream();
					setDebugInfo('Recovered from stuck streaming state');
				}
			}
		}

		if (isStreaming) {
			return;
		}

		// Transition to thinking mode
		modeStateService.transitionTo('thinking', 'user input received');

		// Add user message using reducer
		const userMessageId = addUserMessage(trimmedInput);
		console.log('🔍 [DEBUG] User message added with ID:', userMessageId);

		// Track this message to prevent duplicates
		setLastProcessedMessage(trimmedInput);

		const currentInput = trimmedInput;
		setInputText('');
		setShowFallback(false);
		setTraceData(null);
		setPerformanceData(null);

		// Update conversation context for insights
		setCurrentConversationContext(currentInput);

		// Enhance user input with insights context based on config
		let enhancedInput = currentInput;

		if (shouldEnrichPrompts(config, currentInput)) {
			const insightsContext = insightsService.getContextForConversation();
			const relevantInsights = insightsService.getRelevantInsights(
				currentInput,
				2
			);

			if (insightsContext) {
				enhancedInput += `\n\nContext: ${insightsContext}`;
			}

			// Add relevant insights to context
			if (relevantInsights.length > 0) {
				const insightsText = relevantInsights
					.map((insight) => `- ${insight.title}: ${insight.message}`)
					.join('\n');
				enhancedInput += `\n\nRelevant insights:\n${insightsText}`;
			}
		}

		// Check intent sufficiency before sending to AI
		const context: IntentContext = {
			profile: {
				monthlyIncome: profile?.monthlyIncome || 0,
				savings: profile?.savings || 0,
				debt: profile?.debt || 0,
				riskProfile: profile?.riskProfile?.tolerance || 'moderate',
			},
			bills: [],
			budgets: fallbackData.budgets || [],
			goals: (fallbackData.goals || []).map((goal) => ({
				name: goal.name,
				target: goal.target,
				deadline: goal.dueDate || 'No deadline set',
			})),
			transactions: [],
		};

		const sufficiencyResult = await checkIntentSufficiency(
			currentInput,
			context
		);

		if (sufficiencyResult.shouldShowMissingInfo) {
			// Transition to collecting info mode
			modeStateService.transitionTo(
				'collecting_info',
				'missing information required'
			);

			// Show missing info UI instead of sending to AI
			// Add a message explaining what's needed using reducer
			const missingInfoMessageId = addUserMessage(
				sufficiencyResult.refusalMessage
			);
			console.log(
				'🤖 [Assistant] Added missing info message with ID:',
				missingInfoMessageId
			);
			return;
		}

		// Create streaming AI message using reducer with proper synchronization
		let aiMessageId = (Date.now() + 1).toString();
		console.log('🔍 [DEBUG] Creating AI placeholder with ID:', aiMessageId);

		// Add the AI placeholder message
		addAIPlaceholder(aiMessageId);

		// Wait for state update and verify message was added with multiple attempts
		let verifyMessage = null;
		let attempts = 0;
		const maxAttempts = 10;

		// Add a small initial delay to ensure state has been updated
		await new Promise((resolve) => setTimeout(resolve, 100));

		while (!verifyMessage && attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 50));
			// Use the ref to get the latest messages state
			verifyMessage = messagesRef.current.find((m) => m.id === aiMessageId);
			attempts++;

			if (!verifyMessage && attempts < maxAttempts) {
				console.log(
					`🔍 [DEBUG] Verification attempt ${attempts}/${maxAttempts} for message:`,
					aiMessageId,
					'Available IDs:',
					messagesRef.current.map((m) => m.id)
				);
			}
		}

		if (!verifyMessage) {
			console.error(
				'🚨 [Assistant] Message not found after adding placeholder:',
				{
					aiMessageId,
					availableIds: messagesRef.current.map((m) => m.id),
					attempts,
				}
			);

			// Try one more time with a new ID
			const newAiMessageId = (Date.now() + 2).toString();
			console.log(
				'🔄 [Assistant] Creating new message with ID:',
				newAiMessageId
			);

			addAIPlaceholder(newAiMessageId);

			// Wait and verify the new message
			attempts = 0;
			while (!verifyMessage && attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 50));
				verifyMessage = messagesRef.current.find(
					(m) => m.id === newAiMessageId
				);
				attempts++;
			}

			if (!verifyMessage) {
				console.error('🚨 [Assistant] Message creation failed, aborting');
				return;
			}

			// Update the aiMessageId to use the new one
			aiMessageId = newAiMessageId;
		}

		console.log(
			'✅ [DEBUG] Message verified after adding placeholder:',
			verifyMessage.id
		);

		// Transition to processing mode
		modeStateService.transitionTo('processing', 'AI processing started');

		// Set up UI timeout as a fallback (stream layer now handles real timeouts with inactivity timer)
		const timeout = setTimeout(() => {
			const streamingMessage = messages.find(
				(m) => m.id === streamingMessageId
			);

			console.warn(
				'🚨 [Assistant] UI fallback timeout after 3m (stream layer should have handled this)',
				{
					messageId: streamingMessageId,
					hasStreamingMessage: !!streamingMessage,
					hasContent: streamingMessage
						? !!(streamingMessage.buffered || streamingMessage.text)
						: false,
					streamingState: isStreaming,
				}
			);

			if (streamingMessage && streamingMessage.isStreaming) {
				// Force finalize the message with whatever content we have
				finalizeMessage(
					streamingMessage.id,
					streamingMessage.buffered ||
						streamingMessage.text ||
						'Response incomplete due to UI timeout',
					streamingMessage.performance
				);
			}

			setDebugInfo('UI fallback timeout - stream should have completed');
			stopStream();
			clearStreaming();
		}, 180000); // 3 minute fallback timeout (stream layer handles real timeouts)
		setUiTimeout(timeout as any);

		console.log('🚀 [Assistant] Starting stream for message:', aiMessageId);

		// Ensure the streaming ref is set to the correct message ID and sessionId
		streamingRef.current.messageId = aiMessageId;
		if (!streamingRef.current.sessionId) {
			streamingRef.current.sessionId = `session_${Date.now()}`;
		}
		console.log('🔍 [DEBUG] Set streamingRef.messageId to:', aiMessageId);
		console.log(
			'🔍 [DEBUG] Set streamingRef.sessionId to:',
			streamingRef.current.sessionId
		);
		console.log(
			'🔍 [DEBUG] Current messages before streaming:',
			messages.map((m) => ({
				id: m.id,
				isUser: m.isUser,
				isStreaming: m.isStreaming,
			}))
		);

		try {
			console.log('🔍 [DEBUG] About to call startStream with:', {
				message: enhancedInput,
				messageId: aiMessageId,
				messageLength: enhancedInput.length,
				sessionId: streamingRef.current.sessionId,
				currentMessages: messagesRef.current.map((m) => ({
					id: m.id,
					isUser: m.isUser,
					isStreaming: m.isStreaming,
				})),
			});

			console.log('🚀 [Assistant] Calling startStream function...');
			await startStream(
				enhancedInput,
				{
					onMeta: (data) => {
						if (data.timeToFirstToken) {
							console.log(
								'⚡ [Assistant] First token received:',
								data.timeToFirstToken + 'ms'
							);
						}
						// Update budget status from meta data
						if (data.budget) {
							setBudgetStatus(data.budget);
						}
						setDebugInfo(`Meta: ${JSON.stringify(data).substring(0, 100)}...`);
					},
					onDelta: (data, bufferedText) => {
						// Transition to streaming mode on first delta
						if (modeStateService.getState().current !== 'streaming') {
							modeStateService.transitionTo(
								'streaming',
								'first delta received'
							);
						}

						console.log('[CALLBACK onDelta] len=', data.text?.length || 0);
						console.log('📝 [Assistant] Stream delta received:', {
							chars: bufferedText.length,
							messageId: aiMessageId,
							deltaText: data.text?.substring(0, 50) + '...',
							fullBufferedText: bufferedText.substring(0, 100) + '...',
						});

						// Ensure we're updating the correct message using the ref
						const targetMessage = messagesRef.current.find(
							(m) => m.id === aiMessageId
						);
						if (!targetMessage) {
							console.error(
								'🚨 [Assistant] Target message not found during delta:',
								{
									aiMessageId,
									availableIds: messagesRef.current.map((m) => m.id),
								}
							);

							// Try to create the message if it doesn't exist
							console.log('🔄 [Assistant] Creating missing message for delta');
							addAIPlaceholder(aiMessageId);
							// Add a small delay to ensure the message is created
							setTimeout(() => {
								addDelta(aiMessageId, data.text || '');
							}, 10);
							return;
						}

						// Add delta to the message
						addDelta(aiMessageId, data.text || '');

						setDebugInfo(
							`Streaming: ${
								bufferedText.length
							} chars - "${bufferedText.substring(0, 50)}..."`
						);
					},
					onFinal: (data) => {
						console.log('✅ [Assistant] Stream completed:', {
							responseLength: data.response?.length || 0,
							messageId: aiMessageId,
						});
						setPerformanceData(data.performance);

						// Show expand button for short responses if user has budget
						const responseLength = data.response?.length || 0;
						if (responseLength < 300 && budgetStatus?.canExpand) {
							setShowExpandButton(true);
						}
					},
					onTrace: (data) => {
						setTraceData(data);
					},
					onDone: () => {
						// Transition to idle mode on completion
						modeStateService.transitionTo('idle', 'stream completed');

						// Debug: Log current state before finalization
						console.log('🔍 [DEBUG] Finalization state:', {
							streamingMessageId,
							aiMessageId,
							availableMessages: messagesRef.current.map((m) => ({
								id: m.id,
								isUser: m.isUser,
								isStreaming: m.isStreaming,
								hasBufferedText: !!(m.buffered && m.buffered.length > 0),
							})),
						});

						// Find the correct message to finalize - prioritize the AI message ID
						const messageIdToFinalize = aiMessageId; // Use the AI message ID we created
						let currentMessage = messagesRef.current.find(
							(m) => m.id === messageIdToFinalize
						);

						if (!currentMessage) {
							console.error(
								'🚨 [Assistant] Message not found for finalization:',
								{
									messageIdToFinalize,
									streamingMessageId,
									availableIds: messagesRef.current.map((m) => m.id),
								}
							);

							// Recovery: Try to find any streaming message
							const streamingMessage = messagesRef.current.find(
								(m) => m.isStreaming
							);
							if (streamingMessage) {
								console.log(
									'🔄 [Assistant] Recovery: Found streaming message:',
									streamingMessage.id
								);
								currentMessage = streamingMessage;
							} else {
								// Last resort: create a new message with the buffered text
								console.log('🔄 [Assistant] Creating recovery message');
								addAIPlaceholder(messageIdToFinalize);
								// Wait a moment for the message to be created
								setTimeout(() => {
									finalizeMessage(
										messageIdToFinalize,
										'Response received but content not found',
										undefined
									);
								}, 50);
								return;
							}
						}

						// Use the buffered text if available, otherwise use the text
						const finalText =
							currentMessage.buffered && currentMessage.buffered.length > 0
								? currentMessage.buffered
								: currentMessage.text ||
								  'Response received but content not found';

						console.log('✅ [Assistant] Finalizing message:', {
							id: messageIdToFinalize,
							length: finalText.length,
							hasContent: finalText.length > 0,
							bufferedLength: currentMessage.buffered?.length || 0,
							textLength: currentMessage.text?.length || 0,
						});

						finalizeMessage(
							messageIdToFinalize,
							finalText,
							currentMessage.performance
						);

						setDebugInfo('Stream completed');

						// Clear streaming state with safety check
						console.log('🔍 [DEBUG] Clearing streaming state');
						clearStreaming();

						// Reset expand button state
						setShowExpandButton(false);

						// Reset duplicate prevention after successful completion
						setTimeout(() => {
							setLastProcessedMessage('');
						}, 1000);

						// Clear insights context after successful conversation (only if personalization enabled)
						if (isPersonalizationOn(config)) {
							insightsService.clearContext();
						}

						if (uiTimeout) {
							clearTimeout(uiTimeout);
							setUiTimeout(null);
						}
					},
					onError: (error) => {
						// Transition to error mode
						modeStateService.transitionTo('error', `stream error: ${error}`);

						console.error('🚨 [Assistant] Stream failed:', {
							error,
							messageId: aiMessageId,
							streamingState: isStreaming,
							timeout: !!uiTimeout,
						});

						console.log('🔍 [DEBUG] Error state:', {
							aiMessageId,
							availableMessages: messagesRef.current.map((m) => ({
								id: m.id,
								isUser: m.isUser,
								isStreaming: m.isStreaming,
								hasBufferedText: !!(m.buffered && m.buffered.length > 0),
							})),
						});

						setError(aiMessageId, error);
						setShowFallback(true);
						loadFallbackData();

						// Reset duplicate prevention after error
						setTimeout(() => {
							setLastProcessedMessage('');
						}, 1000);

						if (uiTimeout) {
							clearTimeout(uiTimeout);
							setUiTimeout(null);
						}
					},
				},
				{
					messageId: aiMessageId,
				}
			);

			console.log('✅ [Assistant] Stream call completed successfully');
		} catch (error) {
			console.error('💥 [Assistant] Failed to start stream:', {
				error: error instanceof Error ? error.message : String(error),
				messageId: aiMessageId,
				inputLength: currentInput.length,
			});

			setError(aiMessageId, 'Failed to start stream');
			setShowFallback(true);
			await loadFallbackData();
			clearStreaming();

			if (uiTimeout) {
				clearTimeout(uiTimeout);
				setUiTimeout(null);
			}
		}
	};

	// Handle retry of AI services
	const handleRetry = async () => {
		setIsRetrying(true);
		try {
			// Reset circuit breakers
			ResilientApiService.resetCircuitBreakers();

			// Try to send the last message again
			const lastUserMessage = messages.find((msg) => msg.isUser);
			if (lastUserMessage) {
				setInputText(lastUserMessage.text || '');
				await handleSendMessage();
			}
		} catch (error) {
			console.error('[Assistant] Retry failed:', error);
		} finally {
			setIsRetrying(false);
		}
	};

	// Handle refresh of fallback data
	const handleRefresh = async () => {
		await loadFallbackData();
	};

	// Handle show work button
	const handleShowWork = () => {
		console.log('Show work button pressed');
		// TODO: Implement show work functionality
	};

	// Handle insight press
	const handleInsightPress = (insight: Insight) => {
		console.log('Insight pressed:', insight.title);

		// Route to appropriate screen based on action
		if (insight.action) {
			if (insight.action === 'create_budget') {
				router.push('/(tabs)/budgets?tab=budgets');
			} else if (insight.action === 'set_savings_goal') {
				router.push('/(tabs)/budgets?tab=goals');
			} else if (
				insight.action === 'debt_strategy' ||
				insight.action === 'optimize_income'
			) {
				router.push('/(stack)/settings/profile/editFinancial');
			} else if (insight.action === 'reduce_expenses') {
				router.push('/(stack)/settings/profile/editExpenses');
			} else {
				// Default: start a conversation about this insight
				handleAskAboutInsight(insight);
			}
		}
	};

	// Handle asking about insight
	const handleAskAboutInsight = (insight: Insight) => {
		console.log('Ask about insight:', insight.title);

		// Create a contextual question about the insight
		const question = `Can you help me understand this insight: "${insight.title}" - ${insight.message}`;

		// Set the input text and send the message
		setInputText(question);

		// Update conversation context
		setCurrentConversationContext(`${insight.title} ${insight.message}`);

		// Auto-send after a short delay
		setTimeout(() => {
			handleSendMessage();
		}, 100);
	};

	// Handle expand button
	const handleExpand = async () => {
		const lastMessage = messages[messages.length - 1];
		if (lastMessage && !lastMessage.isUser) {
			// Re-send the last user message with expand flag
			const userMessages = messages.filter((m) => m.isUser);
			const lastUserMessage = userMessages[userMessages.length - 1];

			if (lastUserMessage) {
				// Set the input text and trigger expand
				setInputText(lastUserMessage.text || '');
				setShowExpandButton(true); // Keep expand button visible to pass the flag

				// Trigger the message send with expand flag
				setTimeout(() => {
					handleSendMessage();
				}, 100);
			}
		}
	};

	// Test streaming function
	const testStreaming = async () => {
		console.log('🧪 [Test] Starting streaming test');
		const testUrl = buildTestSseUrl();

		try {
			startStreaming({
				url: testUrl,
				token: 'test-token',
				onDelta: (text: string) => {
					console.log('🧪 [Test] Received delta:', text);
					// Add test message to chat
					const testMessageId = (Date.now() + 1).toString();
					addAIPlaceholder(testMessageId);
					addDelta(testMessageId, text);
				},
				onDone: () => {
					console.log('🧪 [Test] Stream completed');
					// Finalize the test message
					const lastMessage = messages[messages.length - 1];
					if (lastMessage && lastMessage.isStreaming) {
						finalizeMessage(
							lastMessage.id,
							lastMessage.buffered || lastMessage.text || 'Test completed'
						);
					}
				},
				onError: (error: string) => {
					console.error('🧪 [Test] Stream error:', error);
					setError('test', error);
				},
				onMeta: (data: any) => {
					console.log('🧪 [Test] Meta data:', data);
				},
			});
		} catch (error) {
			console.error('🧪 [Test] Failed to start test stream:', error);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<DevHud modeState={modeState} />
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.push('/(stack)/settings/aiInsights')}
				>
					<Ionicons name="settings-outline" size={24} color="#374151" />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Image
						source={require('../../../src/assets/logos/brieai-logo.png')}
						style={styles.logo}
						resizeMode="contain"
						accessibilityRole="image"
						accessibilityLabel="Brie app logo"
					/>
					{/* <Text style={styles.headerTitle}>AI Assistant</Text> */}
					{budgetStatus && (
						<Text style={styles.budgetIndicator}>
							💰 {budgetStatus.percentage}% used (
							{budgetStatus.remaining.toFixed(2)} left)
						</Text>
					)}
				</View>
				<View style={{ width: 24 }} />
			</View>

			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={tabBarHeight}
			>
				<FlatList
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => {
						return (
							<View
								style={[
									styles.message,
									item.isUser ? styles.userMessage : styles.aiMessage,
								]}
							>
								<Text
									style={[
										styles.messageText,
										item.isUser ? styles.userMessageText : styles.aiMessageText,
									]}
								>
									{item.isStreaming ? item.buffered : item.text}
									{item.isStreaming && (
										<Text style={styles.streamingCursor}>|</Text>
									)}
								</Text>
								{__DEV__ && !item.isUser && (
									<Text style={styles.debugText}>
										Debug: {item.isStreaming ? 'streaming' : 'final'} | Text:{' '}
										{item.text?.length || 0} chars | Buffered:{' '}
										{item.buffered?.length || 0} chars
									</Text>
								)}
								{!item.isUser && item.performance && (
									<View style={styles.performanceInfo}>
										<Text style={styles.performanceText}>
											⚡ {item.performance.totalLatency}ms
											{item.performance.timeToFirstToken && (
												<Text style={styles.timeToFirstToken}>
													{' '}
													(first token: {item.performance.timeToFirstToken}ms)
												</Text>
											)}
											{item.performance.cacheHit ? ' (cached)' : ''}
										</Text>
										{item.performance.parallelTools &&
											item.performance.parallelTools.executed.length > 0 && (
												<Text style={styles.parallelInfo}>
													🔧 {item.performance.parallelTools.executed.length}{' '}
													tools ({item.performance.parallelTools.successCount}✓,{' '}
													{item.performance.parallelTools.failureCount}✗)
													{item.performance.parallelTools.timeoutCount > 0 &&
														`, ${item.performance.parallelTools.timeoutCount}⏱`}
												</Text>
											)}
										{item.performance.parallelFacts &&
											item.performance.parallelFacts.queriesExecuted > 0 && (
												<Text style={styles.parallelInfo}>
													📊 {item.performance.parallelFacts.queriesExecuted}{' '}
													queries ({item.performance.parallelFacts.successCount}
													✓, {item.performance.parallelFacts.failureCount}✗)
												</Text>
											)}
										{item.performance.optimizations && (
											<Text style={styles.optimizationInfo}>
												🚀 Parallel:{' '}
												{Object.entries(item.performance.optimizations)
													.filter(([_, enabled]) => enabled)
													.map(([key, _]) =>
														key.replace(/([A-Z])/g, ' $1').toLowerCase()
													)
													.join(', ')}
											</Text>
										)}
										{item.showWorkButton && (
											<TouchableOpacity
												style={styles.showWorkButton}
												onPress={() => {
													// TODO: Implement show work functionality
													console.log('Show work button pressed');
												}}
											>
												<Text style={styles.showWorkButtonText}>
													📊 Show your work
												</Text>
											</TouchableOpacity>
										)}
									</View>
								)}
								{/* Why This Tray for AI messages */}
								{!item.isUser && (traceData || performanceData) && (
									<WhyThisTray
										traceData={traceData || undefined}
										performance={performanceData || undefined}
									/>
								)}
								{/* Expand button for short responses */}
								{!item.isUser && !item.isStreaming && showExpandButton && (
									<TouchableOpacity
										style={styles.expandButton}
										onPress={handleExpand}
									>
										<Text style={styles.expandButtonText}>
											📈 Expand with more detail
										</Text>
									</TouchableOpacity>
								)}
							</View>
						);
					}}
					contentContainerStyle={styles.messagesContainer}
					ListFooterComponent={
						<View>
							{/* Contextual Insights Panel - only render when proactive mode is enabled and AI Insights feature is enabled */}
							{aiInsightsEnabled &&
								allowProactive(config) &&
								!isStreaming &&
								dataInitialized && (
									<ContextualInsightsPanel
										key={`cip-${config.mode}-${config.showProactiveCards}`}
										conversationContext={currentConversationContext}
										onInsightPress={handleInsightPress}
										onAskAboutInsight={handleAskAboutInsight}
										maxInsights={3}
									/>
								)}
							{isStreaming && !streamingMessageId && (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="small" color="#3b82f6" />
									<Text style={styles.loadingText}>AI is thinking...</Text>
								</View>
							)}
							{streamingMessageId && (
								<View style={styles.streamingContainer}>
									<ActivityIndicator size="small" color="#10b981" />
									<Text style={styles.streamingText}>AI is responding...</Text>
								</View>
							)}
							{__DEV__ && (
								<View style={styles.debugContainer}>
									<Text style={styles.debugText}>
										Debug: {debugInfo || 'No debug info'}
									</Text>
									<Text style={styles.debugText}>
										Streaming: {isStreaming ? 'true' : 'false'}
									</Text>
									<Text style={styles.debugText}>
										Streaming ID: {streamingMessageId || 'none'}
									</Text>
									<Text style={styles.debugText}>
										Session ID: {streamingRef.current.sessionId || 'none'}
									</Text>
									<Text style={styles.debugText}>
										Connected: {isStreaming ? 'true' : 'false'}
									</Text>
									<Text style={styles.debugText}>
										Connecting: {isStreaming ? 'true' : 'false'}
									</Text>
									<Text style={styles.debugText}>
										Messages: {messages.length}
									</Text>
									<Text style={styles.debugText}>
										Last message streaming:{' '}
										{messages[messages.length - 1]?.isStreaming
											? 'true'
											: 'false'}
									</Text>
									<Text style={styles.debugText}>
										Last processed: {lastProcessedMessage.substring(0, 30)}...
									</Text>
									<Text style={styles.debugText}>
										Recovery status:{' '}
										{debugInfo.includes('Recovered')
											? '✅ Recovered'
											: 'Normal'}
									</Text>
									{messages[messages.length - 1]?.buffered && (
										<Text style={styles.debugText}>
											Buffered text:{' '}
											{messages[messages.length - 1].buffered?.substring(0, 60)}
											...
										</Text>
									)}
									<TouchableOpacity
										style={styles.testButton}
										onPress={testStreaming}
									>
										<Text style={styles.testButtonText}>🧪 Test Streaming</Text>
									</TouchableOpacity>
								</View>
							)}
							{missingInfoState.isCollecting &&
								missingInfoState.chips.length > 0 && (
									<View style={styles.missingInfoContainer}>
										<MissingInfoCard
											chips={missingInfoState.chips}
											onChipPress={handleChipPress}
											onValueSubmit={handleValueSubmit}
										/>
										{missingInfoService.isComplete() && (
											<TouchableOpacity
												style={styles.completeButton}
												onPress={handleMissingInfoComplete}
											>
												<Text style={styles.completeButtonText}>
													Complete & Continue
												</Text>
											</TouchableOpacity>
										)}
									</View>
								)}
							{intentMissingInfoState.isCollecting &&
								intentMissingInfoState.chips.length > 0 && (
									<View style={styles.missingInfoContainer}>
										<IntentMissingInfoCard
											intent={intentMissingInfoState.currentIntent || 'unknown'}
											missing={intentMissingInfoState.chips.map((chip) => ({
												id: chip.id,
												label: chip.label,
												description: chip.description,
												required: chip.required,
												priority: chip.priority,
												examples: chip.examples,
												placeholder: chip.placeholder,
												inputType: chip.inputType,
												options: chip.options,
											}))}
											onSubmit={(data) => {
												console.log('Intent missing info submitted:', data);
												handleIntentMissingInfoComplete();
											}}
											onCancel={() => {
												console.log('Intent missing info cancelled');
												intentMissingInfoService.clearCollectedData();
											}}
										/>
									</View>
								)}
							{showFallback && (
								<FallbackCard
									spendPlan={fallbackData.spendPlan}
									budgets={fallbackData.budgets}
									goals={fallbackData.goals}
									lastSync={fallbackData.lastSync}
									onRetry={handleRetry}
									onRefresh={handleRefresh}
									isRetrying={isRetrying}
									showWorkButton={true}
									onShowWork={handleShowWork}
								/>
							)}
							{__DEV__ && (
								<ServiceStatusIndicator
									onRetry={handleRetry}
									isRetrying={isRetrying}
								/>
							)}
							{/* Spacer for footer input bar - accounts for FooterBar + tab bar height */}
							<View style={{ height: 100 }} />
						</View>
					}
				/>
			</KeyboardAvoidingView>

			<FooterBar style={styles.inputContainer}>
				<TextInput
					style={styles.textInput}
					value={inputText}
					onChangeText={setInputText}
					placeholder="Ask about your finances..."
					placeholderTextColor="#9ca3af"
					multiline
				/>
				<TouchableOpacity
					style={[
						styles.sendButton,
						(!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
					]}
					onPress={handleSendMessage}
					disabled={!inputText.trim() || isStreaming}
				>
					{isStreaming ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Ionicons
							name="send"
							size={20}
							color={inputText.trim() ? '#fff' : '#9ca3af'}
						/>
					)}
				</TouchableOpacity>
			</FooterBar>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	logo: { height: 30, width: 80 },
	headerCenter: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
	},
	budgetIndicator: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 2,
	},
	container: {
		flex: 1,
	},
	messagesContainer: {
		padding: 20,
		flexGrow: 1,
	},
	message: {
		maxWidth: '80%',
		marginBottom: 16,
		padding: 12,
		borderRadius: 18,
	},
	userMessage: {
		alignSelf: 'flex-end',
		backgroundColor: '#3b82f6',
		borderBottomRightRadius: 4,
	},
	aiMessage: {
		alignSelf: 'flex-start',
		backgroundColor: '#f3f4f6',
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 16,
		lineHeight: 22,
	},
	userMessageText: {
		color: '#ffffff',
	},
	aiMessageText: {
		color: '#111827',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
	textInput: {
		flex: 1,
		backgroundColor: '#f9fafb',
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		maxHeight: 100,
		marginRight: 12,
	},
	sendButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendButtonDisabled: {
		backgroundColor: '#e5e7eb',
	},
	performanceInfo: {
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	performanceText: {
		fontSize: 12,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	parallelInfo: {
		fontSize: 11,
		color: '#9ca3af',
		fontStyle: 'italic',
		marginTop: 2,
	},
	optimizationInfo: {
		fontSize: 10,
		color: '#10b981',
		fontStyle: 'italic',
		marginTop: 2,
		fontWeight: '500',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	loadingText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#6b7280',
	},
	streamingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	streamingText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#10b981',
		fontWeight: '500',
	},
	missingInfoContainer: {
		marginTop: 16,
	},
	completeButton: {
		backgroundColor: '#10b981',
		borderRadius: 8,
		padding: 12,
		marginTop: 12,
		alignItems: 'center',
	},
	completeButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	streamingCursor: {
		color: '#3b82f6',
		fontWeight: 'bold',
	},
	timeToFirstToken: {
		fontSize: 11,
		color: '#10b981',
		fontWeight: '500',
	},
	showWorkButton: {
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	showWorkButtonText: {
		color: '#374151',
		fontSize: 14,
		fontWeight: '500',
	},
	expandButton: {
		backgroundColor: '#f0f9ff',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#0ea5e9',
	},
	expandButtonText: {
		color: '#0369a1',
		fontSize: 14,
		fontWeight: '500',
	},
	debugContainer: {
		backgroundColor: '#fef3c7',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#f59e0b',
	},
	debugText: {
		fontSize: 12,
		color: '#92400e',
		fontFamily: 'monospace',
	},
	testButton: {
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		alignItems: 'center',
	},
	testButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
});
