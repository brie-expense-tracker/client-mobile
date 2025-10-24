import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { sharedStyles } from '../../../../src/components/assistant/shared/sharedStyles';

interface WelcomeSuggestionsProps {
	onPick: (prompt: string) => void;
}

export default function WelcomeSuggestions({
	onPick,
}: WelcomeSuggestionsProps) {
	const suggestions = [
		{
			id: '1',
			text: 'Ask me about creating budgets or tracking expenses',
			color: '#3b82f6', // Blue for budgets
		},
		{
			id: '2',
			text: 'Get help setting and achieving financial goals',
			color: '#3b82f6', // Blue for goals
		},
		{
			id: '3',
			text: 'Learn about saving strategies and spending patterns',
			color: '#3b82f6', // Blue for spending
		},
		{
			id: '4',
			text: 'Get personalized financial advice and tips',
			color: '#3b82f6', // Blue for advice
		},
	];

	return (
		<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
			<Text style={sharedStyles.promptsTitle}>
				Here&apos;s how I can help you today:
			</Text>
			<View style={sharedStyles.promptsGrid}>
				{suggestions.map((suggestion) => (
					<TouchableOpacity
						key={suggestion.id}
						onPress={() => {
							console.log(
								'🔍 [DEBUG] Welcome suggestion tapped:',
								suggestion.text
							);
							onPick(suggestion.text);
						}}
						style={[
							sharedStyles.promptCard,
							{ borderLeftWidth: 4, borderColor: suggestion.color },
						]}
						activeOpacity={0.7}
					>
						<Text
							style={[sharedStyles.promptText, { color: suggestion.color }]}
						>
							{suggestion.text}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}
