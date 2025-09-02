import { useState, useCallback } from 'react';
import { ApiService } from '../services';

interface CoachPromptResponse {
	success: boolean;
	threadId?: string;
	error?: string;
}

export default function useCoachPrompt() {
	const [loading, setLoading] = useState(false);

	const submitPrompt = useCallback(
		async (prompt: string): Promise<CoachPromptResponse> => {
			setLoading(true);
			try {
				// Create a new thread with the user's prompt
				const threadResponse = await ApiService.post('/api/threads', {
					title: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
					focusArea: 'financial_coaching',
					firstMessage: prompt,
				});

				if (threadResponse.success && threadResponse.data) {
					// Add AI response to the thread
					const aiResponse = await ApiService.post(
						`/api/threads/${threadResponse.data._id}/messages`,
						{
							type: 'insight',
							content: await generateAIResponse(prompt),
						}
					);

					if (aiResponse.success) {
						return {
							success: true,
							threadId: threadResponse.data._id,
						};
					}
				}

				return {
					success: false,
					error: 'Failed to create conversation thread',
				};
			} catch (error) {
				console.error('Error submitting prompt:', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	// Generate AI response using the existing AI service
	const generateAIResponse = async (prompt: string): Promise<string> => {
		try {
			// Use the existing AI insights service to generate a response
			const response = await ApiService.post('/api/ai/financial-insights', {
				query: prompt,
				transactions: [], // Will be populated by the backend
			});

			if (response.success && response.text) {
				return response.text;
			}

			// Fallback response
			return `I understand you're asking about "${prompt}". Let me analyze your financial data and provide personalized insights. I'll help you create actionable steps to improve your financial health.`;
		} catch (error) {
			console.error('Error generating AI response:', error);
			return `I'd be happy to help you with "${prompt}". Let me analyze your financial situation and provide personalized recommendations.`;
		}
	};

	return {
		submitPrompt,
		loading,
	};
}
