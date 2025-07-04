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
	ActivityIndicator,
	ScrollView,
	Alert,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import axios from 'axios';
import { Transaction } from '../../src/data/transactions';
import { getFinancialInsights } from '../../src/services/aiService';

// Define API URL based on environment
const API_URL = __DEV__
	? 'http://192.168.1.222:3000' // Development
	: 'https://api.brie.com'; // Production

interface Message {
	id: string;
	text: string;
	sender: 'user' | 'other' | 'ai';
	timestamp: Date;
	analysis?: {
		insights?: string[];
		recommendations?: string[];
		trends?: {
			category: string;
			amount: number;
			trend: 'up' | 'down' | 'stable';
		}[];
	};
}

const GreetingHeader = () => (
	<View style={styles.greetingContainer}>
		<View style={styles.greetingTextContainer}>
			<Text style={styles.greetingTitle}>Welcome to Brie!</Text>
			<Text style={styles.greetingSubtitle}>
				Your AI financial assistant is here to help
			</Text>
		</View>
		<TouchableOpacity style={styles.greetingMenuButton}>
			<Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
		</TouchableOpacity>
	</View>
);

const ChatScreen = () => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputText, setInputText] = useState('');
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const flatListRef = useRef<FlatList<Message>>(null);

	useEffect(() => {
		loadChatHistory();
		fetchTransactions();
	}, []);

	const loadChatHistory = async () => {
		try {
			const response = await axios.get(`${API_URL}/api/messages`);
			if (response.data.success) {
				setMessages(
					response.data.messages.map((msg: any) => ({
						...msg,
						timestamp: new Date(msg.timestamp),
					}))
				);
			}
		} catch (error) {
			console.error('Error loading chat history:', error);
		}
	};

	const fetchTransactions = async () => {
		try {
			const response = await axios.get(`${API_URL}/api/transactions`);
			setTransactions(response.data);
		} catch (error) {
			console.error('Error fetching transactions:', error);
		}
	};

	const saveMessage = async (message: Message) => {
		try {
			await axios.post(`${API_URL}/api/messages`, message);
		} catch (error) {
			console.error('Error saving message:', error);
		}
	};

	const handleSend = async () => {
		if (!inputText.trim()) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			text: inputText,
			sender: 'user',
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputText('');
		setIsLoading(true);

		try {
			// Save user message
			await saveMessage(userMessage);

			// Get AI response
			const response = await getFinancialInsights(inputText, transactions);

			const aiMessage: Message = {
				id: (Date.now() + 1).toString(),
				text: response.text,
				sender: 'ai',
				timestamp: new Date(),
				analysis: response.analysis,
			};

			setMessages((prev) => [...prev, aiMessage]);

			// Save AI message
			await saveMessage(aiMessage);
		} catch (error) {
			console.error('Error:', error);
			Alert.alert('Error', 'Failed to get AI response. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	const renderMessage = ({ item }: { item: Message }) => (
		<View
			style={[
				styles.messageWrapper,
				item.sender === 'user'
					? styles.userMessageWrapper
					: item.sender === 'ai'
					? styles.aiMessageWrapper
					: styles.otherMessageWrapper,
			]}
		>
			{item.sender === 'other' && (
				<Image
					source={{
						uri: 'https://ui-avatars.com/api/?name=Brie&background=007AFF&color=fff',
					}}
					style={styles.avatar}
					defaultSource={require('../../src/assets/images/default-avatar.jpg')}
				/>
			)}
			{item.sender === 'ai' && (
				<Image
					source={{
						uri: 'https://ui-avatars.com/api/?name=AI&background=007AFF&color=fff',
					}}
					style={styles.avatar}
					defaultSource={require('../../src/assets/images/default-avatar.jpg')}
				/>
			)}
			<View
				style={[
					styles.messageContainer,
					item.sender === 'user'
						? styles.userMessage
						: item.sender === 'ai'
						? styles.aiMessage
						: styles.otherMessage,
				]}
			>
				<Text
					style={[
						styles.messageText,
						item.sender === 'user'
							? styles.userMessageText
							: item.sender === 'ai'
							? styles.aiMessageText
							: styles.otherMessageText,
					]}
				>
					{item.text}
				</Text>
				{item.analysis && (
					<View style={styles.analysisContainer}>
						{item.analysis.insights && item.analysis.insights.length > 0 && (
							<View style={styles.insightsContainer}>
								<Text style={styles.analysisTitle}>Insights:</Text>
								{item.analysis.insights.map((insight, index) => (
									<Text key={index} style={styles.insightText}>
										• {insight}
									</Text>
								))}
							</View>
						)}
						{item.analysis.recommendations &&
							item.analysis.recommendations.length > 0 && (
								<View style={styles.recommendationsContainer}>
									<Text style={styles.analysisTitle}>Recommendations:</Text>
									{item.analysis.recommendations.map((rec, index) => (
										<Text key={index} style={styles.recommendationText}>
											• {rec}
										</Text>
									))}
								</View>
							)}
					</View>
				)}
				<Text
					style={[
						styles.timestamp,
						item.sender === 'user'
							? styles.userTimestamp
							: item.sender === 'ai'
							? styles.aiTimestamp
							: styles.otherTimestamp,
					]}
				>
					{item.timestamp.toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</Text>
			</View>
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
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
			>
				<GreetingHeader />
				<FlatList
					data={messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.messageList}
					inverted={false}
					ref={flatListRef}
				/>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						value={inputText}
						onChangeText={setInputText}
						placeholder="Ask about your finances..."
						multiline
					/>
					<TouchableOpacity
						style={styles.sendButton}
						onPress={handleSend}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#007AFF" />
						) : (
							<Ionicons name="send" size={24} color="#007AFF" />
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
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
	aiMessageWrapper: {
		justifyContent: 'flex-start',
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
	aiMessage: {
		backgroundColor: '#007AFF',
		borderBottomLeftRadius: 4,
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
	aiMessageText: {
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
	aiTimestamp: {
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
	analysisContainer: {
		marginTop: 8,
		padding: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		borderRadius: 8,
	},
	analysisTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 4,
		color: '#007AFF',
	},
	insightsContainer: {
		marginBottom: 8,
	},
	insightText: {
		fontSize: 13,
		color: '#000000',
		marginBottom: 2,
	},
	recommendationsContainer: {
		marginTop: 8,
	},
	recommendationText: {
		fontSize: 13,
		color: '#000000',
		marginBottom: 2,
	},
});

export default ChatScreen;
