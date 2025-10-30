import React, { memo } from 'react';
import { FlatList, View } from 'react-native';
import { ChatMessage } from './chat/ChatMessage';
import type { Message } from '../../../../src/hooks/useMessagesReducerV2';
import { TraceEventData } from '../../../../src/services/feature/enhancedStreamingService';

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
	return (
		<FlatList
			data={messages}
			keyExtractor={(item) => item.id}
			keyboardShouldPersistTaps="handled"
			removeClippedSubviews={false}
			contentContainerStyle={{
				padding: 20,
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
				/>
			)}
			ListFooterComponent={<View>{children}</View>}
		/>
	);
});

export default MessagesList;
