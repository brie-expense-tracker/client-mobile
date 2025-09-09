// ai/mockApiService.ts - Mock API service for development/testing

export class MockApiService {
  /**
   * Mock method for making API calls
   */
  async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock response based on the prompt
    if (systemPrompt.includes('Writer')) {
      return JSON.stringify({
        version: "1.0",
        answer_text: "Based on your data from Aug 1-31, PDT, you have 3 active budgets totaling $2,500.",
        used_fact_ids: ["bud_groceries_2025-08", "bud_dining_2025-08", "bud_transport_2025-08"],
        numeric_mentions: [
          {"value": 2500, "unit": "USD", "kind": "limit", "fact_id": "bud_total_2025-08"}
        ],
        requires_clarification: false,
        content_kind: "status"
      });
    }
    
    if (systemPrompt.includes('Critic')) {
      return JSON.stringify({
        ok: true,
        risk: "low",
        recommend_escalation: false,
        issues: []
      });
    }
    
    if (systemPrompt.includes('Improver')) {
      return JSON.stringify({
        version: "1.0",
        answer_text: "Based on your data from Aug 1-31, PDT, you have 3 active budgets totaling $2,500. Your grocery budget has $180 remaining, dining has $45 remaining, and transport has $75 remaining. Consider reviewing your spending patterns to optimize your budget allocation. This information is for educational purposes only and should not be considered as financial advice.",
        used_fact_ids: ["bud_groceries_2025-08", "bud_dining_2025-08", "bud_transport_2025-08"],
        numeric_mentions: [
          {"value": 2500, "unit": "USD", "kind": "limit", "fact_id": "bud_total_2025-08"},
          {"value": 180, "unit": "USD", "kind": "remaining", "fact_id": "bud_groceries_2025-08"},
          {"value": 45, "unit": "USD", "kind": "remaining", "fact_id": "bud_dining_2025-08"},
          {"value": 75, "unit": "USD", "kind": "remaining", "fact_id": "bud_transport_2025-08"}
        ],
        requires_clarification: false,
        content_kind: "explanation",
        uncertainty_notes: []
      });
    }
    
    // Default mock response
    return JSON.stringify({
      version: "1.0",
      answer_text: "This is a mock response from the API service.",
      used_fact_ids: [],
      numeric_mentions: [],
      requires_clarification: false,
      content_kind: "status"
    });
  }
}
