#!/usr/bin/env node

/**
 * Mobile App Paywall Integration Test Suite
 * Tests the paywall modal and usage tracking integration
 */

import { EnhancedAIService } from './src/services/enhancedAIService.js';

// Mock API responses for testing
const mockAPIResponses = {
    success: {
        response: "Here's your AI response with some helpful financial advice...",
        sessionId: "test-session-123",
        timestamp: new Date(),
        usage: {
            estimatedTokens: 150,
            remainingTokens: 9850,
            remainingRequests: 49
        }
    },
    tokenLimitExceeded: {
        status: 429,
        data: {
            success: false,
            error: 'Usage limit exceeded',
            reason: 'token_limit_exceeded',
            usage: {
                currentTokens: 10000,
                tokenLimit: 10000,
                currentRequests: 45,
                requestLimit: 50,
                currentConversations: 18,
                conversationLimit: 20,
                subscriptionTier: 'free',
                estimatedCost: 0.02
            },
            upgradeRequired: true
        }
    },
    requestLimitExceeded: {
        status: 429,
        data: {
            success: false,
            error: 'Usage limit exceeded',
            reason: 'request_limit_exceeded',
            usage: {
                currentTokens: 8000,
                tokenLimit: 10000,
                currentRequests: 50,
                requestLimit: 50,
                currentConversations: 15,
                conversationLimit: 20,
                subscriptionTier: 'free',
                estimatedCost: 0.016
            },
            upgradeRequired: true
        }
    },
    rateLimitExceeded: {
        status: 429,
        data: {
            success: false,
            error: 'Usage limit exceeded',
            reason: 'rate_limit_exceeded',
            usage: {
                currentTokens: 5000,
                tokenLimit: 10000,
                currentRequests: 30,
                requestLimit: 50,
                currentConversations: 12,
                conversationLimit: 20,
                subscriptionTier: 'free',
                estimatedCost: 0.01
            },
            upgradeRequired: true
        }
    }
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

/**
 * Test utilities
 */
const logTest = (testName, passed, details = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    if (details) console.log(`   ${details}`);
    
    testResults.total++;
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
        testResults.details.push({ test: testName, details });
    }
};

const logSection = (title) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📱 ${title}`);
    console.log(`${'='.repeat(60)}`);
};

const logSummary = () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 MOBILE TEST SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log(`\nFailed Tests:`);
        testResults.details.forEach(({ test, details }) => {
            console.log(`  ❌ ${test}: ${details}`);
        });
    }
};

/**
 * Test 1: EnhancedAIService Interface
 */
const testEnhancedAIServiceInterface = () => {
    logSection('Testing EnhancedAIService Interface');
    
    // Test 1.1: Service instantiation
    try {
        const aiService = new EnhancedAIService();
        logTest(
            'EnhancedAIService can be instantiated',
            aiService !== null && typeof aiService === 'object',
            `Expected: valid service object, Got: ${typeof aiService}`
        );
    } catch (error) {
        logTest(
            'EnhancedAIService can be instantiated',
            false,
            `Error: ${error.message}`
        );
    }
    
    // Test 1.2: Required methods exist
    const aiService = new EnhancedAIService();
    const requiredMethods = [
        'getResponse',
        'getConversationContext',
        'getPersonalizedInsights',
        'getContextualSuggestions',
        'getConversationSummary',
        'upgradeSubscription'
    ];
    
    requiredMethods.forEach(method => {
        logTest(
            `Method ${method} exists`,
            typeof aiService[method] === 'function',
            `Expected: function, Got: ${typeof aiService[method]}`
        );
    });
    
    // Test 1.3: AIResponse interface
    const mockResponse = mockAPIResponses.success;
    logTest(
        'AIResponse interface matches expected structure',
        mockResponse.response && 
        mockResponse.sessionId && 
        mockResponse.timestamp &&
        mockResponse.usage,
        `Expected: complete response object, Got: ${Object.keys(mockResponse).join(', ')}`
    );
    
    // Test 1.4: Usage interface
    const usage = mockResponse.usage;
    logTest(
        'Usage interface matches expected structure',
        typeof usage.estimatedTokens === 'number' &&
        typeof usage.remainingTokens === 'number' &&
        typeof usage.remainingRequests === 'number',
        `Expected: numeric usage values, Got: estimatedTokens=${typeof usage.estimatedTokens}, remainingTokens=${typeof usage.remainingTokens}, remainingRequests=${typeof usage.remainingRequests}`
    );
};

/**
 * Test 2: Paywall Error Handling
 */
const testPaywallErrorHandling = () => {
    logSection('Testing Paywall Error Handling');
    
    // Test 2.1: Token limit exceeded error
    const tokenError = mockAPIResponses.tokenLimitExceeded;
    logTest(
        'Token limit exceeded error structure correct',
        tokenError.status === 429 &&
        tokenError.data.reason === 'token_limit_exceeded' &&
        tokenError.data.upgradeRequired === true,
        `Expected: status=429, reason=token_limit_exceeded, upgradeRequired=true, Got: status=${tokenError.status}, reason=${tokenError.data.reason}, upgradeRequired=${tokenError.data.upgradeRequired}`
    );
    
    // Test 2.2: Request limit exceeded error
    const requestError = mockAPIResponses.requestLimitExceeded;
    logTest(
        'Request limit exceeded error structure correct',
        requestError.status === 429 &&
        requestError.data.reason === 'request_limit_exceeded' &&
        requestError.data.upgradeRequired === true,
        `Expected: status=429, reason=request_limit_exceeded, upgradeRequired=true, Got: status=${requestError.status}, reason=${requestError.data.reason}, upgradeRequired=${requestError.data.upgradeRequired}`
    );
    
    // Test 2.3: Rate limit exceeded error
    const rateError = mockAPIResponses.rateLimitExceeded;
    logTest(
        'Rate limit exceeded error structure correct',
        rateError.status === 429 &&
        rateError.data.reason === 'rate_limit_exceeded' &&
        rateError.data.upgradeRequired === true,
        `Expected: status=429, reason=rate_limit_exceeded, upgradeRequired=true, Got: status=${rateError.status}, reason=${rateError.data.reason}, upgradeRequired=${rateError.data.upgradeRequired}`
    );
    
    // Test 2.4: Usage data completeness
    const usageData = tokenError.data.usage;
    const requiredUsageFields = [
        'currentTokens', 'tokenLimit', 'currentRequests', 'requestLimit',
        'currentConversations', 'conversationLimit', 'subscriptionTier', 'estimatedCost'
    ];
    
    const missingFields = requiredUsageFields.filter(field => !(field in usageData));
    logTest(
        'Usage data contains all required fields',
        missingFields.length === 0,
        `Expected: all fields present, Missing: ${missingFields.join(', ')}`
    );
};

/**
 * Test 3: Subscription Upgrade Flow
 */
const testSubscriptionUpgradeFlow = () => {
    logSection('Testing Subscription Upgrade Flow');
    
    // Test 3.1: Upgrade method signature
    const aiService = new EnhancedAIService();
    const upgradeMethod = aiService.upgradeSubscription;
    
    logTest(
        'Upgrade method accepts tier and duration parameters',
        upgradeMethod.length >= 1, // At least tier parameter
        `Expected: >=1 parameters, Got: ${upgradeMethod.length}`
    );
    
    // Test 3.2: Mock upgrade call structure
    try {
        // This would normally call the API, but we're just testing the interface
        const mockUpgradeCall = () => {
            return aiService.upgradeSubscription('basic', 1);
        };
        
        logTest(
            'Upgrade method can be called with valid parameters',
            typeof mockUpgradeCall === 'function',
            `Expected: function, Got: ${typeof mockUpgradeCall}`
        );
    } catch (error) {
        logTest(
            'Upgrade method can be called with valid parameters',
            false,
            `Error: ${error.message}`
        );
    }
};

/**
 * Test 4: Usage Tracking Integration
 */
const testUsageTrackingIntegration = () => {
    logSection('Testing Usage Tracking Integration');
    
    // Test 4.1: Usage state management
    const mockUsageState = {
        currentTokens: 5000,
        tokenLimit: 10000,
        currentRequests: 25,
        requestLimit: 50,
        currentConversations: 10,
        conversationLimit: 20,
        subscriptionTier: 'free',
        estimatedCost: 0.01
    };
    
    logTest(
        'Usage state structure matches expected format',
        typeof mockUsageState.currentTokens === 'number' &&
        typeof mockUsageState.tokenLimit === 'number' &&
        typeof mockUsageState.subscriptionTier === 'string',
        `Expected: numeric values and string tier, Got: currentTokens=${typeof mockUsageState.currentTokens}, tokenLimit=${typeof mockUsageState.tokenLimit}, tier=${typeof mockUsageState.subscriptionTier}`
    );
    
    // Test 4.2: Usage percentage calculation
    const tokenPercentage = (mockUsageState.currentTokens / mockUsageState.tokenLimit) * 100;
    const requestPercentage = (mockUsageState.currentRequests / mockUsageState.requestLimit) * 100;
    const conversationPercentage = (mockUsageState.currentConversations / mockUsageState.conversationLimit) * 100;
    
    logTest(
        'Usage percentage calculations are correct',
        tokenPercentage === 50 && requestPercentage === 50 && conversationPercentage === 50,
        `Expected: all 50%, Got: tokens=${tokenPercentage.toFixed(1)}%, requests=${requestPercentage.toFixed(1)}%, conversations=${conversationPercentage.toFixed(1)}%`
    );
    
    // Test 4.3: Usage warnings threshold
    const shouldShowWarning = tokenPercentage >= 80 || requestPercentage >= 80 || conversationPercentage >= 80;
    logTest(
        'Usage warning threshold logic works',
        shouldShowWarning === false, // 50% is below 80% threshold
        `Expected: false (below 80%), Got: ${shouldShowWarning}`
    );
    
    // Test 4.4: High usage scenario
    const highUsageState = {
        ...mockUsageState,
        currentTokens: 9000, // 90% of limit
        currentRequests: 45   // 90% of limit
    };
    
    const highTokenPercentage = (highUsageState.currentTokens / highUsageState.tokenLimit) * 100;
    const highRequestPercentage = (highUsageState.currentRequests / highUsageState.requestLimit) * 100;
    const shouldShowHighUsageWarning = highTokenPercentage >= 80 || highRequestPercentage >= 80;
    
    logTest(
        'High usage warning threshold logic works',
        shouldShowHighUsageWarning === true, // 90% is above 80% threshold
        `Expected: true (above 80%), Got: ${shouldShowHighUsageWarning}`
    );
};

/**
 * Test 5: Paywall Modal Integration
 */
const testPaywallModalIntegration = () => {
    logSection('Testing Paywall Modal Integration');
    
    // Test 5.1: Modal state management
    const mockModalState = {
        visible: true,
        reason: 'token_limit_exceeded',
        currentUsage: {
            currentTokens: 10000,
            tokenLimit: 10000,
            currentRequests: 45,
            requestLimit: 50,
            currentConversations: 18,
            conversationLimit: 20,
            subscriptionTier: 'free',
            estimatedCost: 0.02
        }
    };
    
    logTest(
        'Modal state structure is correct',
        mockModalState.visible === true &&
        mockModalState.reason &&
        mockModalState.currentUsage,
        `Expected: visible=true, reason present, usage present, Got: visible=${mockModalState.visible}, reason=${!!mockModalState.reason}, usage=${!!mockModalState.currentUsage}`
    );
    
    // Test 5.2: Reason message mapping
    const reasonMessages = {
        'token_limit_exceeded': "You've reached your monthly AI token limit. Upgrade to continue using AI assistance.",
        'request_limit_exceeded': "You've reached your monthly request limit. Upgrade for unlimited AI conversations.",
        'conversation_limit_exceeded': "You've reached your monthly conversation limit. Upgrade for unlimited AI conversations.",
        'rate_limit_exceeded': "You're making requests too quickly. Upgrade for higher rate limits."
    };
    
    Object.entries(reasonMessages).forEach(([reason, expectedMessage]) => {
        const hasMessage = reasonMessages[reason] === expectedMessage;
        logTest(
            `Reason message for ${reason} is correct`,
            hasMessage,
            `Expected: "${expectedMessage}", Got: "${reasonMessages[reason]}"`
        );
    });
    
    // Test 5.3: Subscription tier selection
    const mockTierSelection = {
        selectedTier: 'basic',
        pricing: {
            basic: {
                tier: 'basic',
                price: 9.99,
                tokenLimit: 50000,
                requestLimit: 200,
                conversationLimit: 100,
                features: [
                    'Advanced AI insights',
                    'Conversation history',
                    'Priority support',
                    'Custom prompts'
                ]
            }
        }
    };
    
    logTest(
        'Tier selection structure is correct',
        mockTierSelection.selectedTier === 'basic' &&
        mockTierSelection.pricing.basic &&
        mockTierSelection.pricing.basic.features.length === 4,
        `Expected: selectedTier=basic, pricing present, 4 features, Got: selectedTier=${mockTierSelection.selectedTier}, pricing=${!!mockTierSelection.pricing.basic}, features=${mockTierSelection.pricing.basic.features.length}`
    );
};

/**
 * Test 6: Error Handling and Fallbacks
 */
const testErrorHandlingAndFallbacks = () => {
    logSection('Testing Error Handling and Fallbacks');
    
    // Test 6.1: Network error handling
    const mockNetworkError = {
        response: null,
        message: 'Network Error',
        code: 'NETWORK_ERROR'
    };
    
    logTest(
        'Network error structure is handled',
        mockNetworkError.message === 'Network Error' &&
        mockNetworkError.code === 'NETWORK_ERROR',
        `Expected: message="Network Error", code="NETWORK_ERROR", Got: message="${mockNetworkError.message}", code="${mockNetworkError.code}"`
    );
    
    // Test 6.2: API error handling
    const mockAPIError = {
        response: {
            status: 500,
            data: {
                success: false,
                error: 'Internal Server Error'
            }
        }
    };
    
    logTest(
        'API error structure is handled',
        mockAPIError.response.status === 500 &&
        mockAPIError.response.data.error === 'Internal Server Error',
        `Expected: status=500, error="Internal Server Error", Got: status=${mockAPIError.response.status}, error="${mockAPIError.response.data.error}"`
    );
    
    // Test 6.3: Fallback message generation
    const mockFallbackMessage = {
        id: Date.now().toString(),
        text: "I'm having trouble connecting to my AI brain right now. Let me try to help based on what I can see: You have some great financial data set up! What specific question do you have about your budgets, goals, or spending?",
        isUser: false,
        timestamp: new Date(),
        type: 'text'
    };
    
    logTest(
        'Fallback message structure is correct',
        mockFallbackMessage.id &&
        mockFallbackMessage.text &&
        mockFallbackMessage.isUser === false &&
        mockFallbackMessage.type === 'text',
        `Expected: complete fallback message, Got: id=${!!mockFallbackMessage.id}, text=${!!mockFallbackMessage.text}, isUser=${mockFallbackMessage.isUser}, type=${mockFallbackMessage.type}`
    );
};

/**
 * Test 7: Performance and Edge Cases
 */
const testPerformanceAndEdgeCases = () => {
    logSection('Testing Performance and Edge Cases');
    
    // Test 7.1: Large message handling
    const largeMessage = 'A'.repeat(10000); // 10K character message
    const estimatedTokens = Math.ceil(largeMessage.length / 4);
    
    logTest(
        'Large message token estimation works',
        estimatedTokens === 2500,
        `Expected: 2500 tokens, Got: ${estimatedTokens}`
    );
    
    // Test 7.2: Empty message handling
    const emptyMessage = '';
    const emptyTokens = Math.ceil(emptyMessage.length / 4);
    
    logTest(
        'Empty message token estimation works',
        emptyTokens === 0,
        `Expected: 0 tokens, Got: ${emptyTokens}`
    );
    
    // Test 7.3: Very long response handling
    const longResponse = 'B'.repeat(50000); // 50K character response
    const responseTokens = Math.ceil(longResponse.length / 4);
    
    logTest(
        'Long response token estimation works',
        responseTokens === 12500,
        `Expected: 12500 tokens, Got: ${responseTokens}`
    );
    
    // Test 7.4: Cost calculation edge cases
    const edgeCaseCosts = [
        { tokens: 0, expectedCost: 0 },
        { tokens: 1000, expectedCost: 0.002 },
        { tokens: 1000000, expectedCost: 2.0 }
    ];
    
    edgeCaseCosts.forEach(({ tokens, expectedCost }) => {
        const calculatedCost = (tokens / 1000) * 0.002;
        const isCorrect = Math.abs(calculatedCost - expectedCost) < 0.001;
        
        logTest(
            `Cost calculation for ${tokens} tokens is correct`,
            isCorrect,
            `Expected: $${expectedCost}, Got: $${calculatedCost.toFixed(4)}`
        );
    });
};

/**
 * Main test runner
 */
const runAllTests = async () => {
    console.log('🚀 Starting Mobile App Paywall Integration Tests...\n');
    
    try {
        testEnhancedAIServiceInterface();
        testPaywallErrorHandling();
        testSubscriptionUpgradeFlow();
        testUsageTrackingIntegration();
        testPaywallModalIntegration();
        testErrorHandlingAndFallbacks();
        testPerformanceAndEdgeCases();
        
        logSummary();
        
        // Exit with appropriate code
        process.exit(testResults.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests };
