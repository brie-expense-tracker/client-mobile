const { InsightsService } = require('./src/services/insightsService');

async function debugInsights() {
    console.log('Starting insights debug...');

    try {
        const response = await InsightsService.getInsights('weekly');
        console.log('Insights response:', JSON.stringify(response, null, 2));

        if (response.success) {
            console.log('Success! Found insights:', response.data?.length || 0);
            if (response.data && response.data.length > 0) {
                console.log('First insight:', response.data[0]);
            }
        } else {
            console.log('Failed to get insights:', response.error);
        }
    } catch (error) {
        console.error('Error in debug:', error);
    }
}

debugInsights(); 