import React, { useState, useEffect, useCallback, FC } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AIInsight } from '../services/insightsService';
import { IntelligentAction } from '../services/intelligentActionService';
import IntelligentActions from './IntelligentActions';

interface AICoachProps {
	insights?: AIInsight[] | null;
	onInsightPress?: (insight: AIInsight) => void;
	onRefresh?: () => void;
	loading?: boolean;
}

const AICoach: FC<AICoachProps> = (props) => {
	const { insights = [], onInsightPress, onRefresh, loading = false } = props;

	// Ensure insights is always an array and handle any potential issues
	const safeInsights = Array.isArray(insights) ? insights : [];

	const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(
		null
	);
	const [smartActionsVisible, setSmartActionsVisible] = useState(false);

	const handleInsightPress = (insight: AIInsight) => {
		if (onInsightPress) {
			onInsightPress(insight);
		}
	};

	const handleSmartActions = (insight: AIInsight) => {
		setSelectedInsight(insight);
		setSmartActionsVisible(true);
	};

	const handleActionExecuted = (action: IntelligentAction, result: any) => {
		console.log('Smart action executed:', action, result);

		if (result.success) {
			Alert.alert(
				'Success',
				result.message || 'Action completed successfully!'
			);
		}

		setSmartActionsVisible(false);
		setSelectedInsight(null);
	};

	const renderInsightCard = (insight: AIInsight) => {
		// Safety check for insight object
		if (!insight || typeof insight !== 'object') {
			return null;
		}

		return (
			<View key={insight._id || Math.random()} style={styles.insightCard}>
				<LinearGradient
					colors={['#ffffff', '#f8fafc']}
					style={styles.cardGradient}
				>
					<View style={styles.cardHeader}>
						<View style={styles.headerLeft}>
							<View style={styles.iconContainer}>
								<Ionicons name="bulb" size={20} color="#2E78B7" />
							</View>
							<View style={styles.headerInfo}>
								<Text style={styles.insightTitle}>
									{insight.title || 'Untitled Insight'}
								</Text>
								<Text style={styles.insightPeriod}>
									{(insight.period || 'weekly').charAt(0).toUpperCase() +
										(insight.period || 'weekly').slice(1)}{' '}
									•{' '}
									{insight.generatedAt
										? new Date(insight.generatedAt).toLocaleDateString()
										: 'Unknown date'}
								</Text>
							</View>
						</View>
						<View style={styles.headerRight}>
							{!insight.isRead && <View style={styles.unreadDot} />}
						</View>
					</View>

					<Text style={styles.insightMessage}>
						{insight.message || 'No message available'}
					</Text>

					<View style={styles.cardActions}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={() => handleSmartActions(insight)}
						>
							<Ionicons name="sparkles" size={16} color="#4A90E2" />
							<Text style={styles.actionButtonText}>Smart Actions</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.exploreButton}
							onPress={() => handleInsightPress(insight)}
						>
							<Text style={styles.exploreButtonText}>Explore</Text>
							<Ionicons name="arrow-forward" size={16} color="#2E78B7" />
						</TouchableOpacity>
					</View>
				</LinearGradient>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2E78B7" />
				<Text style={styles.loadingText}>Loading AI insights...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{safeInsights.length > 0 ? (
					safeInsights.map(renderInsightCard)
				) : (
					<View style={styles.emptyState}>
						<Ionicons name="bulb-outline" size={64} color="#CCC" />
						<Text style={styles.emptyTitle}>No insights yet</Text>
						<Text style={styles.emptyText}>
							Add some transactions to get personalized AI insights and smart
							actions.
						</Text>
					</View>
				)}
			</ScrollView>

			{/* Smart Actions Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={smartActionsVisible}
				onRequestClose={() => setSmartActionsVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Smart Actions</Text>
							<TouchableOpacity
								onPress={() => setSmartActionsVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={24} color="#666" />
							</TouchableOpacity>
						</View>

						{selectedInsight && (
							<View style={styles.modalBody}>
								<IntelligentActions
									insight={selectedInsight}
									onActionExecuted={handleActionExecuted}
									onClose={() => setSmartActionsVisible(false)}
								/>
							</View>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	content: {
		flex: 1,
		padding: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	insightCard: {
		marginBottom: 16,
		borderRadius: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	cardGradient: {
		padding: 20,
		borderRadius: 16,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	headerInfo: {
		flex: 1,
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 2,
	},
	insightPeriod: {
		fontSize: 12,
		color: '#6b7280',
	},
	headerRight: {
		alignItems: 'flex-end',
		gap: 8,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF9500',
	},
	insightMessage: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 16,
	},
	cardActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#F0F8FF',
		borderRadius: 8,
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#4A90E2',
		marginLeft: 4,
	},
	exploreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	exploreButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#2E78B7',
		marginRight: 4,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 60,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		paddingHorizontal: 32,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		margin: 20,
		maxHeight: '90%',
		width: '95%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2937',
	},
	closeButton: {
		padding: 4,
	},
	modalBody: {
		flex: 1,
	},
});

AICoach.displayName = 'AICoach';

export default AICoach;
