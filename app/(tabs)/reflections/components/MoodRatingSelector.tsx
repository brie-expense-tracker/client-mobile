import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface MoodRatingSelectorProps {
	rating?: number;
	onRatingChange: (rating: number) => void;
	disabled?: boolean;
	showTrend?: boolean;
	previousRating?: number;
}

export function MoodRatingSelector({
	rating,
	onRatingChange,
	disabled = false,
	showTrend = false,
	previousRating,
}: MoodRatingSelectorProps) {
	const handleRatingPress = async (moodRating: number) => {
		if (disabled) return;

		// Provide haptic feedback
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onRatingChange(moodRating);
	};
	const getMoodIcon = (moodRating: number) => {
		switch (moodRating) {
			case 1:
				return 'sad-outline';
			case 2:
				return 'thumbs-down-outline';
			case 3:
				return 'remove-outline';
			case 4:
				return 'thumbs-up-outline';
			case 5:
				return 'heart-outline';
			default:
				return 'help-outline';
		}
	};

	const getMoodColor = (moodRating: number) => {
		switch (moodRating) {
			case 1:
				return '#ff4444';
			case 2:
				return '#ff8800';
			case 3:
				return '#ffcc00';
			case 4:
				return '#88cc00';
			case 5:
				return '#00aa00';
			default:
				return '#ccc';
		}
	};

	const getMoodLabel = (moodRating: number) => {
		switch (moodRating) {
			case 1:
				return 'Very Poor';
			case 2:
				return 'Poor';
			case 3:
				return 'Neutral';
			case 4:
				return 'Good';
			case 5:
				return 'Excellent';
			default:
				return 'Not Rated';
		}
	};

	const getTrendIndicator = () => {
		if (!showTrend || !previousRating || !rating) return null;
		
		if (rating > previousRating) {
			return { icon: 'trending-up', color: '#4CAF50', text: 'Improved' };
		} else if (rating < previousRating) {
			return { icon: 'trending-down', color: '#F44336', text: 'Declined' };
		} else {
			return { icon: 'remove', color: '#FF9800', text: 'Same' };
		}
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, dynamicTextStyle]}>How was your week?</Text>
			<Text style={[styles.subtitle, dynamicTextStyle]}>
				Rate your overall mood and satisfaction
			</Text>
			<Text style={[styles.helpText, dynamicTextStyle]}>
				1 = Very Poor • 2 = Poor • 3 = Neutral • 4 = Good • 5 = Excellent
			</Text>

			<View style={styles.ratingContainer}>
				{[1, 2, 3, 4, 5].map((moodRating) => (
					<TouchableOpacity
						key={moodRating}
						style={[
							styles.ratingButton,
							rating === moodRating && styles.selectedRating,
							disabled && styles.disabledButton,
						]}
						onPress={() => handleRatingPress(moodRating)}
						disabled={disabled}
						accessibilityRole="button"
						accessibilityLabel={`Rate mood ${moodRating}: ${getMoodLabel(
							moodRating
						)}`}
						accessibilityHint={`Double tap to rate your week as ${getMoodLabel(
							moodRating
						).toLowerCase()}`}
						accessibilityState={{
							selected: rating === moodRating,
							disabled: disabled,
						}}
					>
						<Ionicons
							name={getMoodIcon(moodRating)}
							size={24}
							color={
								rating === moodRating
									? '#fff'
									: disabled
									? '#ccc'
									: getMoodColor(moodRating)
							}
						/>
						<Text
							style={[
								styles.ratingNumber,
								rating === moodRating && styles.selectedRatingText,
								disabled && styles.disabledText,
							]}
						>
							{moodRating}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{rating && (
				<View style={styles.selectedMoodContainer}>
					<Text style={[styles.selectedMoodLabel, dynamicTextStyle]}>
						Selected: {getMoodLabel(rating)}
					</Text>
					{getTrendIndicator() && (
						<View style={styles.trendContainer}>
							<Ionicons
								name={getTrendIndicator()!.icon as any}
								size={16}
								color={getTrendIndicator()!.color}
							/>
							<Text style={[styles.trendText, { color: getTrendIndicator()!.color }]}>
								{getTrendIndicator()!.text} from last week
							</Text>
						</View>
					)}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
	},
	helpText: {
		fontSize: 12,
		color: '#999',
		marginBottom: 16,
		textAlign: 'center',
	},
	ratingContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	ratingButton: {
		alignItems: 'center',
		justifyContent: 'center',
		width: 50,
		height: 50,
		borderRadius: 25,
		borderWidth: 2,
		borderColor: '#e0e0e0',
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	selectedRating: {
		backgroundColor: '#00a2ff',
		borderColor: '#00a2ff',
		shadowColor: '#00a2ff',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
		transform: [{ scale: 1.05 }],
	},
	disabledButton: {
		opacity: 0.5,
	},
	ratingNumber: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
		marginTop: 2,
	},
	selectedRatingText: {
		color: '#fff',
	},
	disabledText: {
		color: '#ccc',
	},
	selectedMoodContainer: {
		alignItems: 'center',
		paddingTop: 8,
	},
	selectedMoodLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#00a2ff',
	},
	trendContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 4,
	},
	trendText: {
		fontSize: 12,
		fontWeight: '500',
	},
});

export default MoodRatingSelector;
