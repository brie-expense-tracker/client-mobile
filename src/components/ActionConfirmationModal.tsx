import React, { useState, useEffect } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from '../utils/sublogger';

const actionConfirmationModalLog = createLogger('ActionConfirmationModal');

interface ActionConfirmationModalProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: (confirmationToken: string, idempotencyKey: string) => void;
	confirmationData: {
		confirmationToken: string;
		idempotencyKey: string;
		actionId: string;
		actionType: string;
		scope: string;
		parameters: any;
		expiresAt: string;
	} | null;
	loading?: boolean;
}

export const ActionConfirmationModal: React.FC<
	ActionConfirmationModalProps
> = ({ visible, onClose, onConfirm, confirmationData, loading = false }) => {
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [isConfirming, setIsConfirming] = useState(false);

	useEffect(() => {
		if (!confirmationData) return;

		const updateTimer = () => {
			const remaining = Math.max(
				0,
				new Date(confirmationData.expiresAt).getTime() - Date.now()
			);
			setTimeRemaining(remaining);
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => clearInterval(interval);
	}, [confirmationData]);

	const handleConfirm = async () => {
		if (!confirmationData) return;

		setIsConfirming(true);
		try {
			await onConfirm(
				confirmationData.confirmationToken,
				confirmationData.idempotencyKey
			);
		} catch (error) {
			actionConfirmationModalLog.error('Confirmation failed', error);
		} finally {
			setIsConfirming(false);
		}
	};

	const handleCancel = () => {
		Alert.alert(
			'Cancel Action',
			'Are you sure you want to cancel this action?',
			[
				{ text: 'Keep Action', style: 'cancel' },
				{ text: 'Cancel Action', style: 'destructive', onPress: onClose },
			]
		);
	};

	const formatTime = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	const getActionIcon = (actionType: string) => {
		switch (actionType) {
			case 'create_budget':
				return 'wallet-outline';
			case 'create_goal':
				return 'flag-outline';
			case 'set_reminder':
				return 'alarm-outline';
			case 'update_preferences':
				return 'settings-outline';
			case 'export_data':
				return 'download-outline';
			case 'detect_completion':
				return 'checkmark-circle-outline';
			default:
				return 'construct-outline';
		}
	};

	const getActionTitle = (actionType: string) => {
		switch (actionType) {
			case 'create_budget':
				return 'Create Budget';
			case 'create_goal':
				return 'Create Goal';
			case 'set_reminder':
				return 'Set Reminder';
			case 'update_preferences':
				return 'Update Preferences';
			case 'export_data':
				return 'Export Data';
			case 'detect_completion':
				return 'Detect Completion';
			default:
				return 'Execute Action';
		}
	};

	const getScopeDescription = (scope: string) => {
		switch (scope) {
			case 'financial_data':
				return 'This action will modify your financial data (budgets, goals, transactions)';
			case 'user_data':
				return 'This action will modify your personal data and preferences';
			case 'system_settings':
				return 'This action will modify your system settings and configuration';
			case 'data_export':
				return 'This action will export your personal data';
			default:
				return 'This action requires confirmation to proceed';
		}
	};

	if (!confirmationData) {
		return null;
	}

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Action Confirmation Required</Text>
					<TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
						<Ionicons name="close" size={24} color="#666" />
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					<View style={styles.actionInfo}>
						<View style={styles.actionHeader}>
							<View style={styles.actionIconContainer}>
								<Ionicons
									name={getActionIcon(confirmationData.actionType)}
									size={32}
									color="#4A90E2"
								/>
							</View>
							<View style={styles.actionDetails}>
								<Text style={styles.actionTitle}>
									{getActionTitle(confirmationData.actionType)}
								</Text>
								<Text style={styles.actionType}>
									{confirmationData.actionType.replace('_', ' ')}
								</Text>
							</View>
						</View>

						<View style={styles.scopeInfo}>
							<Text style={styles.scopeLabel}>Scope</Text>
							<Text style={styles.scopeText}>
								{getScopeDescription(confirmationData.scope)}
							</Text>
						</View>

						{confirmationData.parameters &&
							Object.keys(confirmationData.parameters).length > 0 && (
								<View style={styles.parametersInfo}>
									<Text style={styles.parametersLabel}>Parameters</Text>
									{Object.entries(confirmationData.parameters).map(
										([key, value]) => (
											<View key={key} style={styles.parameterRow}>
												<Text style={styles.parameterKey}>{key}:</Text>
												<Text style={styles.parameterValue}>
													{typeof value === 'object'
														? JSON.stringify(value)
														: String(value)}
												</Text>
											</View>
										)
									)}
								</View>
							)}
					</View>

					<View style={styles.securityInfo}>
						<View style={styles.securityHeader}>
							<Ionicons name="shield-checkmark" size={20} color="#50C878" />
							<Text style={styles.securityTitle}>Security Information</Text>
						</View>

						<View style={styles.securityDetails}>
							<View style={styles.securityRow}>
								<Text style={styles.securityLabel}>Expires in:</Text>
								<Text
									style={[
										styles.securityValue,
										timeRemaining < 60000 && styles.expiringSoon,
									]}
								>
									{formatTime(timeRemaining)}
								</Text>
							</View>

							<View style={styles.securityRow}>
								<Text style={styles.securityLabel}>Action ID:</Text>
								<Text style={styles.securityValue}>
									{confirmationData.actionId.substring(0, 8)}...
								</Text>
							</View>

							<View style={styles.securityRow}>
								<Text style={styles.securityLabel}>Confirmation Token:</Text>
								<Text style={styles.securityValue}>
									{confirmationData.confirmationToken.substring(0, 12)}...
								</Text>
							</View>
						</View>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<TouchableOpacity
						style={styles.cancelButton}
						onPress={handleCancel}
						disabled={isConfirming}
					>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.confirmButton,
							(timeRemaining === 0 || isConfirming) &&
								styles.confirmButtonDisabled,
						]}
						onPress={handleConfirm}
						disabled={timeRemaining === 0 || isConfirming}
					>
						{isConfirming ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<>
								<Ionicons name="checkmark" size={20} color="#fff" />
								<Text style={styles.confirmButtonText}>Confirm Action</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E5E5',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	closeButton: {
		padding: 4,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	actionInfo: {
		paddingVertical: 20,
	},
	actionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	actionIconContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: '#F0F8FF',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	actionDetails: {
		flex: 1,
	},
	actionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	actionType: {
		fontSize: 14,
		color: '#666',
		textTransform: 'capitalize',
	},
	scopeInfo: {
		marginBottom: 20,
	},
	scopeLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	scopeText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	parametersInfo: {
		marginBottom: 20,
	},
	parametersLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	parameterRow: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	parameterKey: {
		fontSize: 14,
		color: '#666',
		width: 100,
		fontWeight: '500',
	},
	parameterValue: {
		fontSize: 14,
		color: '#333',
		flex: 1,
	},
	securityInfo: {
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
	},
	securityHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	securityTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	securityDetails: {
		gap: 8,
	},
	securityRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	securityLabel: {
		fontSize: 14,
		color: '#666',
	},
	securityValue: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
		fontFamily: 'monospace',
	},
	expiringSoon: {
		color: '#FF6B6B',
		fontWeight: '600',
	},
	footer: {
		flexDirection: 'row',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: '#E5E5E5',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E5E5E5',
		justifyContent: 'center',
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
	},
	confirmButton: {
		flex: 2,
		flexDirection: 'row',
		paddingVertical: 14,
		borderRadius: 8,
		backgroundColor: '#4A90E2',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
	},
	confirmButtonDisabled: {
		backgroundColor: '#CCC',
	},
	confirmButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
});
