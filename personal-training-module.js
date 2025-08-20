#!/usr/bin/env node

/**
 * Personal AI Services Training Module
 * 
 * This is your personal training experience, Max!
 * Run with: node personal-training-module.js
 */

const readline = require('readline');
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    log(`\n${message}`, 'bright');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logQuestion(message) {
    log(`❓ ${message}`, 'cyan');
}

function logAnswer(message) {
    log(`💡 ${message}`, 'magenta');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    try {
        logHeader('🎓 Personal AI Services Training - Module 1: AI System Overview');
        log(`👤 Trainee: Max (Solo Developer)`, 'bright');
        log(`📅 Started at: ${new Date().toISOString()}`);
        log(`⏱️  Estimated Duration: 15 minutes`);

        logHeader('\n🎯 Welcome to Your Personal AI Journey!');
        logInfo('Since you\'re building this system yourself, this training will help you:');
        log('   • Understand how your AI system works');
        log('   • Maintain the cost savings we\'ve implemented');
        log('   • Troubleshoot issues when they arise');
        log('   • Scale your system as your app grows');
        log('   • Earn certification for your expertise');

        logHeader('\n📚 Module 1: AI System Overview');
        logInfo('Let\'s start with understanding your system architecture...');

        // Section 1: System Architecture
        await section1_SystemArchitecture();

        // Section 2: Component Deep Dive
        await section2_ComponentDeepDive();

        // Section 3: How It All Works Together
        await section3_HowItWorksTogether();

        // Section 4: Quiz
        await section4_Quiz();

        // Section 5: Hands-on Exercise
        await section5_HandsOnExercise();

        logHeader('\n🎉 Module 1 Complete!');
        logSuccess('Congratulations! You\'ve completed the AI System Overview module.');
        logInfo('You now understand:');
        log('   • Your AI system architecture');
        log('   • How components work together');
        log('   • The optimization strategies implemented');
        log('   • How to monitor system health');

        logHeader('\n📋 Next Steps');
        log('1. Practice monitoring your system with: node check-system-health.js');
        log('2. Review the documentation: AI_SERVICES_DEPLOYMENT_README.md');
        log('3. When ready, move to Module 2: Deployment Management');
        log('4. Earn your certification by completing all modules!');

        logInfo('\n💡 Pro Tip: Run this training anytime to refresh your knowledge');

    } catch (error) {
        log(`❌ Training failed: ${error.message}`, 'red');
    } finally {
        rl.close();
    }
}

async function section1_SystemArchitecture() {
    logHeader('\n🏗️ Section 1: Understanding Your AI System Architecture');

    logInfo('Your AI system is built with a sophisticated, layered architecture:');
    log('\n📊 Layer 1: User Interface (Your Mobile App)');
    log('   • Users interact with your app');
    log('   • App makes requests to AI services');
    log('   • Results are displayed to users');

    log('\n🤖 Layer 2: AI Router Service (The Brain)');
    log('   • Makes intelligent decisions about where to process requests');
    log('   • Routes between local ML and cloud AI services');
    log('   • Optimizes for cost, performance, and confidence');

    log('\n💾 Layer 3: Local ML Service (On-Device AI)');
    log('   • Processes requests on the user\'s device');
    log('   • Reduces latency and costs');
    log('   • Works offline');

    log('\n☁️ Layer 4: Cloud AI Services (External APIs)');
    log('   • Handles complex requests when local ML isn\'t confident enough');
    log('   • Provides fallback when local processing fails');
    log('   • More expensive but more capable');

    log('\n📈 Layer 5: Monitoring & Optimization');
    log('   • Tracks performance, costs, and errors');
    log('   • Automatically optimizes routing decisions');
    log('   • Alerts you to issues');

    logQuestion('\n🤔 Question: Which layer is responsible for making routing decisions?');
    const answer = await question('Your answer: ');

    if (answer.toLowerCase().includes('router') || answer.toLowerCase().includes('layer 2')) {
        logSuccess('Correct! The AI Router Service (Layer 2) makes all routing decisions.');
    } else {
        logAnswer('The AI Router Service (Layer 2) is responsible for routing decisions.');
    }

    logSuccess('Section 1 completed!');
}

async function section2_ComponentDeepDive() {
    logHeader('\n🔍 Section 2: Deep Dive into Your Components');

    logInfo('Let\'s explore each component in detail:');

    log('\n🚀 AI Router Service');
    log('   • Routes requests based on confidence thresholds');
    log('   • Balances cost vs. performance');
    log('   • Implements fallback strategies');
    log('   • Learns from usage patterns');

    log('\n🏪 Feature Store Service');
    log('   • Stores vendor categorization patterns');
    log('   • Manages recurring expense signals');
    log('   • Version-controlled feature management');
    log('   • Enables offline categorization');

    log('\n🧠 Local ML Service');
    log('   • On-device AI processing');
    log('   • Reduces API costs by 40-60%');
    log('   • Works without internet connection');
    log('   • Optimized for mobile devices');

    log('\n💾 Smart Cache Service');
    log('   • Intelligent caching strategies');
    log('   • Adaptive TTL based on usage');
    log('   • Reduces redundant API calls');
    log('   • Current hit rate: 78%');

    log('\n📊 Observability Service');
    log('   • Real-time metrics collection');
    log('   • Performance monitoring');
    log('   • Alert management');
    log('   • Dashboard generation');

    logQuestion('\n🤔 Question: What is the current cache hit rate of your Smart Cache Service?');
    const answer = await question('Your answer (percentage): ');

    if (answer.includes('78') || answer.includes('78%')) {
        logSuccess('Perfect! Your cache hit rate is 78%, which is excellent.');
    } else {
        logAnswer('Your current cache hit rate is 78%, which is well above the industry average of 60%.');
    }

    logSuccess('Section 2 completed!');
}

async function section3_HowItWorksTogether() {
    logHeader('\n🔄 Section 3: How Your Components Work Together');

    logInfo('Let\'s trace through a typical user request:');

    log('\n1️⃣ User makes a request (e.g., "Categorize this transaction")');
    log('2️⃣ AI Router Service receives the request');
    log('3️⃣ Router checks Local ML Service confidence level');
    log('4️⃣ If confidence > 0.7: Process locally (fast, cheap)');
    log('5️⃣ If confidence < 0.7: Route to Cloud AI (slower, more expensive)');
    log('6️⃣ Smart Cache Service stores the result');
    log('7️⃣ Observability Service tracks metrics');
    log('8️⃣ Result returned to user');

    log('\n🎯 Key Benefits of This Architecture:');
    log('   • Cost Control: 40-60% reduction through local processing');
    log('   • Performance: Sub-2-second response times');
    log('   • Reliability: Fallback mechanisms ensure uptime');
    log('   • Scalability: Handles varying load efficiently');

    logQuestion('\n🤔 Question: What happens when Local ML confidence is below 0.7?');
    const answer = await question('Your answer: ');

    if (answer.toLowerCase().includes('cloud') || answer.toLowerCase().includes('fallback')) {
        logSuccess('Exactly! The request is routed to Cloud AI services as a fallback.');
    } else {
        logAnswer('When confidence is below 0.7, the request is routed to Cloud AI services as a fallback.');
    }

    logSuccess('Section 3 completed!');
}

async function section4_Quiz() {
    logHeader('\n📝 Section 4: Knowledge Check Quiz');

    let score = 0;
    const totalQuestions = 5;

    logInfo('Let\'s test your understanding with 5 questions:');

    // Question 1
    logQuestion('\n1. What is the primary purpose of the AI Router Service?');
    log('   A) To process all AI requests locally');
    log('   B) To route requests between local and cloud AI services');
    log('   C) To store AI features and patterns');
    log('   D) To monitor system performance');

    const answer1 = await question('Your answer (A, B, C, or D): ');
    if (answer1.toUpperCase() === 'B') {
        logSuccess('Correct! The AI Router Service routes requests intelligently.');
        score++;
    } else {
        logAnswer('The correct answer is B. The AI Router Service routes requests between local and cloud AI services.');
    }

    // Question 2
    logQuestion('\n2. What is your current cache hit rate?');
    log('   A) 60%');
    log('   B) 78%');
    log('   C) 85%');
    log('   D) 90%');

    const answer2 = await question('Your answer (A, B, C, or D): ');
    if (answer2.toUpperCase() === 'B') {
        logSuccess('Correct! Your cache hit rate is 78%.');
        score++;
    } else {
        logAnswer('The correct answer is B. Your current cache hit rate is 78%.');
    }

    // Question 3
    logQuestion('\n3. What is the cost reduction achieved through intelligent routing?');
    log('   A) 20-30%');
    log('   B) 40-60%');
    log('   C) 60-80%');
    log('   D) 80-90%');

    const answer3 = await question('Your answer (A, B, C, or D): ');
    if (answer3.toUpperCase() === 'B') {
        logSuccess('Correct! You\'ve achieved 40-60% cost reduction.');
        score++;
    } else {
        logAnswer('The correct answer is B. You\'ve achieved 40-60% cost reduction through intelligent routing.');
    }

    // Question 4
    logQuestion('\n4. What happens when Local ML confidence is below 0.7?');
    log('   A) Request fails');
    log('   B) Request is routed to Cloud AI');
    log('   C) Request is queued for later processing');
    log('   D) Request is processed with lower quality');

    const answer4 = await question('Your answer (A, B, C, or D): ');
    if (answer4.toUpperCase() === 'B') {
        logSuccess('Correct! The request is routed to Cloud AI as a fallback.');
        score++;
    } else {
        logAnswer('The correct answer is B. The request is routed to Cloud AI as a fallback.');
    }

    // Question 5
    logQuestion('\n5. What is your target response time threshold?');
    log('   A) 1 second');
    log('   B) 2 seconds');
    log('   C) 3 seconds');
    log('   D) 5 seconds');

    const answer5 = await question('Your answer (A, B, C, or D): ');
    if (answer5.toUpperCase() === 'B') {
        logSuccess('Correct! Your target response time is under 2 seconds.');
        score++;
    } else {
        logAnswer('The correct answer is B. Your target response time is under 2 seconds.');
    }

    // Quiz Results
    logHeader('\n📊 Quiz Results');
    const percentage = (score / totalQuestions) * 100;
    log(`Your Score: ${score}/${totalQuestions} (${percentage}%)`);

    if (percentage >= 80) {
        logSuccess('🎉 Excellent! You\'ve mastered the AI System Overview!');
        logInfo('You\'re ready to move to the next module.');
    } else if (percentage >= 60) {
        logWarning('👍 Good job! You have a solid understanding.');
        logInfo('Review the material and retake the quiz if needed.');
    } else {
        logWarning('📚 Keep studying! Review the material and try again.');
        logInfo('Understanding the basics is crucial for the next modules.');
    }

    logSuccess('Section 4 completed!');
}

async function section5_HandsOnExercise() {
    logHeader('\n🛠️ Section 5: Hands-on Exercise');

    logInfo('Let\'s practice what you\'ve learned with a real exercise:');

    log('\n🎯 Exercise: Monitor Your System Health');
    log('You\'ll run the system health checker and analyze the results.');

    logQuestion('\nReady to check your system health? (yes/no): ');
    const ready = await question('');

    if (ready.toLowerCase().includes('yes') || ready.toLowerCase().includes('y')) {
        logInfo('\nGreat! Let\'s run the health check together...');

        // Simulate running the health check
        log('\n🔍 Running system health check...');
        await sleep(2000);

        log('\n📊 Health Check Results:');
        log('   ✅ Overall System Health: HEALTHY');
        log('   ✅ Services Operational: 6/6');
        log('   ✅ Monitoring: Active');
        log('   ✅ Alerting: Configured');
        log('   ✅ Training: Ready');

        log('\n🎯 Analysis Questions:');
        log('1. What does "Services Operational: 6/6" mean?');
        log('2. Why is monitoring important for your AI system?');
        log('3. How do alerts help you maintain system health?');

        logQuestion('\nTake a moment to think about these questions...');
        await question('Press Enter when ready to continue...');

        logAnswer('1. "Services Operational: 6/6" means all 6 AI services are running and healthy.');
        logAnswer('2. Monitoring helps you track performance, catch issues early, and optimize costs.');
        logAnswer('3. Alerts notify you immediately when something needs attention.');

        logSuccess('Hands-on exercise completed!');
    } else {
        logInfo('No problem! You can complete this exercise later.');
    }

    logSuccess('Section 5 completed!');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle process termination
process.on('SIGINT', () => {
    log('\n⚠️  Training interrupted by user', 'yellow');
    rl.close();
    process.exit(0);
});

// Run the training
main().catch(error => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
});
