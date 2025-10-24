import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import WhyThisTray from '../WhyThisTray';
import type { Message } from '../../../../../src/hooks/useMessagesReducerV2';

type Props = {
	message: Message;
	performance?: any;
	traceData?: any;
	showExpandButton?: boolean;
	onExpandPress?: () => void;
};

export const ChatMessage = memo(function ChatMessage({
	message,
	performance,
	traceData,
	showExpandButton,
	onExpandPress,
}: Props) {
	const isUser = message.isUser;
	const text = message.isStreaming ? message.buffered : message.text;

	return (
		<View
			style={[styles.message, isUser ? styles.userMessage : styles.aiMessage]}
		>
			<Text
				style={[
					styles.messageText,
					isUser ? styles.userMessageText : styles.aiMessageText,
				]}
			>
				{text}
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
								console.log('Show work button pressed');
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

const styles = StyleSheet.create({
	message: { maxWidth: '80%', marginBottom: 16, padding: 12, borderRadius: 18 },
	userMessage: {
		alignSelf: 'flex-end',
		backgroundColor: '#3b82f6',
		borderBottomRightRadius: 4,
	},
	aiMessage: {
		alignSelf: 'flex-start',
		backgroundColor: '#f3f4f6',
		borderBottomLeftRadius: 4,
	},
	messageText: { fontSize: 16, lineHeight: 22 },
	userMessageText: { color: '#ffffff' },
	aiMessageText: { color: '#111827' },
	streamingCursor: { color: '#3b82f6', fontWeight: 'bold' },
	debugText: {
		fontSize: 12,
		color: '#92400e',
		fontFamily: 'monospace',
		marginTop: 4,
	},
	performanceInfo: {
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	performanceText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
	parallelInfo: {
		fontSize: 11,
		color: '#9ca3af',
		fontStyle: 'italic',
		marginTop: 2,
	},
	optimizationInfo: {
		fontSize: 10,
		color: '#10b981',
		fontStyle: 'italic',
		marginTop: 2,
		fontWeight: '500',
	},
	timeToFirstToken: { fontSize: 11, color: '#10b981', fontWeight: '500' },
	showWorkButton: {
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	showWorkButtonText: { color: '#374151', fontSize: 14, fontWeight: '500' },
	expandButton: {
		backgroundColor: '#f0f9ff',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#0ea5e9',
	},
	expandButtonText: { color: '#0369a1', fontSize: 14, fontWeight: '500' },
});
