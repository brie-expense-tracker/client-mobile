import React, { useState, useEffect } from 'react';
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
import {
	OrchestratorAIService,
	OrchestratorAIResponse,
} from '../../../src/services/feature/orchestratorAIService';
import { useProfile } from '../../../src/context/profileContext';
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
	useMessagesReducer,
	Message,
} from '../../../src/hooks/useMessagesReducer';
import { useBulletproofStream } from '../../../src/hooks/useBulletproofStream';
import { modeStateService } from '../../../src/services/assistant/modeStateService';

export default function AssistantScreen() {
	const router = useRouter();
	const { profile } = useProfile();

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
	} = useMessagesReducer(initialMessages);

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

	// Mode state management
	const [modeState, setModeState] = useState(modeStateService.getState());

	// Use the streaming hook
	const { startStream, stopStream, isStreaming } = useBulletproofStream({
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

	// Initialize orchestrator service when profile is available
	useEffect(() => {
		if (profile) {
			// Create a basic financial context from profile data
			const financialContext = {
				profile: {
					monthlyIncome: profile.monthlyIncome || 0,
					savings: profile.savings || 0,
					debt: profile.debt || 0,
					expenses:
						(profile.expenses as unknown as Record<string, number>) || {},
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
		}
	}, [profile]);

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

	// Debug: Track messages state changes
	useEffect(() => {
		console.log('📊 [Assistant] Messages state changed:', {
			count: messages.length,
			lastMessage: messages[messages.length - 1]
				? {
						id: messages[messages.length - 1].id,
						isUser: messages[messages.length - 1].isUser,
						isStreaming: messages[messages.length - 1].isStreaming,
						textLength: messages[messages.length - 1].text?.length || 0,
						streamingTextLength:
							messages[messages.length - 1].streamingText?.length || 0,
				  }
				: null,
			streamingMessageId,
			isStreaming,
			allMessageIds: messages.map((m) => m.id),
		});
	}, [messages, streamingMessageId, isStreaming]);

	// Enhanced debugging for stream state
	useEffect(() => {
		const debugStreamState = () => {
			const streamingMessages = messages.filter((m) => m.isStreaming);
			const lastMessage = messages[messages.length - 1];

			console.log('🔍 [STREAM DEBUG] Current state:', {
				totalMessages: messages.length,
				streamingCount: streamingMessages.length,
				streamingMessageIds: streamingMessages.map((m) => m.id),
				currentStreamingId: streamingMessageId,
				isStreaming,
				lastMessageId: lastMessage?.id,
				lastMessageIsStreaming: lastMessage?.isStreaming,
				lastMessageText: lastMessage?.text?.substring(0, 50) + '...',
				lastMessageStreamingText:
					lastMessage?.streamingText?.substring(0, 50) + '...',
				sessionId: streamingRef.current.sessionId,
			});
		};

		// Log every 2 seconds when debugging
		const interval = setInterval(debugStreamState, 2000);
		return () => clearInterval(interval);
	}, [messages, streamingMessageId, isStreaming, streamingRef]);

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
		console.log('🚀 [Assistant] ===== STARTING MESSAGE SEND =====');
		console.log('🚀 [Assistant] Input text:', inputText.trim());
		console.log('🚀 [Assistant] Input text length:', inputText.trim().length);
		console.log('🚀 [Assistant] Current loading state:', isStreaming);
		console.log('🚀 [Assistant] Current messages count:', messages.length);
		console.log(
			'🚀 [Assistant] Current streaming message ID:',
			streamingMessageId
		);

		// Enhanced validation and recovery
		if (!inputText.trim()) {
			console.log('🚀 [Assistant] Early return - empty input');
			return;
		}

		// Prevent duplicate message processing
		const trimmedInput = inputText.trim();
		if (lastProcessedMessage === trimmedInput) {
			console.warn(
				'🚨 [Assistant] Duplicate message detected, ignoring:',
				trimmedInput
			);
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
					// 10 seconds
					console.warn(
						'🚨 [Assistant] Detected stuck streaming state, recovering...'
					);
					console.warn('🚨 [Assistant] Streaming message:', {
						id: streamingMessage.id,
						text: streamingMessage.text?.substring(0, 100),
						streamingText: streamingMessage.streamingText?.substring(0, 100),
						timeSinceLastUpdate,
					});

					// Force clear streaming state
					clearStreaming();
					stopStream();
					setDebugInfo('Recovered from stuck streaming state');
				}
			}
		}

		if (isStreaming) {
			console.log('🚀 [Assistant] Early return - already streaming');
			return;
		}

		// Transition to thinking mode
		modeStateService.transitionTo('thinking', 'user input received');

		// Add user message using reducer
		const userMessageId = addUserMessage(trimmedInput);
		console.log('🚀 [Assistant] Created user message with ID:', userMessageId);

		// Track this message to prevent duplicates
		setLastProcessedMessage(trimmedInput);

		const currentInput = trimmedInput;
		setInputText('');
		setShowFallback(false);
		setTraceData(null);
		setPerformanceData(null);

		console.log('🚀 [Assistant] Cleared input, starting stream');

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

		// Create streaming AI message using reducer
		const aiMessageId = (Date.now() + 1).toString();
		console.log(
			'🤖 [Assistant] About to create AI message with ID:',
			aiMessageId
		);
		console.log(
			'🤖 [Assistant] Current messages before adding AI placeholder:',
			messages.length
		);

		addAIPlaceholder(aiMessageId);

		// Transition to processing mode
		modeStateService.transitionTo('processing', 'AI processing started');

		console.log('🤖 [Assistant] Created AI message with ID:', aiMessageId);
		console.log(
			'🤖 [Assistant] Current messages after adding AI placeholder:',
			messages.length
		);

		// Set up UI timeout to detect stuck states with better recovery
		const timeout = setTimeout(() => {
			console.warn('🚨 [Assistant] UI timeout - stream may be stuck');
			console.warn('🚨 [Assistant] Current streaming state:', isStreaming);
			console.warn(
				'🚨 [Assistant] Current streaming message ID:',
				streamingMessageId
			);
			console.warn('🚨 [Assistant] Messages count:', messages.length);

			// Check if we have a streaming message that's been stuck
			const streamingMessage = messages.find(
				(m) => m.id === streamingMessageId
			);
			if (streamingMessage && streamingMessage.isStreaming) {
				console.warn('🚨 [Assistant] Forcing completion of stuck message:', {
					id: streamingMessage.id,
					text: streamingMessage.text?.substring(0, 100),
					streamingText: streamingMessage.streamingText?.substring(0, 100),
				});

				// Force finalize the message with whatever content we have
				finalizeMessage(
					streamingMessage.id,
					streamingMessage.streamingText ||
						streamingMessage.text ||
						'Response incomplete due to timeout',
					streamingMessage.performance
				);
			}

			setDebugInfo('UI timeout - stream completed with timeout');
			stopStream();
			clearStreaming();
		}, 30000); // 30 second timeout (reduced from 45)
		setUiTimeout(timeout as any);

		console.log('🌊 [Assistant] Starting streaming with new hook');
		console.log('🌊 [Assistant] Current input:', currentInput);
		console.log('🌊 [Assistant] Target AI message ID:', aiMessageId);

		// Wait a moment to ensure the message is properly added to the state
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify the message was added by checking the current state
		// We need to use a different approach since messages might be stale in closure
		console.log('🔍 [Assistant] Message verification after delay:', {
			aiMessageId,
			totalMessages: messages.length,
			messageIds: messages.map((m) => m.id),
		});

		// Instead of checking if message exists, we'll let the streaming hook handle it
		// and provide better error handling there

		try {
			await startStream(
				currentInput,
				{
					onMeta: (data) => {
						console.log('[Assistant] Meta event received:', data);
						setDebugInfo(`Meta: ${JSON.stringify(data).substring(0, 100)}...`);
						if (data.timeToFirstToken) {
							console.log(
								'[Assistant] Time to first token:',
								data.timeToFirstToken + 'ms'
							);
						}
					},
					onDelta: (data, bufferedText) => {
						// Transition to streaming mode on first delta
						if (modeStateService.getState().current !== 'streaming') {
							modeStateService.transitionTo(
								'streaming',
								'first delta received'
							);
						}

						console.log('🔥 [Assistant] Delta received:', {
							textLength: data.text?.length || 0,
							bufferedLength: bufferedText.length,
							messageId: aiMessageId,
						});
						setDebugInfo(
							`Delta: ${bufferedText.length} chars - "${bufferedText.substring(
								0,
								50
							)}..."`
						);
					},
					onFinal: (data) => {
						console.log('🏁 [Assistant] Final received:', {
							responseLength: data.response?.length || 0,
							messageId: aiMessageId,
						});
						setPerformanceData(data.performance);
					},
					onTrace: (data) => {
						console.log('[Assistant] Trace event:', data);
						setTraceData(data);
					},
					onDone: () => {
						// Transition to idle mode on completion
						modeStateService.transitionTo('idle', 'stream completed');

						console.log('✅ [Assistant] Stream completed');
						console.log('✅ [Assistant] Finalizing message:', aiMessageId);
						console.log(
							'✅ [Assistant] Current streaming message ID:',
							streamingMessageId
						);

						// Find the correct message to finalize - use the streaming message ID if available
						const messageIdToFinalize = streamingMessageId || aiMessageId;
						const currentMessage = messages.find(
							(m) => m.id === messageIdToFinalize
						);

						console.log(
							'✅ [Assistant] Looking for message:',
							messageIdToFinalize
						);
						console.log(
							'✅ [Assistant] Found message:',
							currentMessage ? 'Yes' : 'No'
						);

						if (currentMessage) {
							console.log(
								'✅ [Assistant] Finalizing streaming message with content:',
								{
									id: currentMessage.id,
									text: currentMessage.text?.substring(0, 100),
									streamingText: currentMessage.streamingText?.substring(
										0,
										100
									),
									isStreaming: currentMessage.isStreaming,
								}
							);

							// Use the streaming text if available, otherwise use the text
							const finalText =
								currentMessage.streamingText &&
								currentMessage.streamingText.length > 0
									? currentMessage.streamingText
									: currentMessage.text ||
									  'Response received but content not found';

							console.log(
								'✅ [Assistant] Final text to use:',
								finalText.substring(0, 100)
							);
							finalizeMessage(
								messageIdToFinalize,
								finalText,
								currentMessage.performance
							);
						} else {
							console.error(
								'🚨 [Assistant] Could not find message to finalize:',
								messageIdToFinalize
							);
							console.error(
								'🚨 [Assistant] Available message IDs:',
								messages.map((m) => m.id)
							);
						}

						setDebugInfo('Stream completed');
						clearStreaming();

						// Reset duplicate prevention after successful completion
						setTimeout(() => {
							setLastProcessedMessage('');
						}, 1000);

						if (uiTimeout) {
							clearTimeout(uiTimeout);
							setUiTimeout(null);
						}
					},
					onError: (error) => {
						// Transition to error mode
						modeStateService.transitionTo('error', `stream error: ${error}`);

						console.error('[Assistant] Stream error:', error);
						setError(aiMessageId, error);
						setShowFallback(true);
						loadFallbackData();
						// Don't clear streaming state - let the message show the error
						// clearStreaming();

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
				{ messageId: aiMessageId }
			);
		} catch (error) {
			console.error('💥 [Assistant] Error starting stream:', error);
			setError(aiMessageId, 'Failed to start stream');
			setShowFallback(true);
			await loadFallbackData();
			clearStreaming();

			if (uiTimeout) {
				clearTimeout(uiTimeout);
				setUiTimeout(null);
			}
		}

		console.log('🏁 [Assistant] ===== MESSAGE SEND COMPLETED =====');
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
				setInputText(lastUserMessage.text);
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

	return (
		<SafeAreaView style={styles.safeArea}>
			<DevHud modeState={modeState} />
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.push('/(stack)/settings/aiInsights')}
				>
					<Ionicons name="settings-outline" size={24} color="#374151" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>AI Assistant</Text>
				<View style={{ width: 24 }} />
			</View>

			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<FlatList
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => {
						// Debug logging for message rendering
						if (!item.isUser) {
							console.log(`🎨 [Assistant] Rendering AI message ${item.id}:`, {
								isStreaming: item.isStreaming,
								text: item.text,
								streamingText: item.streamingText,
								displayText: item.isStreaming ? item.streamingText : item.text,
								textLength: item.text?.length || 0,
								streamingTextLength: item.streamingText?.length || 0,
							});
						}

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
									{item.isStreaming ? item.streamingText : item.text}
									{item.isStreaming && (
										<Text style={styles.streamingCursor}>|</Text>
									)}
								</Text>
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
							</View>
						);
					}}
					contentContainerStyle={styles.messagesContainer}
					ListFooterComponent={
						<View>
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
									{messages[messages.length - 1]?.streamingText && (
										<Text style={styles.debugText}>
											Streaming text:{' '}
											{messages[messages.length - 1].streamingText?.substring(
												0,
												60
											)}
											...
										</Text>
									)}
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
							<ServiceStatusIndicator
								onRetry={handleRetry}
								isRetrying={isRetrying}
							/>
						</View>
					}
				/>

				<View style={styles.inputContainer}>
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
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
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
		padding: 20,
		paddingBottom: Platform.OS === 'ios' ? 34 : 20,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
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
});
