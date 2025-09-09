// assistant.ts - Types for pending actions and conversation state

export type PendingAction =
	| {
			id: string;
			type: 'CREATE_BUDGET';
			params: { category: string; amount?: number; period?: 'monthly' };
	  }
	| {
			id: string;
			type: 'CREATE_GOAL';
			params: { name: string; target: number; deadline?: string };
	  }
	| {
			id: string;
			type: 'ADJUST_BUDGET';
			params: { budgetId: string; newAmount: number };
	  };

export interface ConversationState {
	pendingAction: PendingAction | null;
	lastExecutedAction: string | null;
}
