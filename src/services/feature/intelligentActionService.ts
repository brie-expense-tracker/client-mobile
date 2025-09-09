// Stub service for IntelligentActionService - was removed during reorganization
// This provides the expected interface to prevent import errors

export interface IntelligentAction {
	id?: string;
	_id?: string;
	type: string;
	title: string;
	description: string;
	priority: 'low' | 'medium' | 'high';
	executed: boolean;
	insightId?: string;
	period?: string;
	metadata?: any;
	// Additional properties used in the component
	parameters?: Record<string, any>;
	requiresConfirmation?: boolean;
	executedAt?: string;
	error?: string;
	completionDetails?: {
		reason: string;
		message: string;
		timestamp?: string;
	};
	detectionType?: string;
	detectionCriteria?: Record<string, any>;
}

export interface ActionExecutionResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

export class IntelligentActionService {
	static async getUserActions(options: {
		limit: number;
		includeCompleted: boolean;
	}): Promise<IntelligentAction[]> {
		console.warn(
			'IntelligentActionService.getUserActions called - stub implementation'
		);
		return [];
	}

	static async analyzeInsightForActions(
		insight: any
	): Promise<IntelligentAction[]> {
		console.warn(
			'IntelligentActionService.analyzeInsightForActions called - stub implementation'
		);
		return [];
	}

	static async refreshCompletionStatus(
		actions: IntelligentAction[]
	): Promise<IntelligentAction[]> {
		console.warn(
			'IntelligentActionService.refreshCompletionStatus called - stub implementation'
		);
		return actions.map((action) => ({ ...action, executed: false }));
	}

	static async detectActionCompletion(
		action: IntelligentAction
	): Promise<ActionExecutionResult> {
		console.warn(
			'IntelligentActionService.detectActionCompletion called - stub implementation'
		);
		return {
			success: false,
			message: 'Action completion detection not implemented',
		};
	}

	static async executeAction(
		action: IntelligentAction
	): Promise<ActionExecutionResult> {
		console.warn(
			'IntelligentActionService.executeAction called - stub implementation'
		);
		return {
			success: false,
			message: 'Action execution not implemented',
		};
	}
}
