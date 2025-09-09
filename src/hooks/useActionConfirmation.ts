import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ResilientApiService } from '../services/resilience/resilientApiService';

interface ActionConfirmationData {
	confirmationToken: string;
	idempotencyKey: string;
	actionId: string;
	actionType: string;
	scope: string;
	parameters: any;
	expiresAt: string;
}

interface UseActionConfirmationReturn {
	confirmationData: ActionConfirmationData | null;
	isModalVisible: boolean;
	isExecuting: boolean;
	showConfirmation: (data: ActionConfirmationData) => void;
	hideConfirmation: () => void;
	executeAction: (
		actionType: string,
		parameters: any,
		onSuccess?: (result: any) => void,
		onError?: (error: any) => void
	) => Promise<void>;
	confirmAction: (
		onSuccess?: (result: any) => void,
		onError?: (error: any) => void
	) => Promise<void>;
	cancelAction: () => Promise<void>;
}

export const useActionConfirmation = (): UseActionConfirmationReturn => {
	const [confirmationData, setConfirmationData] =
		useState<ActionConfirmationData | null>(null);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isExecuting, setIsExecuting] = useState(false);

	const showConfirmation = useCallback((data: ActionConfirmationData) => {
		setConfirmationData(data);
		setIsModalVisible(true);
	}, []);

	const hideConfirmation = useCallback(() => {
		setIsModalVisible(false);
		setConfirmationData(null);
	}, []);

	const executeAction = useCallback(
		async (
			actionType: string,
			parameters: any,
			onSuccess?: (result: any) => void,
			onError?: (error: any) => void
		) => {
			if (isExecuting) return;

			setIsExecuting(true);
			try {
				// Use ResilientApiService with HMAC signing for secure action execution
				const response = await ResilientApiService.requestActionConfirmation(
					actionType,
					parameters
				);

				if (response.success && response.data?.requiresConfirmation) {
					// Show confirmation modal
					showConfirmation({
						confirmationToken: response.data.confirmationToken,
						idempotencyKey: response.data.idempotencyKey,
						actionId: response.data.actionId,
						actionType: response.data.actionType,
						scope: response.data.scope,
						parameters: response.data.parameters || parameters,
						expiresAt: response.data.expiresAt,
					});
				} else if (response.success) {
					// Action executed successfully
					onSuccess?.(response.data);
				} else {
					// Action failed
					onError?.(response);
				}
			} catch (error) {
				console.error('Error executing action:', error);
				onError?.(error);
			} finally {
				setIsExecuting(false);
			}
		},
		[isExecuting, showConfirmation]
	);

	const confirmAction = useCallback(
		async (
			onSuccess?: (result: any) => void,
			onError?: (error: any) => void
		) => {
			if (!confirmationData || isExecuting) return;

			setIsExecuting(true);
			try {
				// Use ResilientApiService with HMAC signing for secure action confirmation
				const response = await ResilientApiService.executeIntelligentAction(
					confirmationData.actionType,
					confirmationData.parameters,
					confirmationData.confirmationToken,
					confirmationData.idempotencyKey
				);

				if (response.success) {
					hideConfirmation();
					onSuccess?.(response.data);
				} else {
					onError?.(response);
				}
			} catch (error) {
				console.error('Error confirming action:', error);
				onError?.(error);
			} finally {
				setIsExecuting(false);
			}
		},
		[confirmationData, isExecuting, hideConfirmation]
	);

	const cancelAction = useCallback(async () => {
		if (!confirmationData) return;

		try {
			// Use ResilientApiService with HMAC signing for secure action cancellation
			const response = await ResilientApiService.callSecureApi(
				`/api/action-security/confirmations/${confirmationData.confirmationToken}`,
				{},
				'DELETE'
			);

			if (response.success) {
				hideConfirmation();
			} else {
				Alert.alert('Error', 'Failed to cancel action. Please try again.');
			}
		} catch (error) {
			console.error('Error cancelling action:', error);
			Alert.alert('Error', 'Failed to cancel action. Please try again.');
		}
	}, [confirmationData, hideConfirmation]);

	return {
		confirmationData,
		isModalVisible,
		isExecuting,
		showConfirmation,
		hideConfirmation,
		executeAction,
		confirmAction,
		cancelAction,
	};
};
