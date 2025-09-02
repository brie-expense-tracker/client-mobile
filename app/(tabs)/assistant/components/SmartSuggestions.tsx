import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { sharedStyles } from '../../../../src/components/assistant/sharedStyles';
import { InterfaceMode } from '../../../../src/components/assistant/types';

interface SmartSuggestionsProps {
	onPick: (prompt: string) => void;
	mode: InterfaceMode;
}

export default function SmartSuggestions({
	onPick,
	mode,
}: SmartSuggestionsProps) {
	const getSuggestions = (): string[] => {
		switch (mode) {
			case 'insights':
				return [
					'Analyze my spending trends',
					'Show me budget performance',
					'What are my financial strengths?',
					'Identify spending opportunities',
				];
			case 'actions':
				return [
					'Create a new budget',
					'Set up a savings goal',
					'Track my expenses',
					'Optimize my spending',
				];
			case 'analytics':
				return [
					'Compare this month to last',
					'Show me detailed breakdown',
					'Predict future spending',
					'Analyze goal progress',
				];
			default:
				return [
					'How am I doing with my budget?',
					'What should I focus on financially?',
					'Show me my spending patterns',
					'Help me save more money',
				];
		}
	};

	const suggestions = getSuggestions();

	return (
		<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
			<Text style={sharedStyles.promptsTitle}>
				{`💡 Smart suggestions for ${mode} mode:`}
			</Text>
			<View style={sharedStyles.promptsGrid}>
				{suggestions.map((text, index) => (
					<TouchableOpacity
						key={index}
						onPress={() => {
							console.log('🔍 [DEBUG] Smart suggestion tapped:', text);
							onPick(text);
						}}
						style={[
							sharedStyles.promptCard,
							{ borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
						]}
						activeOpacity={0.7}
					>
						<Text style={[sharedStyles.promptText, { color: '#3b82f6' }]}>
							{text}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}
