import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Modal,
	ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IntelligentActions from './IntelligentActions';
// Note: intelligentActionService was removed during reorganization
// This component may need to be updated to use alternative services

interface AIInsight {
	_id: string;
	userId: string;
	period: 'daily' | 'weekly' | 'monthly';
	title: string;
	message: string;
	detailedExplanation: string;
	insightType: 'budgeting' | 'savings' | 'spending' | 'income' | 'general';
	priority: 'low' | 'medium' | 'high';
	isRead: boolean;
	isActionable: boolean;
	actionItems: {
		title: string;
		description: string;
		completed: boolean;
	}[];
	metadata: {
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		topCategories: {
			name: string;
			amount: number;
			percentage: number;
		}[];
		comparisonPeriod: string;
		percentageChange: number;
		historicalComparison?: {
			previousPeriod: {
				totalIncome: number;
				totalExpenses: number;
				netIncome: number;
				topCategories: {
					name: string;
					amount: number;
					percentage: number;
				}[];
			};
			percentageChanges: {
				income: number;
				expenses: number;
				netIncome: number;
			};
		};
	};
	generatedAt: string;
	createdAt: string;
	updatedAt: string;
}

interface AISuggestionsListProps {
	suggestions: AIInsight[];
	onApplySuggestion?: (suggestion: any) => void;
	onInsightPress?: (insight: AIInsight) => void;
	showSmartActions?: boolean;
	onAllActionsCompleted?: () => void; // Add new prop
	compact?: boolean; // Add compact mode for quick actions
}

const AISuggestionsList: React.FC<AISuggestionsListProps> = ({
	suggestions,
	onApplySuggestion,
	onInsightPress,
	showSmartActions = false,
	onAllActionsCompleted, // Add new prop
	compact = false, // Add compact mode
}) => {
	const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [smartActionsVisible, setSmartActionsVisible] = useState(false);
	const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(
		null
	);

	const getInsightIcon = (insightType: string) => {
		switch (insightType) {
			case 'budgeting':
				return 'wallet';
			case 'savings':
				return 'trending-up';
			case 'spending':
				return 'trending-down';
			case 'income':
				return 'cash';
			default:
				return 'bulb';
		}
	};

	const getSuggestionIcon = (type: string) => {
		switch (type) {
			case 'budget':
				return 'wallet-outline';
			case 'goal':
				return 'flag-outline';
			case 'reminder':
				return 'notifications-outline';
			case 'tip':
				return 'bulb-outline';
			default:
				return 'checkmark-circle-outline';
		}
	};

	const getSuggestionColor = (type: string) => {
		switch (type) {
			case 'budget':
				return '#2E78B7';
			case 'goal':
				return '#9C27B0';
			case 'reminder':
				return '#FF9800';
			case 'tip':
				return '#4CAF50';
			default:
				return '#666';
		}
	};

	const handleApplySuggestion = (suggestion: any) => {
		setSelectedSuggestion(suggestion);
		setModalVisible(true);
	};

	const handleSmartActions = async (insight: AIInsight) => {
		setSelectedInsight(insight);
		setSmartActionsVisible(true);
	};

	const confirmApplySuggestion = () => {
		if (onApplySuggestion && selectedSuggestion) {
			onApplySuggestion(selectedSuggestion);
			Alert.alert('Success', 'Suggestion applied successfully!');
		}
		setModalVisible(false);
		setSelectedSuggestion(null);
	};

	const handleActionExecuted = (action: IntelligentAction, result: any) => {
		console.log('Smart action executed:', action, result);

		// Don't show success message here - let parent components handle it
		// if (result.success) {
		// 	Alert.alert(
		// 		'Success',
		// 		result.message || 'Action completed successfully!'
		// 	);
		// }

		// Don't close the modal - let the user see the completion status
		// The modal will only close when the user manually closes it
		// setSmartActionsVisible(false);
		// setSelectedInsight(null);
	};

	const renderSuggestionCard = (insight: AIInsight) => {
		// Convert actionItems to suggestions format
		const suggestions = insight.actionItems.map((item) => ({
			title: item.title,
			description: item.description,
			action: item.completed ? 'Completed' : 'Apply',
			type: (() => {
				if (item.title.toLowerCase().includes('budget'))
					return 'budget' as const;
				if (
					item.title.toLowerCase().includes('goal') ||
					item.title.toLowerCase().includes('save')
				)
					return 'goal' as const;
				if (item.title.toLowerCase().includes('remind'))
					return 'reminder' as const;
				return 'tip' as const;
			})(),
		}));

		// If compact mode, show simplified version
		if (compact) {
			return (
				<View key={insight._id} style={styles.compactInsightCard}>
					<View style={styles.compactInsightHeader}>
						<View style={styles.compactInsightIconContainer}>
							<Ionicons
								name={getInsightIcon(insight.insightType)}
								size={16}
								color="#2E78B7"
							/>
						</View>
						<View style={styles.compactInsightInfo}>
							<Text style={styles.compactInsightTitle}>{insight.title}</Text>
							<Text style={styles.compactInsightPeriod}>
								{insight.period.charAt(0).toUpperCase() +
									insight.period.slice(1)}
							</Text>
						</View>
						<View style={styles.compactInsightActions}>
							{!insight.isRead && <View style={styles.unreadDot} />}
							{showSmartActions && (
								<TouchableOpacity
									style={styles.compactSmartActionsButton}
									onPress={() => handleSmartActions(insight)}
								>
									<Ionicons name="sparkles" size={14} color="#4A90E2" />
								</TouchableOpacity>
							)}
						</View>
					</View>
					<Text style={styles.compactInsightMessage}>{insight.message}</Text>
					{/* Show first 2 suggestions in compact mode */}
					<View style={styles.compactSuggestionsContainer}>
						{suggestions.slice(0, 2).map((suggestion, index) => (
							<TouchableOpacity
								key={index}
								style={styles.compactSuggestionItem}
								onPress={() => handleApplySuggestion(suggestion)}
							>
								<Ionicons
									name={getSuggestionIcon(suggestion.type)}
									size={14}
									color={getSuggestionColor(suggestion.type)}
								/>
								<Text style={styles.compactSuggestionTitle}>
									{suggestion.title}
								</Text>
							</TouchableOpacity>
						))}
						{suggestions.length > 2 && (
							<TouchableOpacity
								style={styles.compactMoreButton}
								onPress={() => onInsightPress?.(insight)}
							>
								<Text style={styles.compactMoreButtonText}>
									+{suggestions.length - 2} more actions
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			);
		}

		// Full version
		return (
			<View key={insight._id} style={styles.insightCard}>
				<View style={styles.insightHeader}>
					<View style={styles.insightIconContainer}>
						<Ionicons
							name={getInsightIcon(insight.insightType)}
							size={20}
							color="#2E78B7"
						/>
					</View>
					<View style={styles.insightInfo}>
						<Text style={styles.insightPeriod}>
							{insight.period.charAt(0).toUpperCase() + insight.period.slice(1)}{' '}
							Insight
						</Text>
						<Text style={styles.insightDate}>
							{new Date(insight.generatedAt).toLocaleDateString()}
						</Text>
					</View>
					<View style={styles.headerActions}>
						{!insight.isRead && <View style={styles.unreadDot} />}
						{showSmartActions && (
							<TouchableOpacity
								style={styles.smartActionsButton}
								onPress={() => handleSmartActions(insight)}
							>
								<Ionicons name="sparkles" size={16} color="#4A90E2" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				<Text style={styles.insightMessage}>{insight.message}</Text>

				<View style={styles.suggestionsContainer}>
					<Text style={styles.suggestionsTitle}>Suggested Actions:</Text>
					{suggestions.map((suggestion, index) => (
						<TouchableOpacity
							key={index}
							style={styles.suggestionItem}
							onPress={() => handleApplySuggestion(suggestion)}
						>
							<View style={styles.suggestionHeader}>
								<Ionicons
									name={getSuggestionIcon(suggestion.type)}
									size={16}
									color={getSuggestionColor(suggestion.type)}
								/>
								<Text style={styles.suggestionTitle}>{suggestion.title}</Text>
							</View>
							<Text style={styles.suggestionDescription}>
								{suggestion.description}
							</Text>
							<TouchableOpacity
								style={[
									styles.applyButton,
									{ backgroundColor: getSuggestionColor(suggestion.type) },
								]}
								onPress={() => handleApplySuggestion(suggestion)}
							>
								<Text style={styles.applyButtonText}>{suggestion.action}</Text>
							</TouchableOpacity>
						</TouchableOpacity>
					))}
				</View>

				{onInsightPress && (
					<TouchableOpacity
						style={styles.exploreButton}
						onPress={() => {
							console.log(
								'🎯 AISuggestionsList: Explore More pressed for insight:',
								insight
							);
							console.log(
								'🎯 AISuggestionsList: Calling onInsightPress with insight:',
								insight
							);
							onInsightPress(insight);
						}}
					>
						<Text style={styles.exploreButtonText}>Explore More →</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	return (
		<View style={[styles.container, compact && styles.compactContainer]}>
			{!compact && <Text style={styles.title}>AI Coach</Text>}

			{suggestions.length > 0 ? (
				suggestions.map(renderSuggestionCard)
			) : (
				<View style={styles.emptyState}>
					<Ionicons name="bulb-outline" size={48} color="#CCC" />
					<Text style={styles.emptyText}>No suggestions available</Text>
					<Text style={styles.emptySubtext}>
						Add more transactions to get personalized AI suggestions
					</Text>
				</View>
			)}

			{/* Apply Suggestion Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Apply Suggestion</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={24} color="#666" />
							</TouchableOpacity>
						</View>

						{selectedSuggestion && (
							<ScrollView style={styles.modalBody}>
								<View style={styles.modalSuggestion}>
									<Ionicons
										name={getSuggestionIcon(selectedSuggestion.type)}
										size={32}
										color={getSuggestionColor(selectedSuggestion.type)}
									/>
									<Text style={styles.modalSuggestionTitle}>
										{selectedSuggestion.title}
									</Text>
									<Text style={styles.modalSuggestionDescription}>
										{selectedSuggestion.description}
									</Text>
								</View>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={styles.cancelButton}
										onPress={() => setModalVisible(false)}
									>
										<Text style={styles.cancelButtonText}>Cancel</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.confirmButton,
											{
												backgroundColor: getSuggestionColor(
													selectedSuggestion.type
												),
											},
										]}
										onPress={confirmApplySuggestion}
									>
										<Text style={styles.confirmButtonText}>
											{selectedSuggestion.action}
										</Text>
									</TouchableOpacity>
								</View>
							</ScrollView>
						)}
					</View>
				</View>
			</Modal>

			{/* Smart Actions Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={smartActionsVisible}
				onRequestClose={() => setSmartActionsVisible(false)}
			>
				<SafeAreaView style={styles.modalOverlay}>
					<View style={styles.smartActionsModalContent}>
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
							<View style={styles.smartActionsBody}>
								<IntelligentActions
									insight={selectedInsight}
									period={selectedInsight.period || 'weekly'}
									onActionExecuted={handleActionExecuted}
									onClose={() => setSmartActionsVisible(false)}
									onAllActionsCompleted={onAllActionsCompleted} // Pass through the callback
								/>
							</View>
						)}
					</View>
				</SafeAreaView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	compactContainer: {
		padding: 0,
		backgroundColor: 'transparent',
		shadowOpacity: 0,
		elevation: 0,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
		color: '#333',
	},
	insightCard: {
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	insightIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	insightInfo: {
		flex: 1,
	},
	insightPeriod: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
	},
	insightDate: {
		fontSize: 12,
		color: '#666',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF9500',
	},
	smartActionsButton: {
		padding: 4,
		borderRadius: 4,
		backgroundColor: '#F0F8FF',
	},
	insightMessage: {
		fontSize: 14,
		color: '#333',
		lineHeight: 20,
		marginBottom: 16,
	},
	suggestionsContainer: {
		marginBottom: 12,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	suggestionItem: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	suggestionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	suggestionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	suggestionDescription: {
		fontSize: 12,
		color: '#666',
		marginBottom: 8,
		lineHeight: 16,
	},
	applyButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	applyButtonText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	exploreButton: {
		alignSelf: 'flex-end',
		paddingVertical: 8,
	},
	exploreButtonText: {
		color: '#2E78B7',
		fontSize: 14,
		fontWeight: '500',
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 8,
		fontSize: 16,
		fontWeight: '500',
		color: '#666',
	},
	emptySubtext: {
		marginTop: 4,
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 20,
		paddingBottom: 20,
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		margin: 20,
		maxHeight: '80%',
		width: '90%',
	},
	smartActionsModalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		margin: 20,
		maxHeight: '80%',
		width: '95%',
		flex: 1,
		minHeight: 400,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	closeButton: {
		padding: 4,
	},
	modalBody: {
		padding: 20,
	},
	smartActionsBody: {
		flex: 1,
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	modalSuggestion: {
		alignItems: 'center',
		marginBottom: 24,
	},
	modalSuggestionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginTop: 12,
		marginBottom: 8,
		textAlign: 'center',
	},
	modalSuggestionDescription: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		lineHeight: 20,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
	},
	cancelButtonText: {
		color: '#666',
		fontSize: 16,
		fontWeight: '500',
	},
	confirmButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	confirmButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	// Compact mode styles
	compactInsightCard: {
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	compactInsightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	compactInsightIconContainer: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	compactInsightInfo: {
		flex: 1,
	},
	compactInsightTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 2,
	},
	compactInsightPeriod: {
		fontSize: 11,
		color: '#666',
	},
	compactInsightActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	compactSmartActionsButton: {
		padding: 2,
		borderRadius: 3,
		backgroundColor: '#F0F8FF',
	},
	compactInsightMessage: {
		fontSize: 12,
		color: '#666',
		lineHeight: 16,
		marginBottom: 8,
	},
	compactSuggestionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	compactSuggestionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	compactSuggestionTitle: {
		fontSize: 11,
		color: '#333',
		marginLeft: 4,
	},
	compactMoreButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#E3F2FD',
	},
	compactMoreButtonText: {
		fontSize: 11,
		color: '#2E78B7',
		fontWeight: '500',
	},
});

export default AISuggestionsList;
