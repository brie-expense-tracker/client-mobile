#!/usr/bin/env node

/**
 * Team Training Launcher
 * 
 * This script helps your team get started with the AI Services training program.
 * Run with: node start-team-training.js [userId]
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
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

function logStep(step, message) {
    log(`\n${step} ${message}`, 'cyan');
}

// Get user ID from command line arguments
const userId = process.argv[2] || 'user_' + Date.now();

async function main() {
    try {
        logHeader('🎓 AI Services Team Training Program');
        log(`👤 User ID: ${userId}`);
        log(`📅 Started at: ${new Date().toISOString()}`);

        // Step 1: Welcome and overview
        logStep('1️⃣', 'Welcome to AI Services Training!');
        await showTrainingOverview();

        // Step 2: Start first module
        logStep('2️⃣', 'Starting your first training module...');
        await startFirstModule(userId);

        // Step 3: Show available modules
        logStep('3️⃣', 'Available Training Modules');
        await showAvailableModules();

        // Step 4: Training recommendations
        logStep('4️⃣', 'Your Personalized Training Path');
        await showTrainingPath(userId);

        logHeader('\n🎯 Ready to Begin Your AI Journey!');
        log('\n📋 Next Steps:');
        log('1. Complete the AI System Overview module');
        log('2. Practice with hands-on exercises');
        log('3. Move to Deployment Management');
        log('4. Earn your certification!');

        log(`\n💡 Tip: Run this script again anytime to check your progress`);
        log(`📚 Documentation: Check AI_SERVICES_DEPLOYMENT_README.md for detailed guides`);

    } catch (error) {
        log(`❌ Training setup failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

async function showTrainingOverview() {
    logInfo('Welcome to the AI Services Training Program!');
    logInfo('This program will teach you everything you need to know about:');
    log('   • AI system architecture and components');
    log('   • Deployment and management procedures');
    log('   • Monitoring and operations');
    log('   • Troubleshooting and support');

    logInfo('\nTraining Structure:');
    log('   • 4 comprehensive modules');
    log('   • Hands-on exercises and scenarios');
    log('   • Progress tracking and certification');
    log('   • Personalized learning recommendations');

    logSuccess('Training overview completed');
}

async function startFirstModule(userId) {
    logInfo('Starting AI System Overview module...');

    // Simulate module start
    await sleep(2000);

    logSuccess('AI System Overview module started successfully');
    logInfo('Module duration: 15 minutes');
    logInfo('Difficulty: Beginner');
    logInfo('Prerequisites: None');
}

async function showAvailableModules() {
    const modules = [
        {
            id: 'ai-overview',
            title: 'AI System Overview',
            duration: 15,
            difficulty: 'Beginner',
            status: 'In Progress',
            description: 'Introduction to AI system architecture and capabilities'
        },
        {
            id: 'deployment-management',
            title: 'Deployment Management',
            duration: 25,
            difficulty: 'Intermediate',
            status: 'Locked',
            description: 'Learn deployment processes and best practices'
        },
        {
            id: 'monitoring-operations',
            title: 'Monitoring & Operations',
            duration: 30,
            difficulty: 'Intermediate',
            status: 'Locked',
            description: 'Master monitoring dashboards and alert management'
        },
        {
            id: 'troubleshooting',
            title: 'Troubleshooting & Support',
            duration: 35,
            difficulty: 'Advanced',
            status: 'Locked',
            description: 'Advanced problem-solving and support procedures'
        }
    ];

    modules.forEach((module, index) => {
        const statusColor = module.status === 'In Progress' ? 'green' :
            module.status === 'Locked' ? 'yellow' : 'blue';
        const statusIcon = module.status === 'In Progress' ? '▶️' :
            module.status === 'Locked' ? '🔒' : '✅';

        log(`\n${index + 1}. ${module.title}`, 'bright');
        log(`   ${statusIcon} Status: ${module.status}`, statusColor);
        log(`   ⏱️  Duration: ${module.duration} minutes`);
        log(`   📊 Difficulty: ${module.difficulty}`);
        log(`   📝 ${module.description}`);
    });
}

async function showTrainingPath(userId) {
    logInfo('Based on your current progress, here\'s your recommended path:');

    log('\n🎯 Phase 1: Foundation (Week 1)');
    log('   • Complete AI System Overview module');
    log('   • Take the quiz and score 80%+');
    log('   • Review system architecture diagrams');

    log('\n🎯 Phase 2: Practical Skills (Week 2)');
    log('   • Complete Deployment Management module');
    log('   • Practice deployment scenarios');
    log('   • Learn troubleshooting techniques');

    log('\n🎯 Phase 3: Operations (Week 3)');
    log('   • Complete Monitoring & Operations module');
    log('   • Master dashboard navigation');
    log('   • Practice alert management');

    log('\n🎯 Phase 4: Expertise (Week 4)');
    log('   • Complete Troubleshooting & Support module');
    log('   • Handle complex scenarios');
    log('   • Earn your certification!');

    logSuccess('Personalized training path generated');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle process termination
process.on('SIGINT', () => {
    log('\n⚠️  Training setup interrupted by user', 'yellow');
    process.exit(0);
});

// Run the training setup
main().catch(error => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
});
