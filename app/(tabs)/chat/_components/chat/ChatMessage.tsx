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

			{__DEV__ && !isUser && (
				<Text style={styles.debugText}>
					Debug: {message.isStreaming ? 'streaming' : 'final'} | Text:{' '}
					{message.text?.length || 0} chars | Buffered:{' '}
					{message.buffered?.length || 0} chars
				</Text>
			)}

			{!isUser && message.performance && (
				<View style={styles.performanceInfo}>
					<Text style={styles.performanceText}>
						⚡ {message.performance.totalLatency}ms
						{message.performance.timeToFirstToken && (
							<Text style={styles.timeToFirstToken}>
								{' '}
								(first token: {message.performance.timeToFirstToken}ms)
							</Text>
						)}
						{message.performance.cacheHit ? ' (cached)' : ''}
					</Text>

					{message.performance.parallelTools &&
						message.performance.parallelTools.executed.length > 0 && (
							<Text style={styles.parallelInfo}>
								🔧 {message.performance.parallelTools.executed.length} tools (
								{message.performance.parallelTools.successCount}✓,{' '}
								{message.performance.parallelTools.failureCount}✗)
								{message.performance.parallelTools.timeoutCount > 0 &&
									`, ${message.performance.parallelTools.timeoutCount}⏱`}
							</Text>
						)}

					{message.performance.parallelFacts &&
						message.performance.parallelFacts.queriesExecuted > 0 && (
							<Text style={styles.parallelInfo}>
								📊 {message.performance.parallelFacts.queriesExecuted} queries (
								{message.performance.parallelFacts.successCount}✓,{' '}
								{message.performance.parallelFacts.failureCount}✗)
							</Text>
						)}

					{message.performance.optimizations && (
						<Text style={styles.optimizationInfo}>
							🚀 Parallel:{' '}
							{Object.entries(message.performance.optimizations)
								.filter(([_, enabled]) => enabled)
								.map(([key, _]) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
								.join(', ')}
						</Text>
					)}

					{message.showWorkButton && (
						<TouchableOpacity
							style={styles.showWorkButton}
							onPress={() => {
								logger.debug('Show work button pressed');
							}}
						>
							<Text style={styles.showWorkButtonText}>📊 Show your work</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

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
});
