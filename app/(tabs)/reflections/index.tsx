import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	RefreshControl,
	LayoutAnimation,
	Platform,
	UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

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

// --- Types you likely already have; adjust to match your hook's shape ---
// type FinancialMetrics = {
//   spending?: number;
//   savings?: number;
//   budgetAdherence?: number;
//   // add others you compute in the hook
// };

// type WeeklyReflection = {
//   id: string;
//   weekStartISO: string;
//   moodRating: number;
//   winOfTheWeek?: string | null;
//   reflectionNotes?: string | null;
//   financialMetrics: FinancialMetrics;
// };

// type SavePayload = Partial<Pick<
//   WeeklyReflection,
//   'moodRating' | 'winOfTheWeek' | 'reflectionNotes'
// >>;

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function WeeklyReflectionsScreen() {
	const {
		currentReflection,
		loading,
		saving,
		error,
		saveReflection,
		updateMoodRating,
		updateWinOfTheWeek,
		updateReflectionNotes,
		refreshReflection,
	} = useWeeklyReflection();

	const [showStats, setShowStats] = React.useState(false);
	const [isRefreshing, setIsRefreshing] = React.useState(false);

	// --- Debounce support to throttle frequent text updates ---
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const debounce = useCallback((fn: () => void, ms = 400) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(fn, ms);
	}, []);
	useEffect(
		() => () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		},
		[]
	);

	const onRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refreshReflection();
		} catch (err) {
			console.error('Error refreshing reflection:', err);
			Alert.alert('Refresh failed', 'Pull to refresh again or try later.');
		} finally {
			setIsRefreshing(false);
		}
	}, [refreshReflection]);

	const handleSaveReflection = useCallback(
		async (data: any) => {
			try {
				// Optimistic feedback
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
				await saveReflection(data);
				Alert.alert('Saved', 'Weekly reflection saved successfully!');
			} catch {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
					() => {}
				);
				Alert.alert(
					'Error',
					'Failed to save weekly reflection. Please try again.'
				);
			}
		},
		[saveReflection]
	);

	const handleMoodRatingChange = useCallback(
		async (rating: number) => {
			try {
				await updateMoodRating(rating);
			} catch {
				Alert.alert('Error', 'Failed to update mood rating. Please try again.');
			}
		},
		[updateMoodRating]
	);

	const handleWinOfTheWeekChange = useCallback(
		(win: string) => {
			debounce(async () => {
				try {
					await updateWinOfTheWeek(win);
				} catch {
					Alert.alert(
						'Error',
						'Failed to update win of the week. Please try again.'
					);
				}
			});
		},
		[updateWinOfTheWeek, debounce]
	);

	const handleReflectionNotesChange = useCallback(
		(notes: string) => {
			debounce(async () => {
				try {
					await updateReflectionNotes(notes);
				} catch {
					Alert.alert(
						'Error',
						'Failed to update reflection notes. Please try again.'
					);
				}
			});
		},
		[updateReflectionNotes, debounce]
	);

	const toggleStats = useCallback(() => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowStats((s) => !s);
	}, []);

	const statsA11yLabel = useMemo(
		() =>
			generateAccessibilityLabel.button(
				showStats ? 'Hide' : 'Show',
				'reflection statistics'
			),
		[showStats]
	);

	// Loading state (initial)
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
						refreshing={isRefreshing || (loading && !!currentReflection)}
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
						onPress={toggleStats}
						{...accessibilityProps.button}
						accessibilityLabel={statsA11yLabel}
					>
						<Ionicons
							name={showStats ? 'chevron-up' : 'chevron-down'}
							size={20}
							color="#00a2ff"
						/>
					</TouchableOpacity>
				</View>

				{/* Error Banner with retry */}
				{!!error && (
					<View style={styles.errorContainer}>
						<Ionicons name="warning" size={20} color="#ff4444" />
						<Text style={[styles.errorText, dynamicTextStyle]}>{error}</Text>
						<TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
							<Text style={styles.retryText}>Retry</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Stats */}
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
						<MoodRatingSelector
							rating={currentReflection.moodRating}
							onRatingChange={handleMoodRatingChange}
							disabled={saving}
						/>

						<WinOfTheWeekInput
							value={currentReflection.winOfTheWeek || ''}
							onChange={handleWinOfTheWeekChange}
							disabled={saving}
						/>

						<FinancialMetricsCard
							metrics={currentReflection.financialMetrics}
						/>

						<ReflectionNotesInput
							value={currentReflection.reflectionNotes || ''}
							onChange={handleReflectionNotesChange}
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
							style={[styles.startButton, saving && { opacity: 0.7 }]}
							onPress={onRefresh}
							disabled={saving}
							{...accessibilityProps.button}
							accessibilityLabel="Start weekly reflection"
						>
							<Text style={styles.startButtonText}>
								{loading ? 'Starting…' : 'Start Reflection'}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f8f9fa' },
	scrollView: { flex: 1 },
	scrollContent: { padding: 16, paddingBottom: 32 },
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
	},
	loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	headerContent: { flex: 1 },
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	subtitle: { fontSize: 16, color: '#666' },
	statsButton: { padding: 8, marginLeft: 16 },
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffe6e6',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		gap: 8,
	},
	errorText: { color: '#ff4444', fontSize: 14, flex: 1 },
	retryBtn: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#ffd1d1',
	},
	retryText: { color: '#b80000', fontWeight: '600' },
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
	startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
