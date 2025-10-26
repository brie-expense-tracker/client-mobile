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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useWeeklyReflection } from '../../../src/hooks/useWeeklyReflection';
import { WeeklyReflection } from '../../../src/services';
import { MoodRatingSelector } from './components/MoodRatingSelector';
import { WinOfTheWeekInput } from './components/WinOfTheWeekInput';
import { ReflectionNotesInput } from './components/ReflectionNotesInput';
import { FinancialMetricsCard } from './components/FinancialMetricsCard';
import { ReflectionStatsCard } from './components/ReflectionStatsCard';
import ReflectionSuccessScreen from './ReflectionSuccessScreen';
import {
	accessibilityProps,
	dynamicTextStyle,
} from '../../../src/utils/accessibility';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * ReflectionWizard
 * ---------------------------------------------------------------------------
 * A guided, 5‑step flow to improve completion rates for weekly reflections.
 * Steps:
 * 0) Overview + stats
 * 1) Mood rating
 * 2) Win of the week
 * 3) Notes
 * 4) Review & save
 */

export default function ReflectionWizard() {
	const router = useRouter();
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

	const [step, setStep] = useState(0); // 0..4
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
		// Rehydrate local state when hook data updates
		setLocalWin(currentReflection?.winOfTheWeek || '');
		setLocalNotes(currentReflection?.reflectionNotes || '');
	}, [currentReflection?.winOfTheWeek, currentReflection?.reflectionNotes]);

	const titles = [
		'Weekly reflection',
		'How was your week?',
		'Win of the week',
		'Reflection notes',
		'Review & save',
	];

	const canContinue = useMemo(() => {
		if (!currentReflection) return false;
		switch (step) {
			case 0:
				return true; // overview
			case 1:
				return !!currentReflection.moodRating; // require a rating
			case 2:
				return true; // optional win
			case 3:
				return true; // optional notes
			case 4:
				return true; // review screen
			default:
				return false;
		}
	}, [step, currentReflection]);

	const progressPct = ((step + 1) / 5) * 100;

	const next = useCallback(() => {
		if (!canContinue) return;
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setStep((s) => Math.min(4, s + 1));
	}, [canContinue]);

	const back = useCallback(() => {
		if (busy) return;
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setStep((s) => Math.max(0, s - 1));
	}, [busy]);

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

	const handleSave = useCallback(async () => {
		if (!currentReflection) {
			console.log('No current reflection available');
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
			console.log('Starting save with data:', {
				moodRating: currentReflection.moodRating,
				winOfTheWeek: localWin,
				reflectionNotes: localNotes,
			});

			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
				() => {}
			);
			const saved = await saveReflection({
				moodRating: currentReflection.moodRating,
				winOfTheWeek: localWin,
				reflectionNotes: localNotes,
			});

			console.log('Save successful, received:', saved);
			setDismissedSuccess(false); // Reset so the success screen shows
			setSavedReflection(saved);
			setShowSuccess(true);
		} catch (error) {
			console.error('Save failed:', error);
			await Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Error
			).catch(() => {});
			Alert.alert('Error', 'Failed to save your reflection. Please try again.');
		} finally {
			setBusy(false);
		}
	}, [currentReflection, localWin, localNotes, saveReflection]);

	const handleBackToWizard = useCallback(() => {
		console.log('handleBackToWizard called');
		setDismissedSuccess(true);
		setShowSuccess(false);
		setSavedReflection(null);
		setStep(0);
		refreshReflection();
	}, [refreshReflection]);

	const handleEditReflection = useCallback(() => {
		console.log('handleEditReflection called');
		setDismissedSuccess(false); // Allow editing even if it was dismissed
		setShowSuccess(false);
		setSavedReflection(null);
		setStep(1); // Go back to mood rating step
	}, []);

	// Initial loading
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
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingWrap}>
					<Text style={[styles.loadingText, dynamicTextStyle]}>
						No reflection available. Pull to refresh in the main tab.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Show success screen after saving OR if reflection is already completed for this week
	// But don't show it if user has dismissed it
	if (
		!dismissedSuccess &&
		((showSuccess && savedReflection) ||
			(currentReflection?.completed && !showSuccess && !savedReflection))
	) {
		const reflectionToShow = savedReflection || currentReflection;
		console.log('Showing success screen with reflection:', reflectionToShow);
		console.log(
			'showSuccess:',
			showSuccess,
			'savedReflection:',
			savedReflection,
			'dismissedSuccess:',
			dismissedSuccess
		);
		return (
			<ReflectionSuccessScreen
				reflection={reflectionToShow!}
				onBack={handleBackToWizard}
				onEdit={handleEditReflection}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<BorderlessButton
					onPress={back}
					enabled={step > 0 && !busy}
					{...accessibilityProps.button}
					accessibilityLabel={step > 0 ? 'Go back' : 'Back disabled'}
				>
					<Ionicons
						name="chevron-back"
						size={24}
						color={step > 0 ? '#111827' : '#9CA3AF'}
					/>
				</BorderlessButton>
				<Text style={[styles.headerTitle, dynamicTextStyle]}>
					{titles[step]}
				</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Progress */}
			<View style={styles.progressWrap}>
				<View style={[styles.progressBar, { width: `${progressPct}%` }]} />
			</View>

			<ScrollView
				style={styles.body}
				contentContainerStyle={{ paddingBottom: 80 }}
				showsVerticalScrollIndicator={false}
			>
				{error && (
					<View style={styles.errorBanner}>
						<Ionicons name="warning" size={18} color="#B91C1C" />
						<Text style={[styles.errorText, dynamicTextStyle]}>{error}</Text>
						<RectButton style={styles.retryPill} onPress={refreshReflection}>
							<Text style={styles.retryPillText}>Retry</Text>
						</RectButton>
					</View>
				)}

				{step === 0 && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.title, dynamicTextStyle]}>
							Let&apos;s reflect on this week
						</Text>
						<Text style={[styles.subtitle, dynamicTextStyle]}>
							A few quick steps to capture your mood, a highlight, and any
							notes. You can edit anytime.
						</Text>
						<View style={{ height: 12 }} />
						<ReflectionStatsCard reflection={currentReflection} />
						<FinancialMetricsCard
							metrics={currentReflection.financialMetrics as any}
						/>
					</View>
				)}

				{step === 1 && (
					<View style={[styles.card, shadowCard]}>
						<MoodRatingSelector
							rating={currentReflection.moodRating}
							onRatingChange={handleMoodChange}
							disabled={saving || busy}
							showTrend={false}
						/>
					</View>
				)}

				{step === 2 && (
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

				{step === 3 && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.title, dynamicTextStyle]}>
							Reflection notes
						</Text>
						<Text style={[styles.helper, dynamicTextStyle]}>
							Any other thoughts or reminders for next week? (optional)
						</Text>
						<ReflectionNotesInput
							value={localNotes}
							onChange={handleNotesChange}
							disabled={saving || busy}
						/>
					</View>
				)}

				{step === 4 && (
					<View style={[styles.card, shadowCard]}>
						<Text style={[styles.title, dynamicTextStyle]}>Review</Text>
						<View style={styles.reviewRow}>
							<Text style={[styles.reviewLabel, dynamicTextStyle]}>Mood</Text>
							<Text style={[styles.reviewValue, dynamicTextStyle]}>
								{currentReflection.moodRating
									? `${currentReflection.moodRating}/5`
									: 'Not set'}
							</Text>
						</View>
						<View style={styles.reviewRow}>
							<Text style={[styles.reviewLabel, dynamicTextStyle]}>Win</Text>
							<Text style={[styles.reviewValue, dynamicTextStyle]}>
								{localWin || '—'}
							</Text>
						</View>
						<View style={styles.reviewRow}>
							<Text style={[styles.reviewLabel, dynamicTextStyle]}>Notes</Text>
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

			{/* Footer actions for steps 0..3 */}
			{step < 4 && (
				<View style={styles.footer}>
					<RectButton
						style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]}
						onPress={refreshReflection}
						{...accessibilityProps.button}
					>
						<Text style={styles.secondaryBtnText}>Refresh</Text>
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
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	headerTitle: {
		flex: 1,
		textAlign: 'center',
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
	title: { fontSize: 20, fontWeight: '800', color: '#111827' },
	subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14 },
	helper: { marginTop: 6, color: '#6B7280', fontSize: 14 },

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
		marginBottom: 12,
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
});
