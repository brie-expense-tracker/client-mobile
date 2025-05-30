import {
	View,
	Text,
	TextInput,
	FlatList,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	TouchableOpacity,
	SafeAreaView,
	Image,
} from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

interface Message {
	id: string;
	text: string;
	sender: 'user' | 'other';
	timestamp: Date;
}

const GreetingHeader = () => (
	<View style={styles.greetingContainer}>
		<View style={styles.greetingTextContainer}>
			<Text style={styles.greetingTitle}>Welcome to Brie!</Text>
			<Text style={styles.greetingSubtitle}>
				Your AI assistant is here to help
			</Text>
		</View>
		<TouchableOpacity style={styles.greetingMenuButton}>
			<Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
		</TouchableOpacity>
	</View>
);

const ChatScreen = () => {
	const [messages, setMessages] = useState<Message[]>([
		{
			id: '1',
			text: 'Hello! How can I help you today?',
			sender: 'other',
			timestamp: new Date(),
		},
	]);
	const [inputText, setInputText] = useState('');

	const sendMessage = () => {
		if (inputText.trim() === '') return;

		const newMessage: Message = {
			id: Date.now().toString(),
			text: inputText,
			sender: 'user',
			timestamp: new Date(),
		};

		setMessages([...messages, newMessage]);
		setInputText('');
	};

	const renderMessage = ({ item }: { item: Message }) => (
		<View
			style={[
				styles.messageWrapper,
				item.sender === 'user'
					? styles.userMessageWrapper
					: styles.otherMessageWrapper,
			]}
		>
			{item.sender === 'other' && (
				<Image
					source={{
						uri: 'https://ui-avatars.com/api/?name=Brie&background=007AFF&color=fff',
					}}
					style={styles.avatar}
					defaultSource={require('../../assets/images/default-avatar.jpg')}
				/>
			)}
			<View
				style={[
					styles.messageContainer,
					item.sender === 'user' ? styles.userMessage : styles.otherMessage,
				]}
			>
				<Text
					style={[
						styles.messageText,
						item.sender === 'user'
							? styles.userMessageText
							: styles.otherMessageText,
					]}
				>
					{item.text}
				</Text>
				<Text
					style={[
						styles.timestamp,
						item.sender === 'user'
							? styles.userTimestamp
							: styles.otherTimestamp,
					]}
				>
					{item.timestamp.toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</Text>
			</View>
			{item.sender === 'user' && (
				<Image
					source={{
						uri: 'https://ui-avatars.com/api/?name=User&background=666666&color=fff',
					}}
					style={styles.avatar}
					defaultSource={require('../../assets/images/default-avatar.jpg')}
				/>
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<Stack.Screen
				options={{
					title: 'Chat with Brie',
					headerStyle: {
						backgroundColor: '#FFFFFF',
					},
					headerTintColor: '#000000',
					headerTitleStyle: {
						fontWeight: '600',
						fontSize: 16,
					},
					headerLeft: () => (
						<TouchableOpacity style={styles.headerLeft}>
							{/* <Ionicons name="chevron-back" size={24} color="#007AFF" /> */}
						</TouchableOpacity>
					),
					headerRight: () => (
						<TouchableOpacity style={styles.headerRight}>
							<Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
						</TouchableOpacity>
					),
				}}
			/>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
			>
				<GreetingHeader />
				<FlatList
					data={messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.messageList}
					inverted={false}
				/>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						value={inputText}
						onChangeText={setInputText}
						placeholder="Type a message..."
						multiline
					/>
					<TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
						<Ionicons name="send" size={24} color="#007AFF" />
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#bc0000',
	},
	container: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},
	greetingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 20,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E5EA',
	},
	greetingAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
	},
	greetingTextContainer: {
		flex: 1,
		alignItems: 'center',
	},
	greetingTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
		marginBottom: 6,
		textAlign: 'center',
	},
	greetingSubtitle: {
		fontSize: 15,
		color: '#666666',
		textAlign: 'center',
	},
	greetingMenuButton: {
		position: 'absolute',
		right: 16,
		padding: 8,
	},
	headerLeft: {
		marginLeft: 8,
	},
	headerRight: {
		marginRight: 8,
	},
	messageList: {
		padding: 16,
	},
	messageWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 8,
	},
	userMessageWrapper: {
		justifyContent: 'flex-end',
	},
	otherMessageWrapper: {
		justifyContent: 'flex-start',
	},
	avatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginHorizontal: 8,
	},
	messageContainer: {
		maxWidth: '70%',
		padding: 12,
		borderRadius: 16,
	},
	userMessage: {
		backgroundColor: '#007AFF',
		borderBottomRightRadius: 4,
	},
	otherMessage: {
		backgroundColor: '#E5E5EA',
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 16,
	},
	userMessageText: {
		color: '#FFFFFF',
	},
	otherMessageText: {
		color: '#000000',
	},
	timestamp: {
		fontSize: 12,
		marginTop: 4,
		alignSelf: 'flex-end',
	},
	userTimestamp: {
		color: '#FFFFFF',
		opacity: 0.8,
	},
	otherTimestamp: {
		color: '#666666',
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 16,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E5E5EA',
		alignItems: 'center',
	},
	input: {
		flex: 1,
		backgroundColor: '#F5F5F5',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginRight: 8,
		maxHeight: 100,
	},
	sendButton: {
		padding: 8,
	},
});

export default ChatScreen;
