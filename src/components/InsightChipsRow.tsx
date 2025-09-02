import React from 'react';
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InsightChip, InsightCard } from './InsightChip';

interface InsightChipsRowProps {
	insights: InsightCard[];
	title?: string;
	onInsightPress?: (insight: InsightCard) => void;
	onCTAPress?: (action: string, payload?: any) => void;
	variant?: 'compact' | 'full';
	showTitle?: boolean;
	maxInsights?: number;
}

export function InsightChipsRow({
	insights,
	title = 'Quick Insights',
	onInsightPress,
	onCTAPress,
	variant = 'compact',
	showTitle = true,
	maxInsights = 5,
}: InsightChipsRowProps) {
	if (!insights || insights.length === 0) {
		return null;
	}

	const displayInsights = insights.slice(0, maxInsights);
	const hasMore = insights.length > maxInsights;

	const handleInsightPress = (insight: InsightCard) => {
		if (onInsightPress) {
			onInsightPress(insight);
		}
	};

	const handleCTAPress = (action: string, payload?: any) => {
		if (onCTAPress) {
			onCTAPress(action, payload);
		}
	};

	return (
		<View style={styles.container}>
			{showTitle && (
				<View style={styles.header}>
					<View style={styles.titleContainer}>
						<Ionicons name="sparkles" size={16} color="#3b82f6" />
						<Text style={styles.title}>{title}</Text>
					</View>
					{hasMore && (
						<TouchableOpacity style={styles.moreButton}>
							<Text style={styles.moreText}>View All</Text>
							<Ionicons name="chevron-forward" size={14} color="#6b7280" />
						</TouchableOpacity>
					)}
				</View>
			)}

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				style={styles.scrollView}
			>
				{displayInsights.map((insight) => (
					<InsightChip
						key={insight.id}
						insight={insight}
						variant={variant}
						onPress={() => handleInsightPress(insight)}
						onCTAPress={handleCTAPress}
					/>
				))}

				{hasMore && (
					<View style={styles.moreChip}>
						<Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
						<Text style={styles.moreChipText}>
							+{insights.length - maxInsights} more
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginVertical: 8,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		marginBottom: 12,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
	},
	moreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	moreText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
	scrollView: {
		flexGrow: 0,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingRight: 20,
	},
	moreChip: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		minWidth: 100,
		marginLeft: 8,
	},
	moreChipText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
		marginTop: 4,
	},
});
