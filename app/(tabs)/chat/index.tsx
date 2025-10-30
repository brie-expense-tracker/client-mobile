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
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	OrchestratorAIService,
	OrchestratorAIResponse,
} from '../../../src/services/feature/orchestratorAIService';
import { useProfile } from '../../../src/context/profileContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useRecurringExpense } from '../../../src/context/recurringExpenseContext';
import { MissingInfoChip } from '../../../src/components/assistant/cards/MissingInfoCard';
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
import { createLogger } from '../../../src/utils/sublogger';

const chatScreenLog = createLogger('ChatScreen');
import {
	FallbackService,
	CachedSpendPlan,
	CachedBudget,
	CachedGoal,
} from '../../../src/services/resilience/fallbackService';
import { TraceEventData } from '../../../src/services/feature/enhancedStreamingService';
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
import ChatComposer from './components/ChatComposer';

// New components
import { MessagesList } from './_components/MessagesList';
import { AssistantListFooter } from './_components/AssistantListFooter';
import { useComposerHeight } from '../../../src/hooks/useComposerHeight';
import { isDevMode } from '../../../src/config/environment';

export default function ChatScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [composerH, onComposerLayout] = useComposerHeight(56);
	const { profile } = useProfile();
	const { budgets } = useBudget();
	const aiInsightsEnabled = useFeature('aiInsights');
	const { goals } = useGoal() as { goals: any[] };
	const { transactions } = useContext(TransactionContext) as {
		transactions: any[];
	};
	const { expenses: recurringExpenses } = useRecurringExpense();

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
			if (isDevMode) {
				chatScreenLog.debug('Chat config event received', { newConfig });
			}
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
			if (isDevMode) {
				chatScreenLog.debug('Legacy AI insights event received', {
					enabled,
				});
			}
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
		if (isDevMode) {
			chatScreenLog.debug('Chat config changed', {
				config,
				hasProfile: !!profile,
				isPersonalizationOn: isPersonalizationOn(config),
				allowProactive: allowProactive(config),
				timestamp: new Date().toISOString(),
			});
		}
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
		if (isDevMode) {
			chatScreenLog.debug('Messages state changed', {
				count: messages.length,
				ids: messages.map((m) => ({
					id: m.id,
					isUser: m.isUser,
					isStreaming: m.isStreaming,
				})),
				timestamp: new Date().toISOString(),
			});
		}
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

			if (isDevMode) {
				chatScreenLog.debug(
					'[Chat] Loaded insights context and data with config:',
					config
				);
			}
		} catch (error) {
			chatScreenLog.error('Failed to load insights context', error);
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
			recurringExpenses: [],
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
		recurringExpenses,
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
		if (isDevMode) {
			chatScreenLog.debug('Config change effect triggered', {
				config,
				personalizationEnabled,
				willClearContext: !personalizationEnabled,
			});
		}

		if (!personalizationEnabled) {
			if (isDevMode) {
				chatScreenLog.debug(
					'🧹 [DEBUG] Clearing insights context and conversation context'
				);
			}
			insightsService.clearInsights(); // Wipe any lingering context/insights
			setCurrentConversationContext(''); // Clear conversation-derived context
		}
	}, [config, insightsService]);

	// Track critical state changes only
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (lastMessage && lastMessage.isStreaming) {
			if (isDevMode) {
				chatScreenLog.debug(
					'🔄 [Chat] Stream started for message:',
					lastMessage.id
				);
			}
		} else if (lastMessage && !lastMessage.isStreaming && lastMessage.text) {
			if (isDevMode) {
				chatScreenLog.debug('✅ [Chat] Message completed:', {
					id: lastMessage.id,
					length: lastMessage.text.length,
					isUser: lastMessage.isUser,
				});
			}
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
			chatScreenLog.error('Failed to load fallback data', error);
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
		chatScreenLog.debug('Chip pressed', { label: chip.label });
	};

	// Handle missing info value submission
	const handleValueSubmit = (chipId: string, value: string) => {
		missingInfoService.submitValue(chipId, value);
		chatScreenLog.debug('Value submitted', { chipId, value });
	};

	// Handle intent missing info value submission (currently unused but kept for future use)
	// const handleIntentValueSubmit = (chipId: string, value: string) => {
	// 	intentMissingInfoService.submitValue(chipId, value);
	// 	chatScreenLog.debug('Intent value submitted:', chipId, value);
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
				chatScreenLog.warn(
					'Intent sufficiency check had error, proceeding anyway',
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
			chatScreenLog.error('Error checking intent sufficiency', error);
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
		chatScreenLog.debug('Missing info collection complete', { collectedData });

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
			chatScreenLog.error('Error processing collected data', error);
		}
	};

	// Handle completion of intent missing info collection
	const handleIntentMissingInfoComplete = async () => {
		if (!orchestratorService) return;

		const collectedData = intentMissingInfoService.getCollectedDataForAPI();
		chatScreenLog.debug('Intent missing info collection complete', {
			collectedData,
		});

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
			chatScreenLog.error('Error processing collected data', error);
		}
	};

	// Helper function to bridge ChatComposer with existing handleSendMessage
	const sendFromComposer = async (text: string) => {
		// Set the input text temporarily for handleSendMessage to use
		setInputText(text);
		// Call handleSendMessage which will clear inputText after processing
		await handleSendMessage();
	};

	const handleSendMessage = async () => {
		const trimmedInput = inputText.trim();

		// Enhanced validation and recovery
		if (!trimmedInput) {
			return;
		}

		// Prevent duplicate message processing
		if (lastProcessedMessage === trimmedInput) {
			chatScreenLog.warn('Duplicate message detected, ignoring');
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
					chatScreenLog.warn('Stuck stream detected, recovering', {
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
		if (isDevMode) {
			chatScreenLog.debug('User message added', { userMessageId });
		}

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
			chatScreenLog.info(
				'🤖 [Chat] Added missing info message with ID:',
				missingInfoMessageId
			);
			return;
		}

		// Create streaming AI message using reducer with proper synchronization
		let aiMessageId = (Date.now() + 1).toString();
		if (isDevMode) {
			chatScreenLog.debug(
				'🔍 [DEBUG] Creating AI placeholder with ID:',
				aiMessageId
			);
		}

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
				chatScreenLog.debug(
					`🔍 [DEBUG] Verification attempt ${attempts}/${maxAttempts} for message:`,
					aiMessageId,
					'Available IDs:',
					messagesRef.current.map((m) => m.id)
				);
			}
		}

		if (!verifyMessage) {
			chatScreenLog.error(
				'🚨 [Chat] Message not found after adding placeholder:',
				{
					aiMessageId,
					availableIds: messagesRef.current.map((m) => m.id),
					attempts,
				}
			);

			// Try one more time with a new ID
			const newAiMessageId = (Date.now() + 2).toString();
			if (isDevMode) {
				chatScreenLog.debug(
					'🔄 [Chat] Creating new message with ID:',
					newAiMessageId
				);
			}

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
				chatScreenLog.error('🚨 [Chat] Message creation failed, aborting');
				return;
			}

			// Update the aiMessageId to use the new one
			aiMessageId = newAiMessageId;
		}

		chatScreenLog.debug(
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

			chatScreenLog.warn(
				'🚨 [Chat] UI fallback timeout after 3m (stream layer should have handled this)',
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

		if (isDevMode) {
			chatScreenLog.debug(
				'🚀 [Chat] Starting stream for message:',
				aiMessageId
			);
		}

		// Ensure the streaming ref is set to the correct message ID and sessionId
		streamingRef.current.messageId = aiMessageId;
		if (!streamingRef.current.sessionId) {
			streamingRef.current.sessionId = `session_${Date.now()}`;
		}
		if (isDevMode) {
			chatScreenLog.debug(
				'🔍 [DEBUG] Set streamingRef.messageId to:',
				aiMessageId
			);
			chatScreenLog.debug(
				'🔍 [DEBUG] Set streamingRef.sessionId to:',
				streamingRef.current.sessionId
			);
			chatScreenLog.debug(
				'🔍 [DEBUG] Current messages before streaming:',
				messages.map((m) => ({
					id: m.id,
					isUser: m.isUser,
					isStreaming: m.isStreaming,
				}))
			);
		}

		try {
			if (isDevMode) {
				chatScreenLog.debug('🔍 [DEBUG] About to call startStream with:', {
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

				chatScreenLog.debug('🚀 [Chat] Calling startStream function...');
			}
			await startStream(
				enhancedInput,
				{
					onMeta: (data) => {
						if (data.timeToFirstToken) {
							chatScreenLog.debug(
								'⚡ [Chat] First token received:',
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

						if (isDevMode) {
							chatScreenLog.debug(
								'[CALLBACK onDelta] len=',
								data.text?.length || 0
							);
							chatScreenLog.debug('📝 [Chat] Stream delta received:', {
								chars: bufferedText.length,
								messageId: aiMessageId,
								deltaText: data.text?.substring(0, 50) + '...',
								fullBufferedText: bufferedText.substring(0, 100) + '...',
							});
						}

						// Ensure we're updating the correct message using the ref
						const targetMessage = messagesRef.current.find(
							(m) => m.id === aiMessageId
						);
						if (!targetMessage) {
							chatScreenLog.error(
								'🚨 [Chat] Target message not found during delta:',
								{
									aiMessageId,
									availableIds: messagesRef.current.map((m) => m.id),
								}
							);

							// Try to create the message if it doesn't exist
							if (isDevMode) {
								chatScreenLog.debug(
									'🔄 [Chat] Creating missing message for delta'
								);
							}
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
						if (isDevMode) {
							chatScreenLog.debug('✅ [Chat] Stream completed:', {
								responseLength: data.response?.length || 0,
								messageId: aiMessageId,
							});
						}
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
						if (isDevMode) {
							chatScreenLog.debug('🔍 [DEBUG] Finalization state:', {
								streamingMessageId,
								aiMessageId,
								availableMessages: messagesRef.current.map((m) => ({
									id: m.id,
									isUser: m.isUser,
									isStreaming: m.isStreaming,
									hasBufferedText: !!(m.buffered && m.buffered.length > 0),
								})),
							});
						}

						// Find the correct message to finalize - prioritize the AI message ID
						const messageIdToFinalize = aiMessageId; // Use the AI message ID we created
						let currentMessage = messagesRef.current.find(
							(m) => m.id === messageIdToFinalize
						);

						if (!currentMessage) {
							chatScreenLog.error(
								'🚨 [Chat] Message not found for finalization:',
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
								if (isDevMode) {
									chatScreenLog.debug(
										'🔄 [Chat] Recovery: Found streaming message:',
										streamingMessage.id
									);
								}
								currentMessage = streamingMessage;
							} else {
								// Last resort: create a new message with the buffered text
								if (isDevMode) {
									chatScreenLog.debug('🔄 [Chat] Creating recovery message');
								}
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

						if (isDevMode) {
							chatScreenLog.debug('✅ [Chat] Finalizing message:', {
								id: messageIdToFinalize,
								length: finalText.length,
								hasContent: finalText.length > 0,
								bufferedLength: currentMessage.buffered?.length || 0,
								textLength: currentMessage.text?.length || 0,
							});
						}

						finalizeMessage(
							messageIdToFinalize,
							finalText,
							currentMessage.performance
						);

						setDebugInfo('Stream completed');

						// Clear streaming state with safety check
						if (isDevMode) {
							chatScreenLog.debug('🔍 [DEBUG] Clearing streaming state');
						}
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

						chatScreenLog.error('🚨 [Chat] Stream failed:', {
							error,
							messageId: aiMessageId,
							streamingState: isStreaming,
							timeout: !!uiTimeout,
						});

						if (isDevMode) {
							chatScreenLog.debug('🔍 [DEBUG] Error state:', {
								aiMessageId,
								availableMessages: messagesRef.current.map((m) => ({
									id: m.id,
									isUser: m.isUser,
									isStreaming: m.isStreaming,
									hasBufferedText: !!(m.buffered && m.buffered.length > 0),
								})),
							});
						}

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

			if (isDevMode) {
				chatScreenLog.debug('✅ [Chat] Stream call completed successfully');
			}
		} catch (error) {
			chatScreenLog.error('💥 [Chat] Failed to start stream:', {
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
			chatScreenLog.error('[Chat] Retry failed:', error);
		} finally {
			setIsRetrying(false);
		}
	};

	// Handle refresh of fallback data
	const handleRefresh = async () => {
		await loadFallbackData();
	};

	// Handle insight press
	const handleInsightPress = (insight: Insight) => {
		chatScreenLog.info('Insight pressed:', insight.title);

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
	const handleAskAboutInsight = async (insight: Insight) => {
		chatScreenLog.info('Ask about insight:', insight.title);

		// Create a contextual question about the insight
		const question = `Can you help me understand this insight: "${insight.title}" - ${insight.message}`;

		// Update conversation context
		setCurrentConversationContext(`${insight.title} ${insight.message}`);

		// Send directly without setTimeout
		await sendFromComposer(question);
	};

	// Handle expand button
	const handleExpand = async () => {
		const lastMessage = messages[messages.length - 1];
		if (lastMessage && !lastMessage.isUser) {
			// Re-send the last user message with expand flag
			const userMessages = messages.filter((m) => m.isUser);
			const lastUserMessage = userMessages[userMessages.length - 1];

			if (lastUserMessage) {
				setShowExpandButton(true); // Keep expand button visible to pass the flag
				// Send directly without setTimeout
				await sendFromComposer(lastUserMessage.text || '');
			}
		}
	};

	// Test streaming function
	const testStreaming = async () => {
		chatScreenLog.debug('🧪 [Test] Starting streaming test');
		const testUrl = buildTestSseUrl();

		try {
			startStreaming({
				url: testUrl,
				token: 'test-token',
				onDelta: (text: string) => {
					chatScreenLog.debug('🧪 [Test] Received delta:', text);
					// Add test message to chat
					const testMessageId = (Date.now() + 1).toString();
					addAIPlaceholder(testMessageId);
					addDelta(testMessageId, text);
				},
				onDone: () => {
					chatScreenLog.debug('🧪 [Test] Stream completed');
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
					chatScreenLog.error('🧪 [Test] Stream error:', error);
					setError('test', error);
				},
				onMeta: (data: any) => {
					chatScreenLog.debug('🧪 [Test] Meta data:', data);
				},
			});
		} catch (error) {
			chatScreenLog.error('🧪 [Test] Failed to start test stream:', error);
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
						contentFit="contain"
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

			<View style={styles.container}>
				<MessagesList
					messages={messages}
					streamingMessageId={streamingMessageId}
					traceData={traceData}
					performanceData={performanceData}
					showExpandButton={showExpandButton}
					onExpandPress={handleExpand}
					contentPaddingBottom={composerH + insets.bottom + 12}
				>
					<AssistantListFooter
						aiInsightsEnabled={aiInsightsEnabled}
						allowProactive={allowProactive(config)}
						isStreaming={isStreaming}
						hasStreamingId={!!streamingMessageId}
						dataInitialized={dataInitialized}
						conversationContext={currentConversationContext}
						onInsightPress={handleInsightPress}
						onAskAboutInsight={handleAskAboutInsight}
						debugInfo={debugInfo}
						streamingRef={streamingRef}
						messagesCount={messages.length}
						lastProcessedMessage={lastProcessedMessage}
						onTestStreaming={testStreaming}
						showFallback={showFallback}
						fallbackData={fallbackData}
						onRetry={handleRetry}
						onRefresh={handleRefresh}
						isRetrying={isRetrying}
						showServiceStatus={__DEV__}
						onMissingInfoComplete={handleMissingInfoComplete}
						onIntentMissingInfoComplete={handleIntentMissingInfoComplete}
						missingInfoState={missingInfoState}
						intentMissingInfoState={intentMissingInfoState}
						onChipPress={handleChipPress}
						onValueSubmit={handleValueSubmit}
					/>
				</MessagesList>
			</View>

			{/* KeyboardAvoidingView only around the footer/composer */}
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'position' : undefined}
				keyboardVerticalOffset={0}
			>
				<View onLayout={onComposerLayout}>
					<FooterBar style={styles.inputContainer}>
						<ChatComposer onSend={sendFromComposer} isSending={isStreaming} />
					</FooterBar>
				</View>
			</KeyboardAvoidingView>
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
	budgetIndicator: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 2,
	},
	container: {
		flex: 1,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
});
