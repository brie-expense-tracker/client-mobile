import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWeeklyReflection } from '../../../src/hooks/useWeeklyReflection';
import { WeeklyReflectionCard } from './components/WeeklyReflectionCard';
import { MoodRatingSelector } from './components/MoodRatingSelector';
import { WinOfTheWeekInput } from './components/WinOfTheWeekInput';
import { ReflectionNotesInput } from './components/ReflectionNotesInput';
import { FinancialMetricsCard } from './components/FinancialMetricsCard';
import { ReflectionStatsCard } from './components/ReflectionStatsCard';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';

export default function WeeklyReflectionsScreen() {
	const {
		currentReflection,
		loading,
		saving,
		error,
		saveReflection,
		updateMoodRating,
		updateWinOfTheWeek,
		refreshReflection,
	} = useWeeklyReflection();

	const [refreshing, setRefreshing] = useState(false);
	const [showStats, setShowStats] = useState(false);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await refreshReflection();
		} catch (err) {
			console.error('Error refreshing reflection:', err);
		} finally {
			setRefreshing(false);
		}
	};

	const handleSaveReflection = async (data: any) => {
		try {
			await saveReflection(data);
			Alert.alert('Success', 'Weekly reflection saved successfully!');
		} catch (err) {
			Alert.alert(
				'Error',
				'Failed to save weekly reflection. Please try again.'
			);
		}
	};

	const handleMoodRatingChange = async (rating: number) => {
		try {
			await updateMoodRating(rating);
		} catch (err) {
			Alert.alert('Error', 'Failed to update mood rating. Please try again.');
		}
	};

	const handleWinOfTheWeekChange = async (win: string) => {
		try {
			await updateWinOfTheWeek(win);
		} catch (err) {
			Alert.alert(
				'Error',
				'Failed to update win of the week. Please try again.'
			);
		}
	};

	if (loading && !currentReflection) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#00a2ff" />
					<Text style={[styles.loadingText, dynamicTextStyle]}>
						Loading weekly reflection...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="#00a2ff"
						colors={['#00a2ff']}
					/>
				}
				accessibilityLabel="Weekly reflections content"
			>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<Text
							style={[styles.title, dynamicTextStyle]}
							accessibilityRole="header"
							accessibilityLabel="Weekly reflections"
						>
							Weekly Reflections
						</Text>
						<Text
							style={[styles.subtitle, dynamicTextStyle]}
							accessibilityRole="text"
							accessibilityLabel="Reflect on your week and track your progress"
						>
							Reflect on your week and track your progress
						</Text>
					</View>
					<TouchableOpacity
						style={styles.statsButton}
						onPress={() => setShowStats(!showStats)}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							showStats ? 'Hide' : 'Show',
							'reflection statistics'
						)}
					>
						<Ionicons
							name={showStats ? 'chevron-up' : 'chevron-down'}
							size={20}
							color="#00a2ff"
						/>
					</TouchableOpacity>
				</View>

				{/* Error Message */}
				{error && (
					<View style={styles.errorContainer}>
						<Ionicons name="warning" size={20} color="#ff4444" />
						<Text style={[styles.errorText, dynamicTextStyle]}>{error}</Text>
					</View>
				)}

				{/* Stats Card */}
				{showStats && currentReflection && (
					<ReflectionStatsCard reflection={currentReflection} />
				)}

				{/* Current Week Reflection */}
				{currentReflection && (
					<WeeklyReflectionCard
						reflection={currentReflection}
						onSave={handleSaveReflection}
						saving={saving}
					>
						{/* Mood Rating */}
						<MoodRatingSelector
							rating={currentReflection.moodRating}
							onRatingChange={handleMoodRatingChange}
							disabled={saving}
						/>

						{/* Win of the Week */}
						<WinOfTheWeekInput
							value={currentReflection.winOfTheWeek || ''}
							onChange={handleWinOfTheWeekChange}
							disabled={saving}
						/>

						{/* Financial Metrics */}
						<FinancialMetricsCard
							metrics={currentReflection.financialMetrics}
						/>

						{/* Reflection Notes */}
						<ReflectionNotesInput
							value={currentReflection.reflectionNotes || ''}
							onChange={(notes) =>
								handleSaveReflection({
									...currentReflection,
									reflectionNotes: notes,
								})
							}
							disabled={saving}
						/>
					</WeeklyReflectionCard>
				)}

				{/* Empty State */}
				{!currentReflection && !loading && (
					<View style={styles.emptyState}>
						<Ionicons name="calendar-outline" size={64} color="#ccc" />
						<Text style={[styles.emptyStateTitle, dynamicTextStyle]}>
							No Reflection Yet
						</Text>
						<Text style={[styles.emptyStateText, dynamicTextStyle]}>
							Start your weekly reflection to track your progress and insights.
						</Text>
						<TouchableOpacity
							style={styles.startButton}
							onPress={onRefresh}
							{...accessibilityProps.button}
							accessibilityLabel="Start weekly reflection"
						>
							<Text style={styles.startButtonText}>Start Reflection</Text>
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 32,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	headerContent: {
		flex: 1,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
	},
	statsButton: {
		padding: 8,
		marginLeft: 16,
	},
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffe6e6',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	errorText: {
		marginLeft: 8,
		color: '#ff4444',
		fontSize: 14,
		flex: 1,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 48,
		paddingHorizontal: 32,
	},
	emptyStateTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateText: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
	},
	startButton: {
		backgroundColor: '#00a2ff',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	startButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
