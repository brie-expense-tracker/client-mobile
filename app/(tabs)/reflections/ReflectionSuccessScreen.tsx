import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Platform,
	TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { WeeklyReflection } from '../../../src/services';
import { ReflectionStatsCard } from './components/ReflectionStatsCard';
import { FinancialMetricsCard } from './components/FinancialMetricsCard';
import { MoodRatingSelector } from './components/MoodRatingSelector';
import {
	accessibilityProps,
	dynamicTextStyle,
} from '../../../src/utils/accessibility';

interface ReflectionSuccessScreenProps {
	reflection: WeeklyReflection;
	onBack: () => void;
	onEdit: () => void;
}

export default function ReflectionSuccessScreen({
	reflection,
	onBack,
	onEdit,
}: ReflectionSuccessScreenProps) {
	const getMoodEmoji = (rating?: number) => {
		switch (rating) {
			case 1:
				return '😞';
			case 2:
				return '😐';
			case 3:
				return '🙂';
			case 4:
				return '😊';
			case 5:
				return '😍';
			default:
				return '🤔';
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.headerTitle, dynamicTextStyle]}>
					Reflection Complete!
				</Text>
				<Text style={[styles.headerSubtitle, dynamicTextStyle]}>
					Great job taking time to reflect on your week
				</Text>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={{ ...styles.scrollContent, paddingBottom: 80 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Success Card */}
				<View style={[styles.successCard, shadowCard]}>
					<View style={styles.successIcon}>
						<Ionicons name="checkmark-circle" size={48} color="#10B981" />
					</View>
					<Text style={[styles.successTitle, dynamicTextStyle]}>
						Week's Reflection Saved
					</Text>
					<Text style={[styles.successSubtitle, dynamicTextStyle]}>
						Your insights and progress have been recorded for this week
					</Text>
				</View>

				{/* Mood Summary */}
				{reflection.moodRating && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.cardTitle, dynamicTextStyle]}>Your Mood</Text>
						<View style={styles.moodSummary}>
							<Text style={styles.moodEmoji}>
								{getMoodEmoji(reflection.moodRating)}
							</Text>
							<Text style={[styles.moodRating, dynamicTextStyle]}>
								{reflection.moodRating}/5
							</Text>
							<Text style={[styles.moodLabel, dynamicTextStyle]}>
								{reflection.moodRating === 1 && 'Not great'}
								{reflection.moodRating === 2 && 'Could be better'}
								{reflection.moodRating === 3 && 'Alright'}
								{reflection.moodRating === 4 && 'Pretty good'}
								{reflection.moodRating === 5 && 'Excellent'}
							</Text>
						</View>
					</View>
				)}

				{/* Win of the Week */}
				{reflection.winOfTheWeek && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.cardTitle, dynamicTextStyle]}>
							Win of the Week
						</Text>
						<View style={styles.winContainer}>
							<Ionicons name="trophy" size={24} color="#F59E0B" />
							<Text style={[styles.winText, dynamicTextStyle]}>
								{reflection.winOfTheWeek}
							</Text>
						</View>
					</View>
				)}

				{/* Notes */}
				{reflection.reflectionNotes && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.cardTitle, dynamicTextStyle]}>
							Reflection Notes
						</Text>
						<View style={styles.notesContainer}>
							<Ionicons name="document-text" size={24} color="#6B7280" />
							<Text style={[styles.notesText, dynamicTextStyle]}>
								{reflection.reflectionNotes}
							</Text>
						</View>
					</View>
				)}

				{/* Financial Metrics */}
				<View style={[styles.card, shadowCard]}>
					<Text style={[styles.cardTitle, dynamicTextStyle]}>
						Week's Financial Summary
					</Text>
					<FinancialMetricsCard metrics={reflection.financialMetrics} />
				</View>

				{/* Stats */}
				<View style={[styles.card, shadowCard]}>
					<Text style={[styles.cardTitle, dynamicTextStyle]}>
						Reflection Stats
					</Text>
					<ReflectionStatsCard reflection={reflection} />
				</View>

				{/* Week Info */}
				<View style={[styles.card, shadowCard]}>
					<Text style={[styles.cardTitle, dynamicTextStyle]}>Week Details</Text>
					<View style={styles.weekInfo}>
						<View style={styles.weekInfoRow}>
							<Ionicons name="calendar" size={20} color="#6B7280" />
							<Text style={[styles.weekInfoLabel, dynamicTextStyle]}>
								Week of:
							</Text>
							<Text style={[styles.weekInfoValue, dynamicTextStyle]}>
								{new Date(reflection.weekStartDate).toLocaleDateString(
									'en-US',
									{
										month: 'short',
										day: 'numeric',
										year: 'numeric',
									}
								)}
							</Text>
						</View>
						<View style={styles.weekInfoRow}>
							<Ionicons name="time" size={20} color="#6B7280" />
							<Text style={[styles.weekInfoLabel, dynamicTextStyle]}>
								Completed:
							</Text>
							<Text style={[styles.weekInfoValue, dynamicTextStyle]}>
								{new Date(
									reflection.completedAt || reflection.updatedAt
								).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								})}
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>

			{/* Footer Actions */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]}
					onPress={onEdit}
					{...accessibilityProps.button}
				>
					<Text style={styles.secondaryBtnText}>Edit Reflection</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.primaryBtn, { flex: 1 }]}
					onPress={onBack}
					{...accessibilityProps.button}
				>
					<Text style={styles.primaryBtnText}>Back to Reflections</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

// ---------------- Styles ----------------
const shadowCard = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowOffset: { width: 0, height: 6 },
		shadowRadius: 16,
	},
	android: { elevation: 2 },
});

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8FAFC' },

	header: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#111827',
		textAlign: 'center',
	},
	headerSubtitle: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		marginTop: 4,
	},

	scrollView: { flex: 1 },
	scrollContent: { padding: 16, paddingBottom: 120 },

	successCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 24,
		alignItems: 'center',
		marginBottom: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
	},
	successIcon: {
		marginBottom: 12,
	},
	successTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#111827',
		textAlign: 'center',
		marginBottom: 8,
	},
	successSubtitle: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 22,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
		marginBottom: 12,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 12,
	},

	moodSummary: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	moodEmoji: {
		fontSize: 32,
	},
	moodRating: {
		fontSize: 24,
		fontWeight: '800',
		color: '#111827',
	},
	moodLabel: {
		fontSize: 16,
		color: '#6B7280',
		flex: 1,
	},

	winContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	winText: {
		fontSize: 16,
		color: '#111827',
		flex: 1,
		lineHeight: 22,
	},

	notesContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	notesText: {
		fontSize: 16,
		color: '#111827',
		flex: 1,
		lineHeight: 22,
	},

	weekInfo: {
		gap: 8,
	},
	weekInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	weekInfoLabel: {
		fontSize: 14,
		color: '#6B7280',
		flex: 1,
	},
	weekInfoValue: {
		fontSize: 14,
		color: '#111827',
		fontWeight: '600',
	},

	footer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		backgroundColor: '#F8FAFC',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
		zIndex: 10,
	},
	primaryBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#00a2ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '800',
	},
	secondaryBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtnText: {
		color: '#111827',
		fontSize: 16,
		fontWeight: '700',
	},
});
