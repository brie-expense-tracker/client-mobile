import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { sharedStyles } from '../../../../src/components/assistant/shared/sharedStyles';

interface SuggestedPromptsProps {
	onPick: (prompt: string) => void;
}

export default function SuggestedPrompts({ onPick }: SuggestedPromptsProps) {
	const [suggestions, setSuggestions] = useState<string[]>([
		'How do I create my first budget?',
		'What should I do with my emergency fund?',
		'How can I start saving more money?',
		'What are good financial goals to set?',
		'How do I track my expenses?',
		'What should I focus on financially?',
		'Create a new budget',
		'Add a new expense',
	]);

	// Update suggestions based on context when component mounts
	useEffect(() => {
		const updateSuggestions = async () => {
			try {
				// For now, use static suggestions since HybridAI doesn't have getSuggestedQuestions
				const staticSuggestions = [
					'How is my grocery budget doing?',
					'Am I on track with my financial goals?',
					'How is my spending trending?',
					"What's my current savings rate?",
					'Should I adjust any of my budgets?',
					'How can I improve my financial health?',
				];
				setSuggestions(staticSuggestions);
			} catch (error) {
				console.log(
					'[AI Assistant] Could not load contextual suggestions:',
					error
				);
			}
		};

		updateSuggestions();
	}, []);

	const prompts = suggestions.map((text, index) => ({
		id: (index + 1).toString(),
		text,
		color: '#3b82f6', // Blue for all prompts
	}));

	return (
		<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
			<Text style={sharedStyles.promptsTitle}>
				What would you like to know?
			</Text>
			<View style={sharedStyles.promptsGrid}>
				{prompts.map((prompt) => (
					<TouchableOpacity
						key={prompt.id}
						onPress={() => {
							onPick(prompt.text);
						}}
						style={[
							sharedStyles.promptCard,
							{ borderLeftWidth: 2, borderLeftColor: prompt.color },
						]}
						activeOpacity={0.7}
					>
						<Text style={[sharedStyles.promptText, { color: prompt.color }]}>
							{prompt.text}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}
