import React, { memo, useRef, useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { ChatMessage } from './chat/ChatMessage';
import type { Message } from '../../../../src/hooks/useMessagesReducerV2';
import { TraceEventData } from '../../../../src/services/feature/enhancedStreamingService';
import { space } from '../../../../src/ui/theme';

type Props = {
	messages: Message[];
	streamingMessageId?: string | null;
	traceData: TraceEventData | null;
	performanceData: any;
	showExpandButton: boolean;
	onExpandPress: () => void;
	contentPaddingBottom: number;
	children?: React.ReactNode;
};

export const MessagesList = memo(function MessagesList({
	messages,
	streamingMessageId,
	traceData,
	performanceData,
	showExpandButton,
	onExpandPress,
	contentPaddingBottom,
	children,
}: Props) {
	const flatListRef = useRef<FlatList>(null);
	const prevPaddingBottomRef = useRef(contentPaddingBottom);
	const prevMessagesLengthRef = useRef(messages.length);

	// Scroll to bottom when composer height changes or new messages arrive
	useEffect(() => {
		const paddingChanged =
			prevPaddingBottomRef.current !== contentPaddingBottom;
		const newMessageAdded = prevMessagesLengthRef.current < messages.length;

		if (paddingChanged || newMessageAdded) {
			// Small delay to ensure layout has updated
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}

		prevPaddingBottomRef.current = contentPaddingBottom;
		prevMessagesLengthRef.current = messages.length;
	}, [contentPaddingBottom, messages.length]);

	return (
		<FlatList
			ref={flatListRef}
			data={messages}
			keyExtractor={(item) => item.id}
			keyboardShouldPersistTaps="handled"
			removeClippedSubviews={false}
			contentContainerStyle={{
				paddingHorizontal: space.lg,
				paddingTop: space.md,
				paddingBottom: contentPaddingBottom,
			}}
			renderItem={({ item }) => (
				<ChatMessage
					message={item}
					traceData={traceData || undefined}
					performance={performanceData || undefined}
					showExpandButton={
						showExpandButton && !item.isUser && !item.isStreaming
					}
					onExpandPress={onExpandPress}
					streamingMessageId={streamingMessageId}
				/>
			)}
			ListFooterComponent={<View>{children}</View>}
		/>
	);
});

export default MessagesList;
