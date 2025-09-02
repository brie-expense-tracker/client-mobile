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
		| 'fallback'; // New type for fallback with actionable buttons
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
	// Structured response data
	structuredResponse?: {
		message: string;
		details?: string;
		cards?: Array<{
			type: 'balance' | 'budget' | 'subscriptions' | 'forecast';
			data: any;
		}>;
		actions?: Array<{
			label: string;
			action:
				| 'OPEN_BUDGETS'
				| 'CREATE_RULE'
				| 'ADJUST_LIMIT'
				| 'VIEW_RECURRING'
				| 'CONNECT_ACCOUNT'
				| 'PICK_TIME_WINDOW'
				| 'MARK_PAID'
				| 'SET_LIMIT';
			params?: any;
		}>;
		sources?: Array<{
			kind: 'cache' | 'localML' | 'db' | 'gpt';
			note?: string;
		}>;
		cost?: { model: 'mini' | 'std' | 'pro'; estTokens: number };
		// Fallback information
		fallback?: {
			status: string;
			tinyFact?: string;
			actions: Array<{
				label: string;
				action:
					| 'CONNECT_ACCOUNT'
					| 'OPEN_BUDGET'
					| 'PICK_TIME_WINDOW'
					| 'CREATE_RULE'
					| 'MARK_PAID'
					| 'SET_LIMIT';
				payload?: any;
			}>;
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
		steps: Array<{
			step: string;
			description: string;
			modelUsed: 'mini' | 'std' | 'pro';
			tokenCount: number;
			cost: number;
		}>;
	};
}
