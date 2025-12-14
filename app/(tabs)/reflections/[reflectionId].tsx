import React, { useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
	ScrollView,
	Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useWeeklyReflection } from '../../../src/hooks/useWeeklyReflection';
import { WeeklyReflection } from '../../../src/services';
import { dynamicTextStyleBase } from '../../../src/utils/accessibility';

const weekRangeLabel = (
	weekStartDate?: string | Date,
	weekEndDate?: string | Date
) => {
	if (!weekStartDate) return 'This week';

	const parseDate = (dateInput: string | Date): Date => {
		if (dateInput instanceof Date) {
			return new Date(
				dateInput.getFullYear(),
				dateInput.getMonth(),
				dateInput.getDate()
			);
		}
		const dateStr = dateInput;
		const datePart = dateStr.split('T')[0];
		const [year, month, day] = datePart.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	const start = parseDate(weekStartDate);
	const end = weekEndDate
		? parseDate(weekEndDate)
		: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);

	const fmt = (x: Date) =>
		x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	return `${fmt(start)} – ${fmt(end)}`;
};

const shadowCard = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowOffset: { width: 0, height: 5 },
		shadowRadius: 14,
	},
	android: { elevation: 2 },
});

export default function ReflectionDetailScreen() {
	const router = useRouter();
	const { reflectionId } = useLocalSearchParams<{ reflectionId: string }>();

	const { currentReflection, recentReflections, loading, refreshReflection } =
		useWeeklyReflection();

	// Refresh data when screen comes into focus (e.g., after editing)
	useFocusEffect(
		React.useCallback(() => {
			refreshReflection();
		}, [refreshReflection])
	);

	const reflection: WeeklyReflection | null = useMemo(() => {
		if (!reflectionId) return null;

		if (currentReflection?._id === reflectionId) {
			return currentReflection as WeeklyReflection;
		}

		const fromRecent = recentReflections?.find((r) => r._id === reflectionId);
		return (fromRecent as WeeklyReflection | undefined) ?? null;
	}, [reflectionId, currentReflection, recentReflections]);

	if (loading && !reflection) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingWrap}>
					<ActivityIndicator size="large" color="#0EA5E9" />
					<Text style={[styles.loadingText, dynamicTextStyleBase]}>
						Loading reflection…
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!reflection) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.header}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}
					>
						<Ionicons name="chevron-back" size={22} color="#111827" />
					</TouchableOpacity>
					<View style={styles.headerTitleContainer}>
						<Text style={styles.headerTitleMain}>Reflection</Text>
					</View>
					<View style={styles.headerRight} />
				</View>

				<View style={styles.emptyWrap}>
					<Text style={[styles.emptyTitle, dynamicTextStyleBase]}>
						Reflection not found
					</Text>
					<Text style={[styles.emptySubtitle, dynamicTextStyleBase]}>
						Try going back and selecting a different week.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
					accessibilityLabel="Back to reflections"
					accessibilityRole="button"
				>
					<Ionicons name="chevron-back" size={22} color="#111827" />
				</TouchableOpacity>
				<View style={styles.headerTitleContainer}>
					<Text style={styles.headerTitleMain}>Weekly reflection</Text>
				</View>
				<View style={styles.headerRight}>
					<TouchableOpacity
						onPress={() => {
							router.push({
								pathname: '/(tabs)/reflections',
								params: { editReflectionId: reflectionId },
							});
						}}
						style={styles.editButton}
						accessibilityLabel="Edit reflection"
						accessibilityRole="button"
					>
						<Ionicons name="create-outline" size={22} color="#111827" />
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				style={styles.body}
				contentContainerStyle={{ paddingBottom: 24 }}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.card, shadowCard]}>
					<Text style={[styles.kicker, dynamicTextStyleBase]}>
						{weekRangeLabel(reflection.weekStartDate, reflection.weekEndDate)}
					</Text>
					<Text style={[styles.title, dynamicTextStyleBase]}>
						Review Summary
					</Text>

					<View style={styles.reviewRow}>
						<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>Mood</Text>
						<Text style={[styles.reviewValueStrong, dynamicTextStyleBase]}>
							{typeof reflection.moodRating === 'number'
								? `${reflection.moodRating}/5`
								: 'Not set'}
						</Text>
					</View>

					<View style={styles.divider} />

					<View style={styles.reviewRow}>
						<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>
							Win of the week
						</Text>
						<Text style={[styles.reviewValue, dynamicTextStyleBase]}>
							{reflection.winOfTheWeek || '—'}
						</Text>
					</View>

					<View style={styles.divider} />

					<View style={styles.reviewRow}>
						<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>
							Notes
						</Text>
						<Text style={[styles.reviewValue, dynamicTextStyleBase]}>
							{reflection.reflectionNotes || '—'}
						</Text>
					</View>

					<Text style={[styles.disclaimer, dynamicTextStyleBase]}>
						This is a read-only summary of your past week.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	header: {
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	headerTitleContainer: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitleMain: {
		fontSize: 22,
		fontWeight: '700',
		color: '#111827',
	},
	headerRight: {
		width: 44,
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	backButton: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: -12,
	},
	editButton: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: -12,
	},
	body: {
		flex: 1,
		paddingHorizontal: 16,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
		marginTop: 12,
	},
	kicker: { fontSize: 12, color: '#6B7280', paddingBottom: 4 },
	title: { fontSize: 20, fontWeight: '800', color: '#111827' },
	reviewHeader: {
		fontSize: 18,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 10,
	},
	reviewRow: {
		paddingVertical: 10,
	},
	reviewLabel: {
		fontSize: 13,
		color: '#6B7280',
		marginBottom: 2,
	},
	reviewValue: {
		fontSize: 15,
		color: '#111827',
	},
	reviewValueStrong: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: '#E5E7EB',
		marginVertical: 6,
	},
	disclaimer: { marginTop: 10, color: '#6B7280', fontSize: 12 },
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 12,
		color: '#6B7280',
	},
	emptyWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 4,
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#6B7280',
		textAlign: 'center',
	},
});
