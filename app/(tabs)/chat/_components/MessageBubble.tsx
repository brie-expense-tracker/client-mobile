import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SuggestedPrompts from './SuggestedPrompts';
import WelcomeSuggestions from './WelcomeSuggestions';
import SmartSuggestions from './SmartSuggestions';
import InsightsCard from './InsightsCard';
import StructuredResponse from './StructuredResponse';
import MessageFeedback from './MessageFeedback';
import { sharedStyles } from '../../../../src/components/assistant/shared/sharedStyles';
import { Message } from '../../../../src/services/assistant/types';
import DisclaimerBanner from '../../../../src/components/assistant/shared/DisclaimerBanner';
import FallbackActionCard from '../../../../src/components/FallbackActionCard';

interface MessageBubbleProps {
	m: Message;
	onPickPrompt?: (text: string) => void;
	onShowPremium?: () => void;
	showPremiumHint?: boolean;
	onAction?: (action: string, params?: any) => void;
}

export default function MessageBubble({
	m,
	onPickPrompt,
	onShowPremium,
	showPremiumHint,
	onAction,
}: MessageBubbleProps) {

	if (m.type === 'suggestion') {
		// Check if this is welcome suggestions or regular suggestions
		if (m.data?.isWelcomeSuggestions) {
			return <WelcomeSuggestions onPick={onPickPrompt!} />;
		}
		if (m.data?.isSmartSuggestions) {
			return (
				<SmartSuggestions onPick={onPickPrompt!} mode={m.data.mode || 'chat'} />
			);
		}
		return <SuggestedPrompts onPick={onPickPrompt!} />;
	}

	if (m.type === 'insight') {
		return (
			<InsightsCard
				insights={m.data?.insights || []}
				suggestions={m.data?.suggestions || []}
				factPackId={m.data?.factPackId || m.id}
			/>
		);
	}

	if (m.type === 'fallback') {
		return (
			<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
				<FallbackActionCard
					message={m.text}
					fallbackType={m.data?.fallbackType || 'grounding_failed'}
					onRetry={() => {
						// Retry the original question
						if (onPickPrompt && m.data?.originalQuestion) {
							onPickPrompt(m.data.originalQuestion);
						}
					}}
					onUseFallback={() => {
						// Use basic fallback response
						if (onPickPrompt && m.data?.originalQuestion) {
							onPickPrompt(m.data.originalQuestion + ' (basic mode)');
						}
					}}
					factPackId={m.data?.factPackId}
				/>
				<Text style={sharedStyles.msgTimeAI}>
					{m.timestamp.toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</Text>
			</View>
		);
	}

	if (m.type === 'structured') {
		return (
			<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
				<StructuredResponse
					response={m.structuredResponse!}
					onAction={onAction}
				/>
				<Text style={sharedStyles.msgTimeAI}>
					{m.timestamp.toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</Text>
			</View>
		);
	}

	return (
		<View
			style={[
				sharedStyles.msgWrap,
				m.isUser ? sharedStyles.msgUser : sharedStyles.msgAI,
			]}
		>
			<Text
				style={[
					sharedStyles.msgText,
					m.isUser ? sharedStyles.msgTextUser : sharedStyles.msgTextAI,
				]}
			>
				{m.text}
			</Text>
			<Text
				style={m.isUser ? sharedStyles.msgTimeUser : sharedStyles.msgTimeAI}
			>
				{m.timestamp.toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				})}
			</Text>

			{/* Grounding indicator for AI responses */}
			{!m.isUser && m.groundingInfo && (
				<View style={styles.groundingIndicator}>
					<Ionicons
						name={m.groundingInfo.wasGrounded ? 'flash' : 'cloud'}
						size={12}
						color={m.groundingInfo.wasGrounded ? '#10b981' : '#6b7280'}
					/>
					<Text style={styles.groundingText}>
						{m.groundingInfo.wasGrounded
							? `Instant response (${
									(m.groundingInfo.confidence || 0) * 100
							  }% confidence)`
							: `AI powered (${m.groundingInfo.modelUsed || 'gpt-3.5-turbo'})`}
					</Text>
				</View>
			)}

			{/* Hybrid Cost Optimization indicator */}
			{!m.isUser && m.hybridOptimization && (
				<View style={styles.hybridOptimizationIndicator}>
					<Ionicons name="trending-down" size={12} color="#10b981" />
					<Text style={styles.hybridOptimizationText}>
						{`${m.hybridOptimization.modelTier.toUpperCase()} model • ${m.hybridOptimization.costSavings.percentage.toFixed(
							1
						)}% cost savings`}
					</Text>
					<TouchableOpacity
						style={styles.hybridDetailsButton}
						onPress={() => {
							// Show detailed breakdown in console for now
							console.log('Hybrid Optimization Details:', m.hybridOptimization);
						}}
					>
						<Ionicons
							name="information-circle-outline"
							size={12}
							color="#6b7280"
						/>
					</TouchableOpacity>
				</View>
			)}

			{/* User feedback for AI responses */}
			{!m.isUser && (
				<MessageFeedback
					messageId={m.id}
					onFeedback={(satisfaction) => {
						console.log('User feedback:', satisfaction, 'for message:', m.id);
					}}
				/>
			)}

			{/* Disclaimer banner for strategy content */}
			{!m.isUser && (
				<DisclaimerBanner
					contentKind={m.contentKind}
					showDisclaimer={m.showDisclaimer}
				/>
			)}

			{/* Premium features hint - only show when explicitly triggered */}
			{!m.isUser && m.type === 'text' && showPremiumHint && onShowPremium && (
				<TouchableOpacity
					onPress={onShowPremium}
					style={styles.premiumHint}
					activeOpacity={0.7}
				>
					<View style={styles.premiumHintContent}>
						<Ionicons name="sparkles" size={14} color="#3b82f6" />
						<Text style={styles.premiumHintText}>
							Unlock advanced insights & unlimited conversations
						</Text>
						<Ionicons name="chevron-forward" size={14} color="#3b82f6" />
					</View>
				</TouchableOpacity>
			)}
		</View>
	);
}

// Premium hint styles - more subtle
const styles = StyleSheet.create({
	premiumHint: {
		marginTop: 8,
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		overflow: 'hidden',
		opacity: 0.9,
	},
	premiumHintContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		gap: 6,
	},
	premiumHintText: {
		flex: 1,
		fontSize: 12,
		color: '#64748b',
		fontWeight: '500',
		fontStyle: 'italic',
	},
	// Grounding indicator styles
	groundingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
		paddingHorizontal: 8,
		paddingVertical: 2,
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		alignSelf: 'flex-start',
	},
	groundingText: {
		fontSize: 10,
		color: '#6b7280',
		fontWeight: '400',
	},
	// Hybrid optimization indicator styles
	hybridOptimizationIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
		paddingHorizontal: 8,
		paddingVertical: 2,
		backgroundColor: '#f0fdf4',
		borderRadius: 8,
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: '#dcfce7',
	},
	hybridOptimizationText: {
		fontSize: 10,
		color: '#166534',
		fontWeight: '500',
	},
	hybridDetailsButton: {
		padding: 2,
	},
});
