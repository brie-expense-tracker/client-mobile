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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useWeeklyReflection } from '../../../src/hooks/useWeeklyReflection';
import { WeeklyReflection } from '../../../src/services';
import { MoodRatingSelector } from './components/MoodRatingSelector';
import { WinOfTheWeekInput } from './components/WinOfTheWeekInput';
import { ReflectionNotesInput } from './components/ReflectionNotesInput';
import { FinancialMetricsCard } from './components/FinancialMetricsCard';
import { ReflectionStatsCard } from './components/ReflectionStatsCard';
import ReflectionSuccessScreen from './ReflectionSuccessScreen';
import { dynamicTextStyle } from '../../../src/utils/accessibility';
import { isDevMode } from '../../../src/config/environment';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// -----------------------------------------------------------------------------
// New helpers
// -----------------------------------------------------------------------------
const weekRangeLabel = (d?: string | Date) => {
	if (!d) return 'This week';
	const dt = new Date(d);
	const start = new Date(dt);
	const day = start.getDay();
	const diffToMon = (day + 6) % 7;
	start.setDate(start.getDate() - diffToMon);
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	const fmt = (x: Date) =>
		x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	return `${fmt(start)} – ${fmt(end)}`;
};

const truncate = (s: string, n: number) =>
	s.length > n ? s.slice(0, n - 1) + '…' : s;

/** Best-effort tiny "insight" text from your metrics/history (safe fallbacks). */
function buildAIInsight(opts: {
	metrics?: any;
	current?: WeeklyReflection | null;
	previous?: WeeklyReflection | null;
}): string {
	const { metrics, current, previous } = opts;

	// 1) If spending metrics exist, compare this vs last week
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
			return `Nice — your spending looks lower than last week (~${Math.abs(
				pct
			)}%). Consider rolling the savings into a goal.`;
		} else if (delta > 0) {
			return `Spending is up ~${pct}% vs last week. Skim your top category and set a micro-limit for next week.`;
		}
	}

	// 2) If mood trend exists, give a gentle nudge
	const moodNow = current?.moodRating;
	const moodPrev = previous?.moodRating;
	if (typeof moodNow === 'number' && typeof moodPrev === 'number') {
		if (moodNow > moodPrev)
			return `Mood trending up — keep what worked this week. Capture one "win" so we reinforce it.`;
		if (moodNow < moodPrev)
			return `Mood dipped a bit. Add a short note on the biggest friction so we can spot a pattern.`;
	}

	// 3) If savings rate exists
	const savingsRate = metrics?.savings?.rate ?? metrics?.savingsRate;
	if (typeof savingsRate === 'number') {
		if (savingsRate >= 0.2)
			return `Strong savings rate (${Math.round(
				savingsRate * 100
			)}%). Consider auto-increasing a goal by 1–2%.`;
		return `Savings rate could be higher. Try a single "no-spend day" next week to bump it a little.`;
	}

	// Fallback
	return `Keep logging mood + a small "win." The more you record, the smarter your weekly insight gets.`;
}

// -----------------------------------------------------------------------------
// Minimal sparkline (no extra libraries) using bars
// -----------------------------------------------------------------------------
function SparklineBars({
	values,
	max = 5,
}: {
	values: number[];
	max?: number;
}) {
	const safe = (values ?? []).filter((v) => typeof v === 'number');
	if (!safe.length) {
		return (
			<View style={styles.sparklineEmpty}>
				<Text style={styles.sparklineEmptyText}>No data yet</Text>
			</View>
		);
	}
	const m = Math.max(max, ...safe, 1);
	return (
		<View style={styles.sparklineRow}>
			{safe.map((v, i) => {
				const hPct = Math.max(0.08, Math.min(1, v / m)); // avoid invisible bars
				return (
					<View key={i} style={[styles.sparkBar, { height: 28 * hPct }]} />
				);
			})}
		</View>
	);
}

// -----------------------------------------------------------------------------
// ReflectionWizard (now includes a Hub mode)
// -----------------------------------------------------------------------------
export default function ReflectionWizard() {
	const {
		currentReflection,
		// If your hook exposes these, they'll render; otherwise we derive safely.
		recentReflections, // WeeklyReflection[] | undefined
		moodTrend, // number[] | undefined
		streakCount, // number | undefined
		loading,
		saving,
		error,
		saveReflection,
		updateMoodRating,
		updateWinOfTheWeek,
		updateReflectionNotes,
		refreshReflection,
	} = useWeeklyReflection() as any;

	type Mode = 'hub' | 'wizard';
	const [mode, setMode] = useState<Mode>('hub'); // <<< NEW: default Hub
	const [step, setStep] = useState(0); // 0..3 for wizard steps
	const [busy, setBusy] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [dismissedSuccess, setDismissedSuccess] = useState(false);
	const [savedReflection, setSavedReflection] =
		useState<WeeklyReflection | null>(null);
	const [localWin, setLocalWin] = useState(
		currentReflection?.winOfTheWeek || ''
	);
	const [localNotes, setLocalNotes] = useState(
		currentReflection?.reflectionNotes || ''
	);

	// Debounce helpers (for text fields)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const debounce = useCallback((fn: () => void, ms = 400) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(fn, ms);
	}, []);
	useEffect(
		() => () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		},
		[]
	);

	useEffect(() => {
		setLocalWin(currentReflection?.winOfTheWeek || '');
		setLocalNotes(currentReflection?.reflectionNotes || '');
	}, [currentReflection?.winOfTheWeek, currentReflection?.reflectionNotes]);

	// Derive a mood trend if hook didn't provide one
	const derivedTrend = useMemo(() => {
		if (Array.isArray(moodTrend) && moodTrend.length) return moodTrend;
		if (Array.isArray(recentReflections) && recentReflections.length) {
			const vals = recentReflections
				.map((r: WeeklyReflection) => r?.moodRating)
				.filter((n: any) => typeof n === 'number');
			return vals.slice(-8); // last 8 weeks
		}
		if (typeof currentReflection?.moodRating === 'number')
			return [currentReflection.moodRating];
		return [];
	}, [moodTrend, recentReflections, currentReflection?.moodRating]);

	// Find a "previous" week for insights if any
	const previousReflection = useMemo(() => {
		if (Array.isArray(recentReflections) && recentReflections.length >= 2) {
			// Assuming most recent is index 0; adjust if your array is sorted ascending.
			return recentReflections[1];
		}
		return null;
	}, [recentReflections]);

	// ---------------- Wizard model (4 steps) ----------------
	const wizardTitles = [
		'How was your week?',
		'Win of the week',
		'Reflection notes',
		'Review & save',
	];

	const canContinue = useMemo(() => {
		if (!currentReflection) return false;
		switch (step) {
			case 0:
				return !!currentReflection.moodRating; // require mood
			case 1:
				return true; // optional win
			case 2:
				return true; // optional notes
			case 3:
				return true; // review
			default:
				return false;
		}
	}, [step, currentReflection]);

	const progressPct = ((step + 1) / 4) * 100;

	const next = useCallback(() => {
		if (!canContinue) return;
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setStep((s) => Math.min(3, s + 1));
	}, [canContinue]);

	// ---------------- Handlers ----------------
	const handleMoodChange = useCallback(
		async (rating: number) => {
			try {
				await updateMoodRating(rating);
			} catch {
				Alert.alert('Error', 'Failed to update mood rating. Please try again.');
			}
		},
		[updateMoodRating]
	);

	const handleWinChange = useCallback(
		(val: string) => {
			setLocalWin(val);
			debounce(async () => {
				try {
					await updateWinOfTheWeek(val);
				} catch {}
			});
		},
		[debounce, updateWinOfTheWeek]
	);

	const handleNotesChange = useCallback(
		(val: string) => {
			setLocalNotes(val);
			debounce(async () => {
				try {
					await updateReflectionNotes(val);
				} catch {}
			});
		},
		[debounce, updateReflectionNotes]
	);

	const startWizardAt = useCallback(async (targetStep: number) => {
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch {}
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setMode('wizard');
		setStep(Math.max(0, Math.min(3, targetStep)));
	}, []);

	const handleSave = useCallback(async () => {
		if (!currentReflection) {
			if (isDevMode) logger.debug('No current reflection available');
			return;
		}
		if (!currentReflection.moodRating) {
			Alert.alert(
				'Missing Mood Rating',
				'Please select a mood rating before saving.'
			);
			return;
		}
		try {
			setBusy(true);
			if (isDevMode) {
				logger.debug('Starting save with data:', {
					moodRating: currentReflection.moodRating,
					winOfTheWeek: localWin,
					reflectionNotes: localNotes,
				});
			}
			try {
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			} catch {}
			const saved = await saveReflection({
				moodRating: currentReflection.moodRating,
				winOfTheWeek: localWin,
				reflectionNotes: localNotes,
			});
			if (isDevMode) logger.debug('Save successful, received:', saved);
			setDismissedSuccess(false);
			setSavedReflection(saved);
			setShowSuccess(true);
		} catch (error) {
			if (isDevMode) logger.error('Save failed:', error);
			try {
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			} catch {}
			Alert.alert('Error', 'Failed to save your reflection. Please try again.');
		} finally {
			setBusy(false);
		}
	}, [currentReflection, localWin, localNotes, saveReflection]);

	const handleBackToWizard = useCallback(() => {
		if (isDevMode) logger.debug('handleBackToWizard called');
		setDismissedSuccess(true);
		setShowSuccess(false);
		setSavedReflection(null);
		setMode('hub'); // <<< go back to Hub after success
		setStep(0);
		refreshReflection();
	}, [refreshReflection]);

	const handleEditReflection = useCallback(() => {
		if (isDevMode) logger.debug('handleEditReflection called');
		setDismissedSuccess(true);
		setShowSuccess(false);
		setSavedReflection(null);
		setMode('wizard');
		setStep(0);
	}, []);

	// ---------------- Loading / empty ----------------
	if (loading && !currentReflection) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingWrap}>
					<ActivityIndicator size="large" color="#00a2ff" />
					<Text style={[styles.loadingText, dynamicTextStyle]}>
						Loading weekly reflection…
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!currentReflection) {
		// Hub can still render a friendly empty state
		return (
			<SafeAreaView style={styles.container}>
				<Header
					mode="hub"
					setMode={setMode}
					titleLeft="Hub"
					titleRight="Review"
				/>
				<ScrollView
					style={styles.body}
					contentContainerStyle={{ paddingBottom: 80 }}
					showsVerticalScrollIndicator={false}
				>
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.title, dynamicTextStyle]}>
							Welcome to your Reflection Hub
						</Text>
						<Text style={[styles.subtitle, dynamicTextStyle]}>
							No data yet. Start your first weekly reflection to unlock insights
							and trends.
						</Text>
						<View style={{ height: 16 }} />
						<RectButton
							style={styles.primaryBtn}
							onPress={() => startWizardAt(0)}
						>
							<Text style={styles.primaryBtnText}>Start Weekly Review</Text>
						</RectButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}

	// ---------------- Success screen logic ----------------
	if (
		!dismissedSuccess &&
		((showSuccess && savedReflection) ||
			(currentReflection?.completed && !showSuccess && !savedReflection))
	) {
		const reflectionToShow = savedReflection || currentReflection;
		return (
			<ReflectionSuccessScreen
				reflection={reflectionToShow!}
				onBack={handleBackToWizard}
				onEdit={handleEditReflection}
			/>
		);
	}

	// ---------------- AI Insight (computed once per render) ----------------
	const aiInsightText = buildAIInsight({
		metrics: currentReflection?.financialMetrics,
		current: currentReflection,
		previous: previousReflection,
	});

	// ---------------- Render ----------------
	return (
		<SafeAreaView style={styles.container}>
			<Header
				mode={mode}
				setMode={setMode}
				titleLeft="Hub"
				titleRight="Review"
			/>

			{/* Error banner */}
			{error ? (
				<View
					style={[
						styles.errorBanner,
						{ marginHorizontal: 16, marginBottom: 8 },
					]}
				>
					<Ionicons name="warning" size={18} color="#B91C1C" />
					<Text style={[styles.errorText, dynamicTextStyle]}>{error}</Text>
					<RectButton style={styles.retryPill} onPress={refreshReflection}>
						<Text style={styles.retryPillText}>Retry</Text>
					</RectButton>
				</View>
			) : null}

			{mode === 'hub' ? (
				<ScrollView
					style={styles.body}
					contentContainerStyle={{ paddingBottom: 120 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Hero */}
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.kicker, dynamicTextStyle]}>
							{weekRangeLabel(currentReflection?.weekStartDate)}
						</Text>
						<Text style={[styles.title, dynamicTextStyle]}>Reflection Hub</Text>
						<Text style={[styles.subtitle, dynamicTextStyle]}>
							Capture a quick mood, jot a win, or take the full review. Your
							insights live here.
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

						{/* Streak & status */}
						<View style={styles.heroBadgesRow}>
							{typeof streakCount === 'number' && streakCount > 0 ? (
								<View style={styles.streakBadge}>
									<Ionicons name="flame" size={16} color="#B45309" />
									<Text style={styles.streakBadgeText}>
										{streakCount}-week streak
									</Text>
								</View>
							) : null}
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
					</View>

					{/* At a glance */}
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.sectionTitle, dynamicTextStyle]}>
							This week at a glance
						</Text>

						{/* Mood sparkline */}
						<View style={styles.rowBetween}>
							<View style={{ flex: 1, marginRight: 12 }}>
								<Text style={[styles.helper, { marginBottom: 6 }]}>
									Mood trend
								</Text>
								<SparklineBars values={derivedTrend} max={5} />
							</View>
							<View style={styles.miniStat}>
								<Text style={styles.miniStatLabel}>Current</Text>
								<Text style={styles.miniStatValue}>
									{typeof currentReflection?.moodRating === 'number'
										? `${currentReflection.moodRating}/5`
										: '—'}
								</Text>
							</View>
						</View>

						{/* Existing cards */}
						<View style={{ height: 8 }} />
						<ReflectionStatsCard reflection={currentReflection} />
						<FinancialMetricsCard
							metrics={currentReflection.financialMetrics as any}
						/>

						{/* AI Insight */}
						<View style={styles.aiInsight}>
							<Ionicons name="sparkles-outline" size={18} color="#1E3A8A" />
							<Text style={styles.aiInsightText}>{aiInsightText}</Text>
						</View>

						<RectButton
							style={[styles.secondaryBtn, { marginTop: 8 }]}
							onPress={refreshReflection}
						>
							<Text style={styles.secondaryBtnText}>Refresh</Text>
						</RectButton>
					</View>

					{/* Recent history (graceful if none) */}
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.sectionTitle, dynamicTextStyle]}>
							Recent reflections
						</Text>

						{Array.isArray(recentReflections) && recentReflections.length ? (
							recentReflections
								.slice(0, 4)
								.map((r: WeeklyReflection, idx: number) => (
									<HistoryRow
										key={idx}
										title={weekRangeLabel(r?.weekStartDate as any)}
										mood={r?.moodRating ?? undefined}
										win={
											r?.winOfTheWeek ? truncate(r.winOfTheWeek, 64) : undefined
										}
										completed={!!r?.completed}
										onPress={() => startWizardAt(3)}
									/>
								))
						) : (
							<>
								<HistoryRow
									title={weekRangeLabel(currentReflection?.weekStartDate)}
									mood={currentReflection?.moodRating ?? undefined}
									win={
										currentReflection?.winOfTheWeek
											? truncate(currentReflection.winOfTheWeek, 64)
											: undefined
									}
									completed={!!currentReflection?.completed}
									onPress={() => startWizardAt(3)}
								/>
								<Text style={[styles.helper, { marginTop: 8 }]}>
									Tip: Expose `recentReflections` from the hook to show a richer
									list here.
								</Text>
							</>
						)}
					</View>
				</ScrollView>
			) : (
				// ---------------- Wizard ----------------
				<>
					{/* Progress */}
					<View style={styles.progressWrap}>
						<View style={[styles.progressBar, { width: `${progressPct}%` }]} />
					</View>

					<ScrollView
						style={styles.body}
						contentContainerStyle={{ paddingBottom: 100 }}
						showsVerticalScrollIndicator={false}
					>
						{/* Step title */}
						<View style={[styles.card, shadowCard, { marginTop: 12 }]}>
							<Text style={[styles.headerTitle, dynamicTextStyle]}>
								{wizardTitles[step]}
							</Text>
						</View>

						{step === 0 && (
							<View style={[styles.card, shadowCard]}>
								<MoodRatingSelector
									rating={currentReflection.moodRating}
									onRatingChange={handleMoodChange}
									disabled={saving || busy}
									showTrend={false}
								/>
							</View>
						)}

						{step === 1 && (
							<View style={[styles.card, shadowCard]}>
								<Text style={[styles.title, dynamicTextStyle]}>
									Win of the week
								</Text>
								<Text style={[styles.helper, dynamicTextStyle]}>
									What was your biggest accomplishment? (optional)
								</Text>
								<WinOfTheWeekInput
									value={localWin}
									onChange={handleWinChange}
									disabled={saving || busy}
								/>
							</View>
						)}

						{step === 2 && (
							<View style={[styles.card, shadowCard]}>
								<Text style={[styles.title, dynamicTextStyle]}>
									Reflection notes
								</Text>
								<Text style={[styles.helper, dynamicTextStyle]}>
									Any thoughts or reminders for next week? (optional)
								</Text>
								<ReflectionNotesInput
									value={localNotes}
									onChange={handleNotesChange}
									disabled={saving || busy}
								/>
							</View>
						)}

						{step === 3 && (
							<View style={[styles.card, shadowCard]}>
								<Text style={[styles.title, dynamicTextStyle]}>Review</Text>
								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyle]}>
										Mood
									</Text>
									<Text style={[styles.reviewValue, dynamicTextStyle]}>
										{currentReflection.moodRating
											? `${currentReflection.moodRating}/5`
											: 'Not set'}
									</Text>
								</View>
								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyle]}>
										Win
									</Text>
									<Text style={[styles.reviewValue, dynamicTextStyle]}>
										{localWin || '—'}
									</Text>
								</View>
								<View style={styles.reviewRow}>
									<Text style={[styles.reviewLabel, dynamicTextStyle]}>
										Notes
									</Text>
									<Text style={[styles.reviewValue, dynamicTextStyle]}>
										{localNotes || '—'}
									</Text>
								</View>
								<Text style={[styles.disclaimer, dynamicTextStyle]}>
									You can revisit and edit this reflection anytime.
								</Text>

								<RectButton
									style={[
										styles.primaryBtn,
										(busy || saving || !currentReflection?.moodRating) &&
											styles.btnDisabled,
										{ marginTop: 12 },
									]}
									onPress={handleSave}
									enabled={!busy && !saving && !!currentReflection?.moodRating}
								>
									{busy || saving ? (
										<ActivityIndicator size="small" color="#fff" />
									) : (
										<Text style={styles.primaryBtnText}>Save reflection</Text>
									)}
								</RectButton>
							</View>
						)}
					</ScrollView>

					{/* Footer actions for steps 0..2 */}
					{mode === 'wizard' && step < 3 && (
						<View style={styles.footer}>
							<RectButton
								style={[
									styles.secondaryBtn,
									{ flex: 1, marginRight: 8 },
									step === 0 && styles.btnDisabled,
								]}
								onPress={() => {
									if (step === 0) return;
									LayoutAnimation.configureNext(
										LayoutAnimation.Presets.easeInEaseOut
									);
									setStep((s) => Math.max(0, s - 1));
								}}
								enabled={step > 0}
							>
								<Text style={styles.secondaryBtnText}>Previous</Text>
							</RectButton>

							<RectButton
								style={[
									styles.primaryBtn,
									{ flex: 1 },
									!canContinue && styles.btnDisabled,
								]}
								onPress={next}
								enabled={canContinue}
							>
								<Text style={styles.primaryBtnText}>Continue</Text>
							</RectButton>
						</View>
					)}
				</>
			)}
		</SafeAreaView>
	);
}

// -----------------------------------------------------------------------------
// Header with segmented toggle (Hub / Review)
// -----------------------------------------------------------------------------
function Header({
	mode,
	setMode,
	titleLeft,
	titleRight,
}: {
	mode: 'hub' | 'wizard';
	setMode: (m: 'hub' | 'wizard') => void;
	titleLeft: string;
	titleRight: string;
}) {
	return (
		<View style={styles.header}>
			{/* Left spacer to center the segment visually */}
			<View style={{ width: 24 }} />

			{/* Segmented control */}
			<View style={styles.segment}>
				<TouchableOpacity
					style={[
						styles.segmentItem,
						mode === 'hub' && styles.segmentItemActive,
					]}
					onPress={() => setMode('hub')}
				>
					<Text
						style={[
							styles.segmentText,
							mode === 'hub' && styles.segmentTextActive,
						]}
					>
						{titleLeft}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.segmentItem,
						mode === 'wizard' && styles.segmentItemActive,
					]}
					onPress={() => setMode('wizard')}
				>
					<Text
						style={[
							styles.segmentText,
							mode === 'wizard' && styles.segmentTextActive,
						]}
					>
						{titleRight}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Right spacer */}
			<View style={{ width: 24 }} />
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
	completed,
	onPress,
}: {
	title: string;
	mood?: number;
	win?: string;
	completed?: boolean;
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
			{completed ? (
				<Ionicons name="checkmark-circle" size={20} color="#10B981" />
			) : (
				<Ionicons name="ellipse-outline" size={20} color="#9CA3AF" />
			)}
		</TouchableOpacity>
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
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
	},

	// segmented
	segment: {
		flexDirection: 'row',
		backgroundColor: '#E5E7EB',
		borderRadius: 999,
		padding: 3,
		flex: 1,
		marginHorizontal: 12,
	},
	segmentItem: {
		flex: 1,
		height: 36,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	segmentItemActive: { backgroundColor: '#fff' },
	segmentText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
	segmentTextActive: { color: '#111827' },

	headerTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#111827',
	},

	progressWrap: {
		height: 4,
		backgroundColor: '#E5E7EB',
		marginHorizontal: 16,
		borderRadius: 999,
	},
	progressBar: { height: 4, backgroundColor: '#00a2ff', borderRadius: 999 },

	body: { flex: 1, padding: 16 },

	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
		marginTop: 12,
	},

	kicker: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
	title: { fontSize: 20, fontWeight: '800', color: '#111827' },
	subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14 },
	helper: { marginTop: 6, color: '#6B7280', fontSize: 14 },

	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 8,
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
		marginTop: 12,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 999,
	},
	statusBadgeText: { color: '#374151', fontWeight: '700', fontSize: 12 },

	statusBadgeCompleted: {
		marginTop: 12,
		alignSelf: 'flex-start',
		flexDirection: 'row',
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

	// mini sparkline
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sparklineRow: { flexDirection: 'row', alignItems: 'flex-end', height: 28 },
	sparkBar: {
		width: 6,
		marginRight: 4,
		borderTopLeftRadius: 3,
		borderTopRightRadius: 3,
		backgroundColor: '#93C5FD',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#60A5FA',
	},
	sparklineEmpty: {
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 6,
	},
	sparklineEmptyText: { fontSize: 12, color: '#6B7280' },

	miniStat: {
		width: 84,
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
		paddingVertical: 8,
		alignItems: 'center',
	},
	miniStatLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
	miniStatValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

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
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#E5E7EB',
	},
	reviewLabel: { fontSize: 14, color: '#6B7280', width: 110 },
	reviewValue: { flex: 1, fontSize: 16, color: '#111827' },
	disclaimer: { marginTop: 12, color: '#6B7280', fontSize: 12 },

	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#FEE2E2',
		borderColor: '#FCA5A5',
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
	},
	errorText: { color: '#991B1B', fontSize: 13, flex: 1 },
	retryPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#FCA5A5',
	},
	retryPillText: { color: '#7F1D1D', fontWeight: '700', fontSize: 12 },

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
	},
	primaryBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#00a2ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
	secondaryBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtnText: { color: '#111827', fontSize: 16, fontWeight: '700' },
	btnDisabled: { opacity: 0.6 },

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
