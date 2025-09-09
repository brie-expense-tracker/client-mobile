// ConversationState.ts - Manage pending actions and conversation state

import { PendingAction } from '../types/assistant';

const pendingActions = new Map<string, PendingAction | null>();
const lastExecutedActions = new Map<string, string | null>();

export const ConversationState = {
	setPendingAction: (convId: string, action: PendingAction) => {
		pendingActions.set(convId, action);
		console.log(
			`[ConversationState] Set pending action for ${convId}:`,
			action
		);
	},

	getPendingAction: (convId: string): PendingAction | null => {
		return pendingActions.get(convId) ?? null;
	},

	consumePendingAction: (convId: string): PendingAction | null => {
		const action = pendingActions.get(convId) ?? null;
		pendingActions.set(convId, null);
		console.log(
			`[ConversationState] Consumed pending action for ${convId}:`,
			action
		);
		return action;
	},

	clearPendingAction: (convId: string) => {
		pendingActions.set(convId, null);
		console.log(`[ConversationState] Cleared pending action for ${convId}`);
	},

	setLastExecutedAction: (convId: string, actionId: string) => {
		lastExecutedActions.set(convId, actionId);
		console.log(
			`[ConversationState] Set last executed action for ${convId}:`,
			actionId
		);
	},

	getLastExecutedAction: (convId: string): string | null => {
		return lastExecutedActions.get(convId) ?? null;
	},

	isDuplicateAction: (convId: string, actionId: string): boolean => {
		const lastExecuted = lastExecutedActions.get(convId);
		return lastExecuted === actionId;
	},

	// Get or create conversation ID (you might want to use a more sophisticated ID generation)
	getConversationId: (): string => {
		// For now, use a simple approach - in production you'd want proper conversation tracking
		return 'default-conversation';
	},
};
