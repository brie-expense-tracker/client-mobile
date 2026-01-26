import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import WhyThisTray from '../../components/WhyThisTray';
import type { Message } from '../../../../../src/hooks/useMessagesReducerV2';
import { logger } from '../../../../../src/utils/logger';
import {
	palette,
	radius,
	space,
	type as typography,
	shadow,
} from '../../../../../src/ui/theme';

type Props = {
	message: Message;
	performance?: any;
	traceData?: any;
	showExpandButton?: boolean;
	onExpandPress?: () => void;
	streamingMessageId?: string | null;
};

const sanitizeMessageText = (input?: string | null) => {
	if (!input) return '';

	let sanitized = input.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
	sanitized = sanitized.replace(/__([^_]+)__/g, '$1'); // Bold/underline variants
	sanitized = sanitized.replace(/\*([^*\n]+)\*/g, '$1'); // Italic

	// Remove any leftover double asterisks from uneven markdown
	sanitized = sanitized.replace(/\*\*/g, '');

	// Remove numbers and currency amounts to create a cleaner, more conversational UI
	// Remove currency amounts (e.g., "$2,709", "$2,500.50", "$100")
	sanitized = sanitized.replace(/\$[\d,]+(?:\.\d+)?/g, '');
	// Remove percentages (e.g., "50%", "100%", "12.5%")
	sanitized = sanitized.replace(/\d+(?:\.\d+)?%/g, '');
	// Remove numbers with commas (e.g., "2,709", "1,234,567")
	sanitized = sanitized.replace(/\b\d{1,3}(?:,\d{3})+\b/g, '');
	// Remove decimal numbers (e.g., "2.5", "100.50")
	sanitized = sanitized.replace(/\b\d+\.\d+\b/g, '');
	// Remove standalone numbers (e.g., "2500", "100", "2026", "50")
	sanitized = sanitized.replace(/\b\d+\b/g, '');
	
	// Clean up extra spaces that may result from number removal
	sanitized = sanitized.replace(/\s+/g, ' '); // Multiple spaces to single space
	sanitized = sanitized.replace(/\s+([.,!?;:])/g, '$1'); // Space before punctuation
	sanitized = sanitized.replace(/([.,!?;:])\s*([.,!?;:])/g, '$1'); // Multiple punctuation
	sanitized = sanitized.replace(/\s*-\s*/g, ' '); // Clean up dashes with spaces
	sanitized = sanitized.trim();

	// Normalize curly apostrophes and quotes to straight ones for better compatibility
	// This ensures apostrophes display correctly in React Native
	sanitized = sanitized.replace(/['']/g, "'"); // Curly apostrophes to straight
	sanitized = sanitized.replace(/[""]/g, '"'); // Curly quotes to straight

	// Normalize Unicode to handle composed characters properly
	try {
		sanitized = sanitized.normalize('NFKC');
	} catch {
		// If normalization fails, continue with original string
	}

	// Remove invalid Unicode replacement character (\uFFFD) which appears as '?'
	// This is the character used when UTF-8 sequences can't be decoded
	sanitized = sanitized.replace(/\uFFFD/g, '');

	// Remove control characters that can't be displayed
	// Note: We preserve apostrophe (U+0027) and common punctuation
	sanitized = sanitized.replace(
		/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
		''
	);

	// Remove zero-width characters that might cause issues
	sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');

	return sanitized;
};

export const ChatMessage = memo(function ChatMessage({
	message,
	performance,
	traceData,
	showExpandButton,
	onExpandPress,
	streamingMessageId,
}: Props) {
	const isUser = message.isUser;
	const rawText = message.isStreaming ? message.buffered : message.text;
	const displayText = useMemo(() => {
		if (isUser) {
			return rawText || '';
		}
		return sanitizeMessageText(rawText);
	}, [isUser, rawText]);
	const isDeterministic = !isUser && message.phase === 'deterministic';

	// Don't render empty AI messages until they have content
	// Only show if: has text content OR is actively streaming with buffered content
	if (!isUser && !displayText) {
		const isActiveStreaming = streamingMessageId === message.id;
		const hasBufferedContent = message.buffered && message.buffered.length > 0;
		// Only show if it's the active streaming message AND has buffered content
		if (!(isActiveStreaming && hasBufferedContent)) {
			return null;
		}
	}

	return (
		<View
			style={[
				styles.message,
				isUser ? styles.userMessage : styles.aiMessage,
				isDeterministic ? styles.deterministicMessage : null,
			]}
		>
			{isDeterministic && (
				<View style={styles.deterministicHeader}>
					<Text style={styles.deterministicBadge}>Snapshot preview</Text>
					<Text style={styles.deterministicNote}>
						The full narrative will replace this shortly.
					</Text>
				</View>
			)}
			<Text
				style={[
					styles.messageText,
					isUser ? styles.userMessageText : styles.aiMessageText,
				]}
			>
				{displayText}
				{message.isStreaming ? (
					<Text style={styles.streamingCursor}>|</Text>
				) : null}
			</Text>

			<Text
				style={[
					styles.timestamp,
					isUser ? styles.userTimestamp : styles.aiTimestamp,
				]}
			>
				{message.timestamp.toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				})}
			</Text>

			{/* Debug info removed for cleaner UI */}

			{/* Performance info removed for cleaner UI */}

			{!isUser && (traceData || performance) && (
				<WhyThisTray traceData={traceData} performance={performance} />
			)}

			{showExpandButton && (
				<TouchableOpacity style={styles.expandButton} onPress={onExpandPress}>
					<Text style={styles.expandButtonText}>
						📈 Expand with more detail
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
});

export default ChatMessage;

const styles = StyleSheet.create({
	message: {
		maxWidth: '86%',
		marginBottom: space.md,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderRadius: radius.lg,
	},
	userMessage: {
		alignSelf: 'flex-end',
		backgroundColor: palette.primary,
		borderBottomRightRadius: radius.sm,
		...shadow.soft,
	},
	aiMessage: {
		alignSelf: 'flex-start',
		backgroundColor: palette.surface,
		borderBottomLeftRadius: radius.sm,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.borderSubtle,
		...shadow.card,
	},
	deterministicMessage: {
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.borderAccent,
		borderStyle: 'dashed',
		paddingTop: space.sm,
	},
	deterministicHeader: {
		marginBottom: space.xs,
	},
	deterministicBadge: {
		...typography.labelXs,
		color: palette.textStrong,
		marginBottom: 2,
	},
	deterministicNote: {
		...typography.labelXs,
		color: palette.textMuted,
	},
	messageText: {
		...typography.bodySm,
		lineHeight: 20,
	},
	userMessageText: {
		color: palette.onPrimary,
	},
	aiMessageText: {
		color: palette.text,
	},
	streamingCursor: {
		color: palette.primary,
		fontWeight: 'bold',
	},
	debugText: {
		...typography.labelXs,
		color: palette.warningStrong,
		marginTop: 4,
		fontFamily: 'monospace',
	},
	performanceInfo: {
		marginTop: space.xs,
		paddingTop: space.xs,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.borderSubtle,
	},
	performanceText: {
		...typography.labelXs,
		color: palette.textMuted,
		fontStyle: 'italic',
	},
	parallelInfo: {
		...typography.labelXs,
		color: palette.textMuted,
		marginTop: 2,
		fontStyle: 'italic',
	},
	optimizationInfo: {
		...typography.labelXs,
		color: palette.success,
		marginTop: 2,
		fontStyle: 'italic',
	},
	timeToFirstToken: {
		...typography.labelXs,
		color: palette.success,
	},
	showWorkButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingVertical: space.xs,
		paddingHorizontal: space.sm,
		marginTop: space.xs,
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.borderSubtle,
	},
	showWorkButtonText: {
		...typography.labelSm,
		color: palette.text,
	},
	expandButton: {
		backgroundColor: palette.primarySoft,
		borderRadius: radius.md,
		paddingVertical: space.xs,
		paddingHorizontal: space.sm,
		marginTop: space.xs,
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.primary,
	},
	expandButtonText: {
		...typography.labelSm,
		color: palette.primaryMuted,
	},
	timestamp: {
		...typography.labelXs,
		marginTop: space.xs,
		fontSize: 11,
	},
	userTimestamp: {
		color: palette.onPrimary,
		opacity: 0.7,
		textAlign: 'right',
	},
	aiTimestamp: {
		color: palette.textMuted,
		textAlign: 'left',
	},
});
