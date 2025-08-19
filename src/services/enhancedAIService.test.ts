import { EnhancedAIService } from './enhancedAIService';

// Simple test suite for the Enhanced AI Service
export const testEnhancedAIService = async () => {
	console.log('🧪 Testing Enhanced AI Service...');
	
	const aiService = new EnhancedAIService();
	
	try {
		// Test 1: Session ID generation
		console.log('✅ Session ID:', aiService.getCurrentSessionId());
		
		// Test 2: Get conversation context
		console.log('✅ Getting conversation context...');
		const context = await aiService.getConversationContext();
		console.log('✅ Context loaded:', context ? 'Success' : 'Failed');
		
		// Test 3: Get suggested questions
		console.log('✅ Getting suggested questions...');
		const questions = aiService.getSuggestedQuestions();
		console.log('✅ Questions:', questions);
		
		// Test 4: Get quick financial summary
		console.log('✅ Getting financial summary...');
		const summary = aiService.getQuickFinancialSummary();
		console.log('✅ Summary:', summary);
		
		// Test 5: Get action items
		console.log('✅ Getting action items...');
		const actions = aiService.getActionItemsSummary();
		console.log('✅ Actions:', actions);
		
		// Test 6: Get recent insights
		console.log('✅ Getting recent insights...');
		const insights = aiService.getRecentInsightsSummary();
		console.log('✅ Insights:', insights);
		
		console.log('🎉 All tests completed successfully!');
		return true;
		
	} catch (error) {
		console.error('❌ Test failed:', error);
		return false;
	}
};

// Test specific methods
export const testAIMethods = async () => {
	console.log('🧪 Testing AI Methods...');
	
	const aiService = new EnhancedAIService();
	
	try {
		// Test AI response (this will make an API call)
		console.log('✅ Testing AI response...');
		const response = await aiService.getResponse('How am I doing with my budgets?');
		console.log('✅ AI Response:', response.response);
		
		// Test personalized insights
		console.log('✅ Testing personalized insights...');
		const insights = await aiService.getPersonalizedInsights();
		console.log('✅ Insights:', insights);
		
		// Test contextual suggestions
		console.log('✅ Testing contextual suggestions...');
		const suggestions = await aiService.getContextualSuggestions();
		console.log('✅ Suggestions:', suggestions);
		
		console.log('🎉 AI methods test completed successfully!');
		return true;
		
	} catch (error) {
		console.error('❌ AI methods test failed:', error);
		return false;
	}
};

// Export for use in development
export default {
	testEnhancedAIService,
	testAIMethods,
};
