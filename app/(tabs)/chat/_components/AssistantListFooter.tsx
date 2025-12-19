import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import ContextualInsightsPanel from '../../../../src/components/assistant/panels/ContextualInsightsPanel';
import FallbackCard from '../../../../src/components/assistant/cards/FallbackCard';
import MissingInfoCard from '../../../../src/components/assistant/cards/MissingInfoCard';
import IntentMissingInfoCard from '../../../../src/components/assistant/cards/IntentMissingInfoCard';
import { Insight } from '../../../../src/services/insights/insightsContextService';
import { TraceEventData } from '../../../../src/services/feature/enhancedStreamingService';
import {
	CachedSpendPlan,
	CachedBudget,
	CachedGoal,
} from '../../../../src/services/resilience/fallbackService';
import { MissingInfoState } from '../../../../src/services/feature/missingInfoService';
import { IntentMissingInfoState } from '../../../../src/services/feature/intentMissingInfoService';
import { MissingInfoChip } from '../../../../src/components/assistant/cards/MissingInfoCard';

type Props = {
	aiInsightsEnabled: boolean;
	allowProactive: boolean;
	isStreaming: boolean;
	hasStreamingId: boolean;
	dataInitialized: boolean;
	conversationContext: string;
	onInsightPress: (insight: Insight) => void;
	onAskAboutInsight: (insight: Insight) => void;
	showFallback: boolean;
	fallbackData: {
		spendPlan?: CachedSpendPlan | null;
		budgets?: CachedBudget[];
		goals?: CachedGoal[];
		lastSync?: Date | null;
	};
	onRetry: () => void;
	onRefresh: () => void;
	isRetrying: boolean;
	onMissingInfoComplete: () => void;
	onIntentMissingInfoComplete: () => void;
	missingInfoState: MissingInfoState;
	intentMissingInfoState: IntentMissingInfoState;
	onChipPress: (chip: MissingInfoChip) => void;
	onValueSubmit: (chipId: string, value: string) => void;
};

export function AssistantListFooter({
	aiInsightsEnabled,
	allowProactive,
	isStreaming,
	hasStreamingId,
	dataInitialized,
	conversationContext,
	onInsightPress,
	onAskAboutInsight,
	showFallback,
	fallbackData,
	onRetry,
	onRefresh,
	isRetrying,
	onMissingInfoComplete,
	onIntentMissingInfoComplete,
	missingInfoState,
	intentMissingInfoState,
	onChipPress,
	onValueSubmit,
}: Props) {
	return (
		<View>
			{/* Contextual Insights Panel */}
			{aiInsightsEnabled &&
				allowProactive &&
				!isStreaming &&
				dataInitialized && (
					<ContextualInsightsPanel
						conversationContext={conversationContext}
						onInsightPress={onInsightPress}
						onAskAboutInsight={onAskAboutInsight}
						maxInsights={3}
					/>
				)}

			{/* Loading States */}
			{/* Only show "AI is responding..." when we have a streaming message ID and content is actually streaming */}
			{hasStreamingId && isStreaming && <Row text="AI is responding..." color="#10b981" />}

			{/* Missing Info Cards */}
			{missingInfoState.isCollecting && missingInfoState.chips.length > 0 && (
				<View style={styles.missingInfoContainer}>
					<MissingInfoCard
						chips={missingInfoState.chips}
						onChipPress={onChipPress}
						onValueSubmit={onValueSubmit}
					/>
					{missingInfoState.completionRate === 100 && (
						<Button
							title="Complete & Continue"
							onPress={onMissingInfoComplete}
						/>
					)}
				</View>
			)}

			{intentMissingInfoState.isCollecting &&
				intentMissingInfoState.chips.length > 0 && (
					<View style={styles.missingInfoContainer}>
						<IntentMissingInfoCard
							intent={intentMissingInfoState.currentIntent || 'unknown'}
							missing={intentMissingInfoState.chips.map((chip) => ({
								id: chip.id,
								label: chip.label,
								description: chip.description,
								required: chip.required,
								priority: chip.priority,
								examples: chip.examples,
								placeholder: chip.placeholder,
								inputType: chip.inputType,
								options: chip.options,
							}))}
							onSubmit={() => onIntentMissingInfoComplete()}
							onCancel={() => {}}
						/>
					</View>
				)}

			{/* Fallback Card */}
			{showFallback && (
				<FallbackCard
					spendPlan={fallbackData.spendPlan}
					budgets={fallbackData.budgets}
					goals={fallbackData.goals}
					lastSync={fallbackData.lastSync}
					onRetry={onRetry}
					onRefresh={onRefresh}
					isRetrying={isRetrying}
					showWorkButton={true}
					onShowWork={() => {}}
				/>
			)}

		</View>
	);
}

export default AssistantListFooter;

function Row({ text, color }: { text: string; color: string }) {
	return (
		<View style={styles.row}>
			<ActivityIndicator size="small" color={color} />
			<Text style={[styles.rowText, { color }]}>{text}</Text>
		</View>
	);
}

function Button({ title, onPress }: { title: string; onPress: () => void }) {
	return (
		<TouchableOpacity style={styles.completeButton} onPress={onPress}>
			<Text style={styles.completeText}>{title}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	rowText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
	missingInfoContainer: { marginTop: 16 },
	completeButton: {
		backgroundColor: '#10b981',
		borderRadius: 8,
		padding: 12,
		marginTop: 12,
		alignItems: 'center',
	},
	completeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// Default export to silence Expo Router warning (not used as route)
export default AssistantListFooter;
