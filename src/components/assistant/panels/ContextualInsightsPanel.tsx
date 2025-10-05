import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	InsightsContextService,
	Insight,
} from '../../../services/insights/insightsContextService';
import { useProfile } from '../../../context/profileContext';

type Props = {
	conversationContext?: string;
	onInsightPress?: (insight: Insight) => void;
	onAskAboutInsight?: (insight: Insight) => void;
	showAllInsights?: boolean;
	maxInsights?: number;
};

export default function ContextualInsightsPanel({
	conversationContext = '',
	onInsightPress,
	onAskAboutInsight,
	showAllInsights = false,
	maxInsights = 3,
}: Props) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const { profile } = useProfile();
	const svc = InsightsContextService.getInstance();

	// Check if AI insights are enabled in user settings
	const isAIInsightsEnabled =
		profile?.preferences?.aiInsights?.enabled !== false;

	// Debug: Log insights panel state changes
	useEffect(() => {
		console.log('🔧 [DEBUG] ContextualInsightsPanel state changed:', {
			isAIInsightsEnabled,
			hasProfile: !!profile,
			aiInsightsEnabled: profile?.preferences?.aiInsights?.enabled,
			timestamp: new Date().toISOString(),
		});
	}, [isAIInsightsEnabled, profile]);

	// Force refresh when insights state changes to trigger re-render
	useEffect(() => {
		// Add a small delay to allow insights service to load/clear data
		const timer = setTimeout(() => {
			setRefreshKey((prev) => prev + 1);
		}, 100);
		return () => clearTimeout(timer);
	}, [isAIInsightsEnabled]);

	const insights = useMemo(() => {
		// If AI insights are disabled, return empty array
		if (!isAIInsightsEnabled) {
			return [];
		}
		try {
			// If a conversation context exists, prefer relevant insights
			const rel = conversationContext
				? svc.getRelevantInsights(
						conversationContext,
						showAllInsights ? 10 : maxInsights
				  )
				: svc
						.getCriticalInsights()
						.slice(0, showAllInsights ? 10 : maxInsights);

			// Always return an array
			return Array.isArray(rel) ? rel : [];
		} catch {
			return [];
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		conversationContext,
		showAllInsights,
		maxInsights,
		isAIInsightsEnabled,
		refreshKey,
	]);

	if (!insights.length) {
		return null;
	}

	const visibleInsights = isExpanded ? insights : insights.slice(0, 2);

	return (
		<View style={styles.wrapper}>
			<View style={styles.headerRow}>
				<View style={styles.headerLeft}>
					<Text style={styles.headerLabel}>Contextual Insights</Text>
					<View style={styles.headerCountContainer}>
						<Ionicons name="bulb-outline" size={16} color="#6b7280" />
						<Text style={styles.headerCount}> {insights.length}</Text>
					</View>
				</View>

				{insights.length > 2 && (
					<TouchableOpacity
						style={styles.expandButton}
						onPress={() => setIsExpanded(!isExpanded)}
						accessibilityRole="button"
						accessibilityLabel={
							isExpanded ? 'Show fewer insights' : 'Show all insights'
						}
					>
						<Text style={styles.expandButtonText}>
							{isExpanded ? 'Show Less' : `Show All (${insights.length})`}
						</Text>
						<Ionicons
							name={isExpanded ? 'chevron-up' : 'chevron-down'}
							size={16}
							color="#3b82f6"
						/>
					</TouchableOpacity>
				)}
			</View>

			<FlatList
				data={visibleInsights}
				keyExtractor={(it) => it.id ?? `${it.title}-${it.action ?? 'na'}`}
				ItemSeparatorComponent={() => <View style={styles.sep} />}
				renderItem={({ item }) => (
					<View style={styles.card}>
						<View style={styles.cardTop}>
							<Text style={styles.cardTitle} accessibilityRole="header">
								{item.title || 'Insight'}
							</Text>
							{!!item.priority && (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>{item.priority}</Text>
								</View>
							)}
						</View>

						{!!item.message && (
							<Text style={styles.cardBody}>{item.message}</Text>
						)}

						<View style={styles.actions}>
							<TouchableOpacity
								onPress={() => onInsightPress?.(item)}
								style={styles.primaryBtn}
								accessibilityRole="button"
								accessibilityLabel={`Open action for ${item.title}`}
							>
								<Ionicons name="flash-outline" size={16} color="#fff" />
								<Text style={styles.primaryBtnText}>Do it</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => onAskAboutInsight?.(item)}
								style={styles.secondaryBtn}
								accessibilityRole="button"
								accessibilityLabel={`Ask about ${item.title}`}
							>
								<Ionicons
									name="chatbubble-ellipses-outline"
									size={16}
									color="#0369a1"
								/>
								<Text style={styles.secondaryBtnText}>Ask about this</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
				contentContainerStyle={{ paddingTop: 8 }}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 8,
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		padding: 12,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	headerLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111827',
		marginRight: 8,
	},
	headerCountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerCount: { fontSize: 12, color: '#6b7280' },
	expandButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 6,
		backgroundColor: '#f3f4f6',
	},
	expandButtonText: {
		fontSize: 12,
		color: '#3b82f6',
		fontWeight: '500',
	},
	sep: { height: 8 },
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		padding: 12,
	},
	cardTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111827',
		flex: 1,
		paddingRight: 8,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
		backgroundColor: '#EEF2FF',
		borderWidth: 1,
		borderColor: '#C7D2FE',
	},
	badgeText: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
	cardBody: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 18 },
	actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
	primaryBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#10B981',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
	primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
	secondaryBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#F0F9FF',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#0EA5E9',
	},
	secondaryBtnText: { color: '#0369A1', fontSize: 13, fontWeight: '600' },
});
