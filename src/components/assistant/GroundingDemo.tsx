import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { detectIntent, Intent } from '../../services/feature/groundingService';
import { ResponseFormatterService } from '../../services/feature/responseFormatterService';

interface DemoResponse {
	query: string;
	intent: Intent;
	response: string;
	wasGrounded: boolean;
	timestamp: Date;
}

export default function GroundingDemo() {
	const [query, setQuery] = useState('');
	const [responses, setResponses] = useState<DemoResponse[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	const handleQuery = async () => {
		if (!query.trim()) return;

		setIsProcessing(true);

		try {
			// Detect intent
			const intent = detectIntent(query);

			// Simulate grounding service response
			const wasGrounded = intent !== 'GENERAL_QA' && intent !== 'CREATE_BUDGET';

			// Generate response using formatter
			const formatter = new ResponseFormatterService();
			let response = '';

			if (wasGrounded) {
				// Mock data for demonstration
				const mockData = {
					type: 'data' as const,
					payload: getMockDataForIntent(intent),
					confidence: 0.85,
				};
				response = formatter.formatGroundedResponse(mockData, query);
			} else {
				response = `This query requires AI assistance. I'll route it to my LLM for a detailed response.`;
			}

			const demoResponse: DemoResponse = {
				query: query.trim(),
				intent,
				response,
				wasGrounded,
				timestamp: new Date(),
			};

			setResponses((prev) => [demoResponse, ...prev]);
			setQuery('');
		} catch (error) {
			console.error('Demo error:', error);
		} finally {
			setIsProcessing(false);
		}
	};

	const getMockDataForIntent = (intent: Intent) => {
		switch (intent) {
			case 'GET_BALANCE':
				return {
					totalIncome: 5000,
					totalSpent: 3200,
					availableBalance: 1800,
					currency: 'USD',
				};
			case 'GET_BUDGET_STATUS':
				return {
					totalBudget: 4000,
					totalSpent: 3200,
					totalRemaining: 800,
					overallPercentage: 80,
					budgets: [
						{
							name: 'Food',
							amount: 800,
							spent: 650,
							remaining: 150,
							spentPercentage: 81.25,
							isOverBudget: false,
							period: 'monthly',
						},
						{
							name: 'Transport',
							amount: 400,
							spent: 300,
							remaining: 100,
							spentPercentage: 75,
							isOverBudget: false,
							period: 'monthly',
						},
					],
				};
			case 'LIST_SUBSCRIPTIONS':
				return {
					subscriptions: [
						{
							name: 'Netflix',
							amount: 15.99,
							lastDate: '2024-01-15',
							category: 'Entertainment',
						},
						{
							name: 'Spotify',
							amount: 9.99,
							lastDate: '2024-01-15',
							category: 'Entertainment',
						},
					],
					totalMonthly: 25.98,
				};
			case 'GET_GOAL_PROGRESS':
				return {
					goals: [
						{
							name: 'Emergency Fund',
							targetAmount: 10000,
							currentAmount: 7500,
							progress: 75,
							remaining: 2500,
							deadline: '2024-06-01',
						},
						{
							name: 'Vacation',
							targetAmount: 3000,
							currentAmount: 1200,
							progress: 40,
							remaining: 1800,
							deadline: '2024-08-01',
						},
					],
					totalProgress: 57.5,
				};
			case 'GET_SPENDING_BREAKDOWN':
				return {
					breakdown: [
						{ category: 'Food & Dining', amount: 650, percentage: 20.3 },
						{ category: 'Transportation', amount: 300, percentage: 9.4 },
						{ category: 'Entertainment', amount: 200, percentage: 6.3 },
					],
					totalSpent: 3200,
					topCategory: 'Food & Dining',
				};
			case 'FORECAST_SPEND':
				return {
					next30Days: 3400,
					dailyAverage: 113.33,
					confidence: 0.78,
					basedOnDays: 28,
				};
			default:
				return { message: 'No specific data available for this intent' };
		}
	};

	const getIntentColor = (intent: Intent) => {
		const colors: Record<Intent, string> = {
			GET_BALANCE: '#10b981',
			GET_BUDGET_STATUS: '#3b82f6',
			LIST_SUBSCRIPTIONS: '#f59e0b',
			CATEGORIZE_TX: '#8b5cf6',
			FORECAST_SPEND: '#ef4444',
			CREATE_BUDGET: '#06b6d4',
			GET_GOAL_PROGRESS: '#84cc16',
			GET_SPENDING_BREAKDOWN: '#f97316',
			GENERAL_QA: '#6b7280',
		};
		return colors[intent];
	};

	const getIntentIcon = (intent: Intent) => {
		const icons: Record<Intent, keyof typeof Ionicons.glyphMap> = {
			GET_BALANCE: 'wallet',
			GET_BUDGET_STATUS: 'pie-chart',
			LIST_SUBSCRIPTIONS: 'calendar',
			CATEGORIZE_TX: 'pricetag',
			FORECAST_SPEND: 'trending-up',
			CREATE_BUDGET: 'add-circle',
			GET_GOAL_PROGRESS: 'flag',
			GET_SPENDING_BREAKDOWN: 'bar-chart',
			GENERAL_QA: 'chatbubble',
		};
		return icons[intent];
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="flash" size={24} color="#10b981" />
				<Text style={styles.title}>Grounding Layer Demo</Text>
				<Text style={styles.subtitle}>
					See how queries are processed before reaching LLMs
				</Text>
			</View>

			<View style={styles.inputSection}>
				<TextInput
					style={styles.input}
					value={query}
					onChangeText={setQuery}
					placeholder="Ask a financial question..."
					multiline
				/>
				<TouchableOpacity
					style={[styles.button, isProcessing && styles.buttonDisabled]}
					onPress={handleQuery}
					disabled={isProcessing}
				>
					<Ionicons name="send" size={20} color="white" />
					<Text style={styles.buttonText}>
						{isProcessing ? 'Processing...' : 'Send'}
					</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.responsesContainer}
				showsVerticalScrollIndicator={false}
			>
				{responses.map((response, index) => (
					<View key={index} style={styles.responseCard}>
						<View style={styles.responseHeader}>
							<View style={styles.intentBadge}>
								<Ionicons
									name={getIntentIcon(response.intent)}
									size={16}
									color={getIntentColor(response.intent)}
								/>
								<Text
									style={[
										styles.intentText,
										{ color: getIntentColor(response.intent) },
									]}
								>
									{response.intent.replace(/_/g, ' ')}
								</Text>
							</View>
							<View style={styles.groundingIndicator}>
								<Ionicons
									name={response.wasGrounded ? 'flash' : 'cloud'}
									size={14}
									color={response.wasGrounded ? '#10b981' : '#6b7280'}
								/>
								<Text style={styles.groundingText}>
									{response.wasGrounded ? 'Instant' : 'AI Powered'}
								</Text>
							</View>
						</View>

						<Text style={styles.queryText}>&quot;{response.query}&quot;</Text>
						<Text style={styles.responseText}>{response.response}</Text>

						<Text style={styles.timestamp}>
							{response.timestamp.toLocaleTimeString()}
						</Text>
					</View>
				))}
			</ScrollView>

			<View style={styles.stats}>
				<Text style={styles.statsTitle}>Demo Statistics</Text>
				<View style={styles.statsRow}>
					<Text style={styles.statsLabel}>Total Queries:</Text>
					<Text style={styles.statsValue}>{responses.length}</Text>
				</View>
				<View style={styles.statsRow}>
					<Text style={styles.statsLabel}>Grounded Responses:</Text>
					<Text style={styles.statsValue}>
						{responses.filter((r) => r.wasGrounded).length}
					</Text>
				</View>
				<View style={styles.statsRow}>
					<Text style={styles.statsLabel}>LLM Fallbacks:</Text>
					<Text style={styles.statsValue}>
						{responses.filter((r) => !r.wasGrounded).length}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		padding: 20,
	},
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1e293b',
		marginTop: 8,
	},
	subtitle: {
		fontSize: 14,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	inputSection: {
		marginBottom: 24,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		minHeight: 60,
		marginBottom: 12,
		backgroundColor: '#f8fafc',
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#10b981',
		padding: 16,
		borderRadius: 12,
		gap: 8,
	},
	buttonDisabled: {
		backgroundColor: '#9ca3af',
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	responsesContainer: {
		flex: 1,
		marginBottom: 20,
	},
	responseCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	responseHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	intentBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: '#f1f5f9',
		borderRadius: 6,
	},
	intentText: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	groundingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: '#f1f5f9',
		borderRadius: 6,
	},
	groundingText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
	queryText: {
		fontSize: 14,
		color: '#374151',
		fontStyle: 'italic',
		marginBottom: 8,
	},
	responseText: {
		fontSize: 14,
		color: '#1f2937',
		lineHeight: 20,
		marginBottom: 8,
	},
	timestamp: {
		fontSize: 12,
		color: '#9ca3af',
		textAlign: 'right',
	},
	stats: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	statsTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 12,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	statsLabel: {
		fontSize: 14,
		color: '#64748b',
	},
	statsValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
});
