import axios from 'axios';
import { Transaction } from '../data/transactions';
import Constants from 'expo-constants';

// Get the local IP address from Expo's manifest
const API_URL = __DEV__
	? 'http://192.168.1.65:3000' // Your computer's local IP address
	: 'https://your-production-api.com';

interface AIResponse {
	text: string;
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

export const analyzeTransactions = async (
	transactions: Transaction[]
): Promise<AIResponse> => {
	try {
		const response = await axios.post(`${API_URL}/api/ai/analyze`, {
			transactions,
		});
		return response.data;
	} catch (error) {
		console.error('Error analyzing transactions:', error);
		return {
			text: "I'm having trouble analyzing your transactions right now. Please try again later.",
		};
	}
};

export const getFinancialInsights = async (
	query: string,
	transactions: Transaction[]
): Promise<AIResponse> => {
	try {
		const response = await axios.post(`${API_URL}/api/ai/query`, {
			query,
			transactions,
		});
		return response.data;
	} catch (error) {
		console.error('Error getting financial insights:', error);
		return {
			text: "I'm having trouble processing your request right now. Please try again later.",
		};
	}
};
