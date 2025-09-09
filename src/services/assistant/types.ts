// Interface modes for the unified AI assistant
export type InterfaceMode = 'CHAT' | 'INSIGHTS' | 'ACTIONS' | 'ANALYTICS';

export interface Message {
	id: string;
	text: string;
	isUser: boolean;
	timestamp: Date;
	type:
		| 'text'
		| 'insight'
		| 'data'
		| 'action'
		| 'suggestion'
		| 'insight-card'
		| 'action-panel'
		| 'structured' // New type for structured responses
		| 'fallback' // New type for fallback with actionable buttons
		| 'error' // Error messages
		| 'loading' // Loading states
		| 'confirmation' // Confirmation dialogs
		| 'warning' // Warning messages
		| 'success' // Success messages
		| 'chart' // Chart visualizations
		| 'table' // Table data
		| 'list' // List data
		| 'form' // Form inputs
		| 'notification'; // System notifications
	data?: any;
	// Content classification for disclaimer requirements
	contentKind?: 'strategy' | 'analysis' | 'fact' | 'suggestion';
	showDisclaimer?: boolean;
	// Grounding information for AI responses
	groundingInfo?: {
		wasGrounded: boolean;
		confidence?: number;
		modelUsed?: string;
	};
	// Performance metrics for AI responses
	performance?: {
		responseTime?: number;
		tokenCount?: number;
		modelTier?: 'mini' | 'std' | 'pro';
		cost?: number;
		processingSteps?: string[];
	};
	// Evidence and sources for AI responses
	evidence?: string[];
	// Error handling
	error?: {
		message: string;
		type?:
			| 'connectivity'
			| 'missing_info'
			| 'system'
			| 'auth'
			| 'rate_limit'
			| 'validation'
			| 'permission'
			| 'timeout'
			| 'server_error';
		retryable?: boolean;
		retryCount?: number;
		timestamp?: Date;
	};
	// Structured response data
	structuredResponse?: {
		message: string;
		details?: string;
		cards?: {
			type:
				| 'balance'
				| 'budget'
				| 'subscriptions'
				| 'forecast'
				| 'spending'
				| 'savings'
				| 'goals'
				| 'alerts'
				| 'insights'
				| 'comparison'
				| 'trends';
			data: any;
			title?: string;
			subtitle?: string;
			icon?: string;
			priority?: 'high' | 'medium' | 'low';
			interactive?: boolean;
		}[];
		actions?: {
			label: string;
			action:
				| 'OPEN_BUDGETS'
				| 'CREATE_RULE'
				| 'ADJUST_LIMIT'
				| 'VIEW_RECURRING'
				| 'CONNECT_ACCOUNT'
				| 'PICK_TIME_WINDOW'
				| 'MARK_PAID'
				| 'SET_LIMIT'
				| 'VIEW_TRANSACTIONS'
				| 'CREATE_GOAL'
				| 'UPDATE_GOAL'
				| 'DELETE_GOAL'
				| 'EXPORT_DATA'
				| 'SHARE_INSIGHT'
				| 'SCHEDULE_REMINDER'
				| 'CONTACT_SUPPORT'
				| 'UPGRADE_PLAN'
				| 'VIEW_ANALYTICS'
				| 'SET_ALERT'
				| 'MANAGE_SUBSCRIPTIONS';
			params?: any;
			priority?: 'high' | 'medium' | 'low';
			icon?: string;
			disabled?: boolean;
		}[];
		sources?: {
			kind: 'cache' | 'localML' | 'db' | 'gpt';
			note?: string;
		}[];
		cost?: { model: 'mini' | 'std' | 'pro'; estTokens: number };
		// Fallback information
		fallback?: {
			status: string;
			tinyFact?: string;
			actions: {
				label: string;
				action:
					| 'CONNECT_ACCOUNT'
					| 'OPEN_BUDGET'
					| 'PICK_TIME_WINDOW'
					| 'CREATE_RULE'
					| 'MARK_PAID'
					| 'SET_LIMIT'
					| 'VIEW_TRANSACTIONS'
					| 'CREATE_GOAL'
					| 'UPDATE_GOAL'
					| 'DELETE_GOAL'
					| 'EXPORT_DATA'
					| 'SHARE_INSIGHT'
					| 'SCHEDULE_REMINDER'
					| 'CONTACT_SUPPORT'
					| 'UPGRADE_PLAN'
					| 'VIEW_ANALYTICS'
					| 'SET_ALERT'
					| 'MANAGE_SUBSCRIPTIONS';
				payload?: any;
				priority?: 'high' | 'medium' | 'low';
				icon?: string;
				disabled?: boolean;
			}[];
			evidence?: { factIds: string[] };
			timeWindow: { start: string; end: string; tz: string };
		};
	};
	// Hybrid cost optimization information
	hybridOptimization?: {
		modelTier: 'mini' | 'std' | 'pro';
		totalTokens: number;
		totalCost: number;
		costSavings: {
			savings: number;
			percentage: number;
		};
		steps: {
			step: string;
			description: string;
			modelUsed: 'mini' | 'std' | 'pro';
			tokenCount: number;
			cost: number;
		}[];
	};
}

// Additional utility types for the assistant system
export interface MessageMetadata {
	id: string;
	conversationId?: string;
	threadId?: string;
	parentMessageId?: string;
	userId?: string;
	sessionId?: string;
	createdAt: Date;
	updatedAt?: Date;
	version?: number;
	tags?: string[];
	flags?: {
		isPinned?: boolean;
		isArchived?: boolean;
		isImportant?: boolean;
		requiresReview?: boolean;
	};
}

export interface MessageFeedback {
	messageId: string;
	userId: string;
	rating: 'thumbs_up' | 'thumbs_down' | 'neutral';
	feedback?: string;
	categories?: string[];
	timestamp: Date;
}

export interface MessageAnalytics {
	messageId: string;
	views: number;
	interactions: number;
	timeSpent: number;
	actionsTaken: number;
	conversionRate?: number;
	lastViewed?: Date;
}

export interface ConversationContext {
	userId: string;
	sessionId: string;
	conversationId: string;
	threadId?: string;
	context: {
		financialProfile?: {
			monthlyIncome?: number;
			financialGoals?: string[];
			riskProfile?: 'conservative' | 'moderate' | 'aggressive';
			investmentExperience?: 'beginner' | 'intermediate' | 'advanced';
		};
		preferences?: {
			language?: string;
			currency?: string;
			timezone?: string;
			notifications?: boolean;
		};
		recentTopics?: string[];
		activeGoals?: string[];
		recentActions?: string[];
	};
	metadata: {
		startTime: Date;
		lastActivity: Date;
		messageCount: number;
		userSatisfaction?: number;
	};
}

export interface AssistantCapabilities {
	features: {
		chat: boolean;
		insights: boolean;
		actions: boolean;
		analytics: boolean;
		forecasting: boolean;
		goalTracking: boolean;
		budgetManagement: boolean;
		investmentAdvice: boolean;
		transactionAnalysis: boolean;
		subscriptionManagement: boolean;
	};
	limits: {
		maxMessagesPerDay?: number;
		maxTokensPerRequest?: number;
		maxFileSize?: number;
		rateLimitPerMinute?: number;
	};
	permissions: {
		canAccessTransactions: boolean;
		canAccessBudgets: boolean;
		canAccessGoals: boolean;
		canCreateRules: boolean;
		canModifySettings: boolean;
		canExportData: boolean;
	};
}

export interface MessageTemplate {
	id: string;
	name: string;
	description: string;
	category:
		| 'greeting'
		| 'insight'
		| 'action'
		| 'error'
		| 'confirmation'
		| 'warning';
	template: string;
	variables?: string[];
	conditions?: {
		userType?: 'free' | 'premium' | 'enterprise';
		context?: string[];
		timeOfDay?: 'morning' | 'afternoon' | 'evening';
	};
	metadata: {
		createdAt: Date;
		updatedAt: Date;
		usageCount: number;
		effectiveness?: number;
	};
}
