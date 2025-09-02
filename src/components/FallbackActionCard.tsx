import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logChat } from '../services/feature/analyticsService';

interface FallbackActionCardProps {
	message: string;
	fallbackType: 'grounding_failed' | 'critic_failed' | 'model_error' | 'network_error';
	onRetry?: () => void;
	onUseFallback?: () => void;
	onContactSupport?: () => void;
	factPackId?: string;
}

export default function FallbackActionCard({
	message,
	fallbackType,
	onRetry,
	onUseFallback,
	onContactSupport,
	factPackId,
}: FallbackActionCardProps) {
	const handleRetry = () => {
		// Log the retry attempt
		logChat({
			intent: 'FALLBACK_RETRY',
			usedGrounding: false,
			model: 'fallback',
			tokensIn: 0,
			tokensOut: 0,
			hadActions: true,
			hadCard: false,
			fallback: true,
			userSatisfaction: undefined,
			factPackId: factPackId || 'unknown',
		});

		if (onRetry) {
			onRetry();
		}
	};

	const handleUseFallback = () => {
		// Log the fallback usage
		logChat({
			intent: 'FALLBACK_ACCEPTED',
			usedGrounding: false,
			model: 'fallback',
			tokensIn: 0,
			tokensOut: 0,
			hadActions: true,
			hadCard: false,
			fallback: true,
			userSatisfaction: undefined,
			factPackId: factPackId || 'unknown',
		});

		if (onUseFallback) {
			onUseFallback();
		}
	};

	const handleContactSupport = () => {
		// Log the support request
		logChat({
			intent: 'SUPPORT_REQUESTED',
			usedGrounding: false,
			model: 'fallback',
			tokensIn: 0,
			tokensOut: 0,
			hadActions: true,
			hadCard: false,
			fallback: true,
			userSatisfaction: 'thumbs_down',
			factPackId: factPackId || 'unknown',
			dissatisfactionReason: 'fallback_unsatisfactory',
		});

		if (onContactSupport) {
			onContactSupport();
		} else {
			Alert.alert(
				'Contact Support',
				'Please email support@brie.ai with your issue and we\'ll get back to you within 24 hours.',
				[{ text: 'Got it', style: 'default' }]
			);
		}
	};

	const getFallbackIcon = () => {
		switch (fallbackType) {
			case 'grounding_failed':
				return 'flash-off';
			case 'critic_failed':
				return 'shield-checkmark-outline';
			case 'model_error':
				return 'cloud-offline';
			case 'network_error':
				return 'wifi-outline';
			default:
				return 'alert-circle-outline';
		}
	};

	const getFallbackTitle = () => {
		switch (fallbackType) {
			case 'grounding_failed':
				return 'Grounding Unavailable';
			case 'critic_failed':
				return 'Validation Failed';
			case 'model_error':
				return 'AI Service Error';
			case 'network_error':
				return 'Connection Issue';
			default:
				return 'Service Unavailable';
		}
	};

	const getFallbackDescription = () => {
		switch (fallbackType) {
			case 'grounding_failed':
				return 'We couldn\'t access your financial data for instant answers.';
			case 'critic_failed':
				return 'Our fact-checking system couldn\'t validate the response.';
			case 'model_error':
				return 'The AI service is temporarily unavailable.';
			case 'network_error':
				return 'We\'re having trouble connecting to our services.';
			default:
				return 'Something went wrong with our service.';
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name={getFallbackIcon()} size={20} color="#ef4444" />
				<Text style={styles.title}>{getFallbackTitle()}</Text>
			</View>
			
			<Text style={styles.description}>{getFallbackDescription()}</Text>
			
			{message && (
				<View style={styles.messageContainer}>
					<Text style={styles.messageText}>{message}</Text>
				</View>
			)}

			<View style={styles.actions}>
				{onRetry && (
					<TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
						<Ionicons name="refresh" size={16} color="#ffffff" />
						<Text style={styles.primaryButtonText}>Try Again</Text>
					</TouchableOpacity>
				)}
				
				{onUseFallback && (
					<TouchableOpacity style={styles.secondaryButton} onPress={handleUseFallback}>
						<Ionicons name="information-circle" size={16} color="#3b82f6" />
						<Text style={styles.secondaryButtonText}>Use Fallback</Text>
					</TouchableOpacity>
				)}
				
				<TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
					<Ionicons name="help-circle" size={16} color="#6b7280" />
					<Text style={styles.supportButtonText}>Contact Support</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
		borderWidth: 1,
		borderColor: '#f3f4f6',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
	},
	description: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
		marginBottom: 12,
	},
	messageContainer: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		borderLeftWidth: 3,
		borderLeftColor: '#3b82f6',
	},
	messageText: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
		flexWrap: 'wrap',
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		gap: 6,
		flex: 1,
		minWidth: 120,
		justifyContent: 'center',
	},
	primaryButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eff6ff',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		gap: 6,
		flex: 1,
		minWidth: 120,
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#dbeafe',
	},
	secondaryButtonText: {
		color: '#3b82f6',
		fontSize: 14,
		fontWeight: '600',
	},
	supportButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		gap: 6,
		flex: 1,
		minWidth: 120,
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	supportButtonText: {
		color: '#6b7280',
		fontSize: 14,
		fontWeight: '600',
	},
});
