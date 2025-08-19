#!/usr/bin/env node

/**
 * Mobile App Test Runner
 * Executes the paywall integration tests
 */

import { runAllTests } from './test-paywall-integration.js';

const runMobileTests = async () => {
    console.log('📱 Starting Mobile App Paywall Integration Tests...\n');
    
    try {
        await runAllTests();
        console.log('\n🎉 Mobile app tests completed!');
    } catch (error) {
        console.error('❌ Mobile app tests failed:', error);
        process.exit(1);
    }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMobileTests();
}

export { runMobileTests };
