import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	AICategorizationService,
	CategorizationSuggestion,
} from '../services/aiCategorizationService';

interface AICategorizationSuggestionsProps {
	transactionId: string;
	onSuggestionSelect?: (suggestion: CategorizationSuggestion) => void;
	onLearnFromCorrection?: (category: string) => void;
}

const AICategorizationSuggestions: React.FC<
	AICategorizationSuggestionsProps
> = ({ transactionId, onSuggestionSelect, onLearnFromCorrection }) => {
	const [suggestions, setSuggestions] = useState<CategorizationSuggestion[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [selectedSuggestion, setSelectedSuggestion] =
		useState<CategorizationSuggestion | null>(null);

	useEffect(() => {
		loadSuggestions();
	}, [transactionId]);

	const loadSuggestions = async () => {
		try {
			setLoading(true);
			const data = await AICategorizationService.getCategorizationSuggestions(
				transactionId
			);
			setSuggestions(data);
		} catch (error) {
			console.error(
				'[AICategorizationSuggestions] Error loading suggestions:',
				error
			);
			Alert.alert('Error', 'Failed to load categorization suggestions');
		} finally {
			setLoading(false);
		}
	};

	const handleSuggestionPress = (suggestion: CategorizationSuggestion) => {
		setSelectedSuggestion(suggestion);
		if (onSuggestionSelect) {
			onSuggestionSelect(suggestion);
		}
	};

	const handleLearnFromCorrection = async (category: string) => {
		try {
			const result = await AICategorizationService.learnFromUserCorrection(
				transactionId,
				category
			);

			if (result.success) {
				Alert.alert('Success', 'AI has learned from your correction!');
				if (onLearnFromCorrection) {
					onLearnFromCorrection(category);
				}
			} else {
				Alert.alert('Error', result.error || 'Failed to learn from correction');
			}
		} catch (error) {
			console.error(
				'[AICategorizationSuggestions] Error learning from correction:',
				error
			);
			Alert.alert('Error', 'Failed to learn from correction');
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#007ACC" />
				<Text style={styles.loadingText}>Loading suggestions...</Text>
			</View>
		);
	}

	if (suggestions.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Ionicons name="brain" size={32} color="#ccc" />
				<Text style={styles.emptyTitle}>No Suggestions Available</Text>
				<Text style={styles.emptyText}>
					Add more transactions to get AI categorization suggestions
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="brain" size={20} color="#007ACC" />
				<Text style={styles.title}>AI Categorization Suggestions</Text>
			</View>

			<ScrollView
				style={styles.suggestionsList}
				showsVerticalScrollIndicator={false}
			>
				{suggestions.map((suggestion, index) => {
					const confidenceColor = AICategorizationService.getConfidenceColor(
						suggestion.confidence
					);
					const typeColor = AICategorizationService.getSuggestionTypeColor(
						suggestion.type
					);
					const typeIcon = AICategorizationService.getSuggestionTypeIcon(
						suggestion.type
					);
					const isSelected =
						selectedSuggestion?.category === suggestion.category;

					return (
						<TouchableOpacity
							key={index}
							style={[styles.suggestionItem, isSelected && styles.selectedItem]}
							onPress={() => handleSuggestionPress(suggestion)}
						>
							<View style={styles.suggestionHeader}>
								<View style={styles.categoryInfo}>
									<Text style={styles.categoryName}>{suggestion.category}</Text>
									{suggestion.budget && (
										<Text style={styles.budgetName}>
											{suggestion.budget.name}
										</Text>
									)}
								</View>
								<View style={styles.confidenceContainer}>
									<Text
										style={[styles.confidenceText, { color: confidenceColor }]}
									>
										{AICategorizationService.formatConfidence(
											suggestion.confidence
										)}
									</Text>
								</View>
							</View>

							<View style={styles.suggestionDetails}>
								<View style={styles.typeRow}>
									<View
										style={[styles.typeBadge, { backgroundColor: typeColor }]}
									>
										<Ionicons name={typeIcon} size={12} color="#fff" />
										<Text style={styles.typeText}>
											{AICategorizationService.formatSuggestionType(
												suggestion.type
											)}
										</Text>
									</View>
								</View>
								<Text style={styles.reasonText}>{suggestion.reason}</Text>
							</View>

							{isSelected && (
								<View style={styles.selectedIndicator}>
									<Ionicons name="checkmark-circle" size={16} color="#4caf50" />
									<Text style={styles.selectedText}>Selected</Text>
								</View>
							)}
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{selectedSuggestion && (
				<View style={styles.actionContainer}>
					<TouchableOpacity
						style={styles.learnButton}
						onPress={() =>
							handleLearnFromCorrection(selectedSuggestion.category)
						}
					>
						<Ionicons name="school" size={16} color="#fff" />
						<Text style={styles.learnButtonText}>Teach AI This Category</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	loadingContainer: {
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 8,
		color: '#666',
		fontSize: 14,
	},
	emptyContainer: {
		alignItems: 'center',
		padding: 40,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
		marginTop: 10,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginTop: 5,
		lineHeight: 20,
	},
	suggestionsList: {
		flex: 1,
	},
	suggestionItem: {
		backgroundColor: '#fff',
		marginHorizontal: 20,
		marginVertical: 8,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#f0f0f0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	selectedItem: {
		borderColor: '#4caf50',
		backgroundColor: '#f8fff8',
	},
	suggestionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	categoryInfo: {
		flex: 1,
	},
	categoryName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 2,
	},
	budgetName: {
		fontSize: 12,
		color: '#666',
	},
	confidenceContainer: {
		alignItems: 'flex-end',
	},
	confidenceText: {
		fontSize: 14,
		fontWeight: '700',
	},
	suggestionDetails: {
		marginBottom: 8,
	},
	typeRow: {
		marginBottom: 8,
	},
	typeBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignSelf: 'flex-start',
	},
	typeText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#fff',
		marginLeft: 4,
	},
	reasonText: {
		fontSize: 13,
		color: '#666',
		lineHeight: 18,
	},
	selectedIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	selectedText: {
		fontSize: 12,
		color: '#4caf50',
		fontWeight: '600',
		marginLeft: 4,
	},
	actionContainer: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	learnButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#007ACC',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	learnButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 8,
	},
});

export default AICategorizationSuggestions;
