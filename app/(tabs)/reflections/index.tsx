import { logger } from '../../../src/utils/logger';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Platform,
	ActivityIndicator,
	Alert,
	LayoutAnimation,
	UIManager,
	TouchableOpacity,
	Pressable,
} from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { useWeeklyReflection } from '../../../src/hooks/useWeeklyReflection';
import { WeeklyReflection } from '../../../src/services';
import { MoodRatingSelector } from './components/MoodRatingSelector';
import { BaseTextArea } from './components/BaseTextArea';
import { FinancialMetricsCard } from './components/FinancialMetricsCard';
import { ReflectionStatsCard } from './components/ReflectionStatsCard';
import { dynamicTextStyleBase } from '../../../src/utils/accessibility';
import { isDevMode } from '../../../src/config/environment';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const TOTAL_STEPS = 4;

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
	// Week always ends on Sunday (start + 6 days), so calculate end date from start
	// This ensures consistent display regardless of how weekEndDate is stored
	const end = new Date(
		start.getFullYear(),
		start.getMonth(),
		start.getDate() + 6
	);

	const fmt = (x: Date) =>
		x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	return `${fmt(start)} – ${fmt(end)}`;
};

const truncate = (s: string, n: number) =>
	s.length > n ? s.slice(0, n - 1) + '…' : s;

/**
 * Helper to get the current week's start date (Monday)
 */
const getCurrentWeekStart = (): Date => {
	const now = new Date();
	const dayOfWeek = now.getDay();
	const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	const monday = new Date(now);
	monday.setDate(now.getDate() - daysToMonday);
	monday.setHours(0, 0, 0, 0);
	return monday;
};

/**
 * Helper to normalize a date string to a Date object for comparison
 */
const normalizeWeekStartDate = (dateStr: string | Date): Date => {
	const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
	const normalized = new Date(date);
	normalized.setHours(0, 0, 0, 0);
	return normalized;
};

/**
 * Find the most recent incomplete reflection from a previous week (not current week)
 */
const findIncompletePreviousWeekReflection = (
	currentReflection: WeeklyReflection | null,
	recentReflections: WeeklyReflection[]
): WeeklyReflection | null => {
	const currentWeekStart = getCurrentWeekStart();

	const allReflections = currentReflection
		? [currentReflection, ...recentReflections]
		: recentReflections;

	const incompletePreviousWeek = allReflections
		.filter((r) => {
			if (r.completed) return false;
			const reflectionWeekStart = normalizeWeekStartDate(r.weekStartDate);
			return reflectionWeekStart.getTime() < currentWeekStart.getTime();
		})
		.sort((a, b) => {
			const dateA = normalizeWeekStartDate(a.weekStartDate).getTime();
			const dateB = normalizeWeekStartDate(b.weekStartDate).getTime();
			return dateB - dateA;
		});

	return incompletePreviousWeek.length > 0 ? incompletePreviousWeek[0] : null;
};

/** Tiny copy helper for each wizard step. */
const wizardMeta = [
	{
		title: 'How was your week?',
		subtitle: 'Rate your overall mood and satisfaction from 1 to 5.',
	},
	{
		title: 'Win of the week',
		subtitle: 'Capture one accomplishment you feel proud of.',
	},
	{
		title: 'Reflection notes',
		subtitle: 'Jot down any extra thoughts, insights, or goals.',
	},
	{
		title: 'Review & save',
		subtitle: 'Look everything over before you save this week.',
	},
] as const;

/** Best-effort tiny "insight" text from your metrics/history (safe fallbacks). */
function buildAIInsight(opts: {
	metrics?: any;
	current?: WeeklyReflection | null;
	previous?: WeeklyReflection | null;
}): string {
	const { metrics, current, previous } = opts;

	const thisWeekSpend =
		metrics?.spending?.thisWeek ??
		metrics?.spend?.thisWeek ??
		metrics?.thisWeek?.spend;
	const lastWeekSpend =
		metrics?.spending?.lastWeek ??
		metrics?.spend?.lastWeek ??
		metrics?.lastWeek?.spend;
	if (typeof thisWeekSpend === 'number' && typeof lastWeekSpend === 'number') {
		const delta = thisWeekSpend - lastWeekSpend;
		const pct =
			lastWeekSpend !== 0 ? Math.round((delta / lastWeekSpend) * 100) : 0;
		if (delta < 0) {
			return `Nice — your spending is lower than last week (~${Math.abs(
				pct
			)}%). Consider rolling that into a goal.`;
		} else if (delta > 0) {
			return `Spending is up ~${pct}% vs last week. Skim your top category and set a micro-limit for next week.`;
		}
	}

	const moodNow = current?.moodRating;
	const moodPrev = previous?.moodRating;
	if (typeof moodNow === 'number' && typeof moodPrev === 'number') {
		if (moodNow > moodPrev)
			return `Mood is trending up — keep what worked this week and write one thing that helped.`;
		if (moodNow < moodPrev)
			return `Mood dipped a bit. Add a note on the biggest friction so we can spot a pattern.`;
	}

	const savingsRate = metrics?.savings?.rate ?? metrics?.savingsRate;
	if (typeof savingsRate === 'number') {
		if (savingsRate >= 0.2)
			return `Strong savings rate (${Math.round(
				savingsRate * 100
			)}%). Consider nudging a goal up by 1–2%.`;
		return `Savings rate could be higher. Try a single "no-spend day" next week to bump it a little.`;
	}

	return `Keep logging a quick mood and one small win. The more you record, the smarter your weekly insight gets.`;
}

// -----------------------------------------------------------------------------
// ReflectionWizard
// -----------------------------------------------------------------------------
type Mode = 'hub' | 'wizard';

export default function ReflectionWizard() {
	const router = useRouter();
	const params = useLocalSearchParams<{ editReflectionId?: string }>();

	const {
		currentReflection,
		recentReflections,
		streakCount,
		loading,
		saving,
		error,
		saveReflection,
		refreshReflection,
	} = useWeeklyReflection();

	// Incomplete previous week ref (if any)
	const incompletePreviousWeekReflection = useMemo(
		() =>
			findIncompletePreviousWeekReflection(
				currentReflection,
				recentReflections
			),
		[currentReflection, recentReflections]
	);

	// Editing target (explicit id, or forced incomplete previous week)
	const editingReflection = useMemo(() => {
		if (incompletePreviousWeekReflection && !params.editReflectionId) {
			return incompletePreviousWeekReflection;
		}
		if (!params.editReflectionId) return null;
		if (currentReflection?._id === params.editReflectionId) {
			return currentReflection;
		}
		return (
			recentReflections.find((r) => r._id === params.editReflectionId) || null
		);
	}, [
		incompletePreviousWeekReflection,
		params.editReflectionId,
		currentReflection,
		recentReflections,
	]);

	const isForcedToCompletePreviousWeek =
		!!incompletePreviousWeekReflection && !params.editReflectionId;

	const [mode, setMode] = useState<Mode>('hub');
	const [step, setStep] = useState(0); // 0..3
	const [busy, setBusy] = useState(false);
	const [showSuccessBanner, setShowSuccessBanner] = useState(false);

	// Lock the reflection being edited when entering wizard, so it doesn't swap
	const lockedEditingReflectionRef = useRef<WeeklyReflection | null>(null);

	// Choose which reflection the wizard is editing
	const reflectionToEdit =
		(mode === 'wizard' && lockedEditingReflectionRef.current) ||
		editingReflection ||
		currentReflection;

	// Local wizard state (only persisted on final save)
	const [localMood, setLocalMood] = useState<number | null>(
		typeof reflectionToEdit?.moodRating === 'number'
			? reflectionToEdit.moodRating
			: null
	);
	const [localWin, setLocalWin] = useState(
		reflectionToEdit?.winOfTheWeek || ''
	);
	const [localNotes, setLocalNotes] = useState(
		reflectionToEdit?.reflectionNotes || ''
	);

	// Banner animation
	const bannerProgress = useSharedValue(0);
	const lastReflectionIdRef = useRef<string | null>(null);
	const successBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	// Sync local wizard state when the reflection changes (e.g., editing a different week)
	useEffect(() => {
		const reflectionId = reflectionToEdit?._id;

		if (reflectionId && reflectionId !== lastReflectionIdRef.current) {
			lastReflectionIdRef.current = reflectionId;
			setLocalMood(
				typeof reflectionToEdit?.moodRating === 'number'
					? reflectionToEdit.moodRating
					: null
			);
			setLocalWin(reflectionToEdit?.winOfTheWeek || '');
			setLocalNotes(reflectionToEdit?.reflectionNotes || '');
		} else if (!reflectionId && lastReflectionIdRef.current !== null) {
			lastReflectionIdRef.current = null;
			setLocalMood(null);
			setLocalWin('');
			setLocalNotes('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reflectionToEdit?._id]);

	// Auto-enter wizard when editing or forced to complete previous week
	useEffect(() => {
		if (isForcedToCompletePreviousWeek || editingReflection) {
			if (editingReflection) {
				lockedEditingReflectionRef.current = editingReflection;
			}
			setMode('wizard');
			setStep(0);
		} else if (mode === 'hub') {
			lockedEditingReflectionRef.current = null;
		}
	}, [editingReflection, isForcedToCompletePreviousWeek, mode]);

	// Animate success banner
	useEffect(() => {
		bannerProgress.value = withTiming(showSuccessBanner ? 1 : 0, {
			duration: 260,
		});
	}, [showSuccessBanner, bannerProgress]);

	// Cleanup timeout
	useEffect(
		() => () => {
			if (successBannerTimeoutRef.current) {
				clearTimeout(successBannerTimeoutRef.current);
			}
		},
		[]
	);

	// Refresh reflection when screen comes into focus to ensure latest data
	useFocusEffect(
		useCallback(() => {
			// Refresh current reflection to get latest financial metrics
			refreshReflection();
		}, [refreshReflection])
	);

	// Past reflections (exclude current week)
	const pastReflections = useMemo(() => {
		if (!Array.isArray(recentReflections)) {
			return [];
		}

		// If we have a current reflection, exclude it by ID and date
		if (currentReflection) {
			const currentWeekStart = new Date(currentReflection.weekStartDate);
			currentWeekStart.setHours(0, 0, 0, 0);
			const currentReflectionId = currentReflection._id;

			return recentReflections.filter((r) => {
				// Exclude by ID first (most reliable)
				if (r._id === currentReflectionId) {
					return false;
				}

				// Also exclude by date comparison (backup check)
				const reflectionWeekStart = new Date(r.weekStartDate);
				reflectionWeekStart.setHours(0, 0, 0, 0);
				return reflectionWeekStart.getTime() !== currentWeekStart.getTime();
			});
		}

		// If no current reflection, return all recent reflections
		return recentReflections;
	}, [currentReflection, recentReflections]);

	const previousReflection = useMemo(
		() => (pastReflections.length > 0 ? pastReflections[0] : null),
		[pastReflections]
	);

	// Step gating
	const canContinue = useMemo(() => {
		switch (step) {
			case 0:
				return localMood !== null;
			case 1:
			case 2:
			case 3:
				return true;
			default:
				return false;
		}
	}, [step, localMood]);

	const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

	// Navigation: start wizard at a specific step (from hub quick actions)
	const startWizardAt = useCallback(
		async (targetStep: number) => {
			try {
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			} catch {}
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setMode('wizard');
			setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, targetStep)));
			// When starting from hub, lock onto the current reflection
			if (!lockedEditingReflectionRef.current && currentReflection) {
				lockedEditingReflectionRef.current = currentReflection;
			}
		},
		[currentReflection]
	);

	// Go to next step
	const next = useCallback(() => {
		if (!canContinue) return;
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
	}, [canContinue]);

	// Back logic (used by footer Back)
	const handleBackPress = useCallback(() => {
		if (mode !== 'wizard') return;

		if (step === 0) {
			// Step 0: only allow exiting if we're NOT in a forced previous-week flow
			if (isForcedToCompletePreviousWeek) {
				return; // can't leave the wizard until the reflection is completed
			}

			// Exit wizard
			lockedEditingReflectionRef.current = null;
			if (editingReflection && params.editReflectionId) {
				router.back();
			} else {
				setMode('hub');
			}
		} else {
			// Step > 0: always allow going back one step
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setStep((s) => Math.max(0, s - 1));
		}
	}, [
		mode,
		step,
		isForcedToCompletePreviousWeek,
		editingReflection,
		params.editReflectionId,
		router,
	]);

	// Field handlers
	const handleMoodChange = useCallback((rating: number) => {
		setLocalMood(rating);
	}, []);

	const handleWinChange = useCallback((val: string) => {
		setLocalWin(val);
	}, []);

	const handleNotesChange = useCallback((val: string) => {
		setLocalNotes(val);
	}, []);

	// Final save – only place we hit the API
	const handleSave = useCallback(async () => {
		if (!reflectionToEdit) {
			if (isDevMode) logger.debug('No reflection available');
			return;
		}

		if (localMood === null) {
			Alert.alert(
				'Missing mood rating',
				'Please select a mood rating before saving.'
			);
			return;
		}

		try {
			setBusy(true);
			if (isDevMode) {
				logger.debug('Starting save with data:', {
					moodRating: localMood,
					winOfTheWeek: localWin,
					reflectionNotes: localNotes,
				});
			}

			try {
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			} catch {}

			const saved = await saveReflection({
				moodRating: localMood,
				winOfTheWeek: localWin,
				reflectionNotes: localNotes,
				markCompleted: true,
				reflectionId:
					reflectionToEdit?._id !== currentReflection?._id
						? reflectionToEdit?._id
						: undefined,
			});

			if (isDevMode) logger.debug('Save successful, received:', saved);

			setShowSuccessBanner(true);

			if (editingReflection && params.editReflectionId) {
				// Editing a specific reflection detail
				refreshReflection();
				setTimeout(() => {
					router.back();
				}, 500);
			} else if (isForcedToCompletePreviousWeek) {
				// Just completed a forced reflection; go back to hub
				await refreshReflection();
				lockedEditingReflectionRef.current = null;
				setTimeout(() => {
					LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
					setMode('hub');
					setStep(0);
				}, 100);
			} else {
				// Normal current-week save: go to hub
				LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
				setMode('hub');
				setStep(0);
				refreshReflection();
			}

			// Auto-dismiss banner
			if (successBannerTimeoutRef.current) {
				clearTimeout(successBannerTimeoutRef.current);
			}
			successBannerTimeoutRef.current = setTimeout(() => {
				setShowSuccessBanner(false);
				successBannerTimeoutRef.current = null;
			}, 3000);
		} catch (error) {
			if (isDevMode) logger.error('Save failed:', error);
			try {
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			} catch {}
			Alert.alert('Error', 'Failed to save your reflection. Please try again.');
		} finally {
			setBusy(false);
		}
	}, [
		reflectionToEdit,
		currentReflection,
		localMood,
		localWin,
		localNotes,
		editingReflection,
		params.editReflectionId,
		isForcedToCompletePreviousWeek,
		saveReflection,
		refreshReflection,
		router,
	]);

	// Animated style for success banner
	const successBannerAnimatedStyle = useAnimatedStyle(() => {
		const p = bannerProgress.value;
		const maxHeight = 40;

		return {
			height: maxHeight * p,
			opacity: p,
			transform: [{ translateY: (1 - p) * -10 }],
			marginTop: 8 * p,
			marginBottom: 8 * p,
		};
	});

	// ---------------- Loading / empty ----------------
	if (loading && !reflectionToEdit && !params.editReflectionId) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingWrap}>
					<ActivityIndicator size="large" color="#0EA5E9" />
					<Text style={[styles.loadingText, dynamicTextStyleBase]}>
						Loading weekly reflection…
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!currentReflection) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<Header mode="hub" />
				<ScrollView
					style={styles.body}
					contentContainerStyle={{ paddingBottom: 80 }}
					showsVerticalScrollIndicator={false}
				>
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.kicker, dynamicTextStyleBase]}>
							Weekly reflection
						</Text>
						<Text style={[styles.title, dynamicTextStyleBase]}>
							Welcome to your Reflection Hub
						</Text>
						<Text style={[styles.subtitle, dynamicTextStyleBase]}>
							Start your first weekly check-in to unlock insights and trends
							over time.
						</Text>
						<View style={{ height: 16 }} />
						<RectButton
							style={styles.primaryBtn}
							onPress={() => startWizardAt(0)}
						>
							<Text style={styles.primaryBtnText}>Start weekly review</Text>
						</RectButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}

	const aiInsightText = buildAIInsight({
		metrics: currentReflection?.financialMetrics,
		current: currentReflection,
		previous: previousReflection,
	});

	const { title: stepTitle, subtitle: stepSubtitle } = wizardMeta[step];
	const primaryCtaLabel =
		step < TOTAL_STEPS - 1 ? 'Continue' : 'Save reflection';

	// ---------------- Render ----------------
	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<Header mode={mode} step={step} />

			{/* Error banner */}
			{error ? (
				<View
					style={[
						styles.errorBanner,
						{ marginHorizontal: 16, marginBottom: 8 },
					]}
				>
					<Ionicons name="warning" size={18} color="#B91C1C" />
					<Text style={[styles.errorText, dynamicTextStyleBase]}>{error}</Text>
					<RectButton style={styles.retryPill} onPress={refreshReflection}>
						<Text style={styles.retryPillText}>Retry</Text>
					</RectButton>
				</View>
			) : null}

			{/* Forced completion warning banner */}
			{isForcedToCompletePreviousWeek && editingReflection ? (
				<View
					style={[
						styles.forcedCompletionBanner,
						{ marginHorizontal: 16, marginBottom: 8 },
					]}
				>
					<Ionicons name="alert-circle" size={18} color="#B45309" />
					<Text style={[styles.forcedCompletionText, dynamicTextStyleBase]}>
						Please complete your reflection for{' '}
						{weekRangeLabel(
							editingReflection.weekStartDate,
							editingReflection.weekEndDate
						)}{' '}
						before continuing.
					</Text>
				</View>
			) : null}

			{mode === 'hub' && !isForcedToCompletePreviousWeek ? (
				// ---------------- Hub mode ----------------
				<ScrollView
					style={styles.body}
					contentContainerStyle={{ paddingBottom: 120 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Success banner */}
					<Animated.View
						style={[styles.successBannerContainer, successBannerAnimatedStyle]}
						pointerEvents={showSuccessBanner ? 'auto' : 'none'}
					>
						<View style={styles.successBanner}>
							<Ionicons name="checkmark-circle" size={18} color="#065F46" />
							<Text style={[styles.successBannerText, dynamicTextStyleBase]}>
								Reflection saved successfully!
							</Text>
						</View>
					</Animated.View>

					{/* Hero */}
					<View style={[styles.card, shadowCard]}>
						<View style={styles.kickerRow}>
							<Text style={[styles.kicker, dynamicTextStyleBase]}>
								{weekRangeLabel(
									currentReflection?.weekStartDate,
									currentReflection?.weekEndDate
								)}
							</Text>
							{currentReflection?.completed ? (
								<View style={styles.statusBadgeCompleted}>
									<Ionicons name="checkmark-circle" size={16} color="#065F46" />
									<Text style={styles.statusBadgeCompletedText}>Completed</Text>
								</View>
							) : (
								<View style={styles.statusBadge}>
									<Ionicons name="time-outline" size={16} color="#374151" />
									<Text style={styles.statusBadgeText}>In progress</Text>
								</View>
							)}
						</View>
						<Text style={[styles.title, dynamicTextStyleBase]}>
							Reflection hub
						</Text>
						<Text style={[styles.subtitle, dynamicTextStyleBase]}>
							Capture a quick mood, add a win, or take the full review. Your
							check-ins live here.
						</Text>

						<View style={{ height: 12 }} />
						<View style={styles.quickRow}>
							<QuickPill
								label="Rate mood"
								icon="happy-outline"
								onPress={() => startWizardAt(0)}
							/>
							<QuickPill
								label="Add win"
								icon="trophy-outline"
								onPress={() => startWizardAt(1)}
							/>
							<QuickPill
								label="Add note"
								icon="create-outline"
								onPress={() => startWizardAt(2)}
							/>
						</View>

						{typeof streakCount === 'number' && streakCount > 0 ? (
							<View style={styles.heroBadgesRow}>
								<View style={styles.streakBadge}>
									<Ionicons name="flame" size={16} color="#B45309" />
									<Text style={styles.streakBadgeText}>
										{streakCount}-week streak
									</Text>
								</View>
							</View>
						) : null}
					</View>

					{/* At a glance */}
					<View style={[styles.card, shadowCard]}>
						<View style={styles.glanceHeaderRow}>
							<Text style={[styles.sectionTitle, dynamicTextStyleBase]}>
								This week at a glance
							</Text>
						</View>

						<Text style={[styles.helper, { marginTop: 2 }]}>
							Quick snapshot of your mood, progress, and money this week.
						</Text>

						<View style={{ height: 10 }} />

						<ReflectionStatsCard
							reflection={currentReflection}
							variant="embedded"
						/>

						<View style={styles.sectionDivider} />

						<FinancialMetricsCard
							metrics={currentReflection.financialMetrics as any}
							variant="embedded"
						/>

						<View style={styles.aiInsight}>
							<Ionicons name="sparkles-outline" size={18} color="#1E3A8A" />
							<Text style={styles.aiInsightText}>{aiInsightText}</Text>
						</View>
					</View>

					{/* Past reflections */}
					{pastReflections.length > 0 && (
						<View style={[styles.card, shadowCard]}>
							<Text style={[styles.sectionTitle, dynamicTextStyleBase]}>
								Past reflections
							</Text>

							{pastReflections.slice(0, 5).map((r, idx) => (
								<HistoryRow
									key={r._id || idx}
									title={weekRangeLabel(r?.weekStartDate, r?.weekEndDate)}
									mood={r?.moodRating ?? undefined}
									win={
										r?.winOfTheWeek ? truncate(r.winOfTheWeek, 64) : undefined
									}
									onPress={() => {
										if (!r._id) return;
										router.push({
											pathname: '/(tabs)/reflections/[reflectionId]',
											params: { reflectionId: r._id },
										});
									}}
								/>
							))}
						</View>
					)}
				</ScrollView>
			) : (
				// ---------------- Wizard mode ----------------
				<>
					<View style={styles.progressWrap}>
						<View style={[styles.progressBar, { width: `${progressPct}%` }]} />
					</View>

					<ScrollView
						style={styles.body}
						contentContainerStyle={{ paddingBottom: 96 }}
						showsVerticalScrollIndicator={false}
					>
						{/* Step 0 – Mood */}
						{step === 0 && (
							<View style={[styles.card, shadowCard, styles.firstWizardCard]}>
								<Text style={[styles.headerTitle, dynamicTextStyleBase]}>
									{stepTitle}
								</Text>
								<Text style={[styles.headerSubtitle, dynamicTextStyleBase]}>
									{stepSubtitle}
								</Text>
								<View style={{ height: 12 }} />
								<MoodRatingSelector
									rating={localMood ?? undefined}
									onRatingChange={handleMoodChange}
									disabled={saving || busy}
									showTrend={false}
									hideHeader={true}
								/>
							</View>
						)}

						{/* Step 1 – Win */}
						{step === 1 && (
							<View style={[styles.card, shadowCard, styles.firstWizardCard]}>
								<Text style={[styles.headerTitle, dynamicTextStyleBase]}>
									{stepTitle}
								</Text>
								<Text style={[styles.headerSubtitle, dynamicTextStyleBase]}>
									{stepSubtitle}
								</Text>
								<View style={{ height: 12 }} />
								<BaseTextArea
									value={localWin}
									onChange={handleWinChange}
									disabled={saving || busy}
									placeholder="Describe your biggest win this week..."
									accessibilityLabel="Win of the week input"
									accessibilityHint="Enter your biggest accomplishment this week"
									numberOfLines={7}
								/>
							</View>
						)}

						{/* Step 2 – Notes */}
						{step === 2 && (
							<View style={[styles.card, shadowCard, styles.firstWizardCard]}>
								<Text style={[styles.headerTitle, dynamicTextStyleBase]}>
									{stepTitle}
								</Text>
								<Text style={[styles.headerSubtitle, dynamicTextStyleBase]}>
									{stepSubtitle}
								</Text>
								<View style={{ height: 12 }} />
								<BaseTextArea
									value={localNotes}
									onChange={handleNotesChange}
									disabled={saving || busy}
									placeholder="Write your thoughts, insights, or goals for next week…"
									accessibilityLabel="Reflection notes"
									accessibilityHint="Enter any thoughts or insights about your week"
									marginBottom={8}
								/>
							</View>
						)}

						{/* Step 3 – Review */}
						{step === 3 && (
							<View style={[styles.card, shadowCard, styles.firstWizardCard]}>
								<Text style={[styles.headerTitle, dynamicTextStyleBase]}>
									{stepTitle}
								</Text>
								<Text style={[styles.headerSubtitle, dynamicTextStyleBase]}>
									{stepSubtitle}
								</Text>

								<View style={{ height: 14 }} />

								<Text style={[styles.reviewHeader, dynamicTextStyleBase]}>
									Summary
								</Text>

								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>
										Mood
									</Text>
									<Text
										style={[styles.reviewValueStrong, dynamicTextStyleBase]}
									>
										{localMood !== null ? `${localMood}/5` : 'Not set'}
									</Text>
								</View>
								<View style={styles.divider} />
								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>
										Win of the week
									</Text>
									<Text style={[styles.reviewValue, dynamicTextStyleBase]}>
										{localWin || '—'}
									</Text>
								</View>
								<View style={styles.divider} />
								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyleBase]}>
										Notes
									</Text>
									<Text style={[styles.reviewValue, dynamicTextStyleBase]}>
										{localNotes || '—'}
									</Text>
								</View>

								<Text style={[styles.disclaimer, dynamicTextStyleBase]}>
									You can revisit and edit this reflection anytime.
								</Text>
							</View>
						)}
					</ScrollView>

					{/* Footer - Back + primary CTA */}
					<View style={styles.footer}>
						{step > 0 && (
							<Pressable
								style={[styles.backButton, shadowCard]}
								onPress={handleBackPress}
								disabled={busy || saving}
							>
								<Text style={styles.backButtonText}>← Back</Text>
							</Pressable>
						)}

						<RectButton
							style={[
								styles.primaryBtn,
								(!canContinue || busy || saving) && styles.btnDisabled,
							]}
							onPress={step < TOTAL_STEPS - 1 ? next : handleSave}
							enabled={canContinue && !busy && !saving}
						>
							{busy || saving ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<Text style={styles.primaryBtnText}>{primaryCtaLabel}</Text>
							)}
						</RectButton>
					</View>
				</>
			)}
		</SafeAreaView>
	);
}

// -----------------------------------------------------------------------------
// Header (no back button; back is in footer like onboarding)
// -----------------------------------------------------------------------------
function Header({ mode, step }: { mode: Mode; step?: number }) {
	if (mode === 'hub') {
		return (
			<View style={styles.header}>
				<View style={{ width: 44 }} />
				<View style={styles.headerTitleContainer}>
					<Text style={styles.headerTitleMain}>Weekly reflection</Text>
				</View>
				<View style={{ width: 44 }} />
			</View>
		);
	}

	return (
		<View style={styles.header}>
			{/* Empty left side so title stays centered */}
			<View style={{ width: 44 }} />
			<View style={styles.headerTitleContainer}>
				<Text style={styles.headerTitleMain}>Weekly review</Text>
			</View>
			<View style={styles.headerRight}>
				{typeof step === 'number' ? (
					<Text style={styles.stepIndicator}>
						{step + 1} of {TOTAL_STEPS}
					</Text>
				) : (
					<View style={{ width: 44 }} />
				)}
			</View>
		</View>
	);
}

// -----------------------------------------------------------------------------
// Small Hub UI pieces
// -----------------------------------------------------------------------------
function QuickPill({
	label,
	icon,
	onPress,
}: {
	label: string;
	icon: any;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity style={styles.quickPill} onPress={onPress}>
			<Ionicons name={icon} size={18} color="#0A7AFF" />
			<Text style={styles.quickPillText}>{label}</Text>
		</TouchableOpacity>
	);
}

function HistoryRow({
	title,
	mood,
	win,
	onPress,
}: {
	title: string;
	mood?: number;
	win?: string;
	onPress?: () => void;
}) {
	return (
		<TouchableOpacity style={styles.historyRow} onPress={onPress}>
			<View style={{ flex: 1 }}>
				<Text style={styles.historyTitle}>{title}</Text>
				<Text style={styles.historySub}>
					{typeof mood === 'number' ? `Mood ${mood}/5` : 'No mood'} ·{' '}
					{win ? `Win: ${win}` : 'No win'}
				</Text>
			</View>
			<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
		</TouchableOpacity>
	);
}

// ---------------- Styles ----------------
const shadowCard = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowOffset: { width: 0, height: 5 },
		shadowRadius: 14,
	},
	android: { elevation: 2 },
});

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8FAFC' },

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
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
	},
	headerRight: {
		width: 44,
		alignItems: 'flex-start',
		justifyContent: 'center',
		marginRight: -12,
	},
	stepIndicator: {
		fontSize: 13,
		fontWeight: '600',
		color: '#6B7280',
		paddingLeft: 2,
	},

	progressWrap: {
		height: 4,
		backgroundColor: '#E5E7EB',
		marginHorizontal: 16,
		marginTop: 4,
		borderRadius: 999,
	},
	progressBar: {
		height: 3,
		backgroundColor: '#0EA5E9',
		borderRadius: 999,
	},

	body: { flex: 1, paddingHorizontal: 16 },

	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
		marginTop: 12,
	},

	firstWizardCard: {
		marginTop: 10,
	},

	kickerRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
	},
	kicker: { fontSize: 12, color: '#6B7280', flex: 1, paddingBottom: 4 },
	title: { fontSize: 20, fontWeight: '800', color: '#111827' },
	subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14 },
	helper: { marginTop: 6, color: '#6B7280', fontSize: 14 },

	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 8,
	},

	glanceHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	sectionDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: '#E5E7EB',
		marginVertical: 12,
	},

	headerTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 2,
	},
	headerSubtitle: {
		fontSize: 13,
		color: '#6B7280',
	},

	reviewHeader: {
		fontSize: 18,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 10,
	},

	quickRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
	quickPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#EEF6FF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#BFDBFE',
	},
	quickPillText: { color: '#0A7AFF', fontWeight: '700', fontSize: 13 },

	heroBadgesRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 10,
		flexWrap: 'wrap',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 999,
	},
	statusBadgeText: { color: '#374151', fontWeight: '700', fontSize: 12 },

	statusBadgeCompleted: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#ECFDF5',
		borderRadius: 999,
	},
	statusBadgeCompletedText: {
		color: '#065F46',
		fontWeight: '700',
		fontSize: 12,
	},

	streakBadge: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#FFF7ED',
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#FED7AA',
	},
	streakBadgeText: { color: '#B45309', fontWeight: '700', fontSize: 12 },

	aiInsight: {
		marginTop: 10,
		flexDirection: 'row',
		gap: 8,
		alignItems: 'flex-start',
		padding: 10,
		backgroundColor: '#EEF2FF',
		borderColor: '#C7D2FE',
		borderWidth: 1,
		borderRadius: 12,
	},
	aiInsightText: { flex: 1, color: '#1E3A8A', fontSize: 13, lineHeight: 18 },

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

	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#FEE2E2',
		borderColor: '#FCA5A5',
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 10,
	},
	errorText: { color: '#991B1B', fontSize: 13, flex: 1 },
	retryPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#FCA5A5',
	},
	retryPillText: { color: '#7F1D1D', fontWeight: '700', fontSize: 12 },

	forcedCompletionBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		backgroundColor: '#FFFBEB',
		borderColor: '#FCD34D',
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	forcedCompletionText: {
		color: '#92400E',
		fontSize: 13,
		flex: 1,
		lineHeight: 18,
	},

	successBannerContainer: {
		overflow: 'hidden',
	},
	successBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 12,
		alignSelf: 'center',
	},
	successBannerText: {
		color: '#065F46',
		fontSize: 13,
		flex: 1,
		fontWeight: '600',
	},

	footer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: '#FFFFFF',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 3,
		flexDirection: 'row',
	},
	primaryBtn: {
		height: 48,
		borderRadius: 999,
		backgroundColor: '#00A2FF',
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
	},
	primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
	backButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 18,
		minWidth: 100,
		marginRight: 8,
	},
	backButtonText: {
		color: '#444444',
		fontSize: 16,
		fontWeight: '600',
	},
	btnDisabled: { opacity: 0.55 },

	loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	loadingText: { marginTop: 12, color: '#6B7280' },

	historyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#E5E7EB',
	},
	historyTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
	historySub: { fontSize: 13, color: '#4B5563', marginTop: 2 },
});
