import React, {
	useEffect,
	useRef,
	useState,
	useContext,
	useCallback,
	useMemo,
} from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	TouchableOpacity,
	Platform,
	Keyboard,
	KeyboardAvoidingView,
	StatusBar,
	InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionContext } from '../../../src/context/transactionContext';
import { isDevMode } from '../../../src/config/environment';
import { createLogger } from '../../../src/utils/sublogger';
import { palette, radius, space, shadow, type } from '../../../src/ui/theme';
import { removeItem } from '../../../src/utils/safeStorage';
import { AppCard, AppText, AppButton } from '../../../src/ui/primitives';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { parseCaptureLine } from '../../../src/lib/parse-capture-line';
import {
	loadCaptureRecentChips,
	pushCaptureRecentChip,
} from '../../../src/lib/captureRecentChips';

const transactionScreenLog = createLogger('TransactionScreen');

const PARSE_ERROR_MESSAGE =
	'Use "description amount", e.g. coffee 5.75 or paycheck 1200.';

/** Clears any legacy draft from the old multi-field Capture screen. */
const LEGACY_FORM_STATE_KEY = 'transaction_form_state';

function formatUsd(n: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2,
	}).format(n);
}

export default function TransactionScreenProModern() {
	const captureLineRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const insets = useSafeAreaInsets();
	const topInset =
		insets.top > 0
			? insets.top
			: Platform.OS === 'android'
				? (StatusBar.currentHeight ?? 24)
				: 44;

	const [captureLine, setCaptureLine] = useState('');
	const [captureParseError, setCaptureParseError] = useState<string | null>(
		null,
	);
	const [recentChips, setRecentChips] = useState<string[]>([]);
	const [savedLines, setSavedLines] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addTransaction } = useContext(TransactionContext);

	useEffect(() => {
		loadCaptureRecentChips().then(setRecentChips);
	}, []);

	useEffect(() => {
		void removeItem(LEGACY_FORM_STATE_KEY);
	}, []);

	useEffect(() => {
		const task = InteractionManager.runAfterInteractions(() => {
			const t = setTimeout(() => {
				captureLineRef.current?.focus();
			}, 100);
			return () => clearTimeout(t);
		});
		return () => task.cancel();
	}, []);

	useEffect(() => {
		const onShow = (e: { endCoordinates?: { height?: number } }) =>
			setKeyboardHeight(e?.endCoordinates?.height ?? 0);
		const onHide = () => setKeyboardHeight(0);

		const showSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			onShow,
		);
		const hideSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			onHide,
		);

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	const parsedPreview = useMemo(() => {
		const t = captureLine.trim();
		if (!t) return null;
		return parseCaptureLine(t);
	}, [captureLine]);

	const parsedSummary = useMemo(() => {
		if (!parsedPreview) return null;
		return parsedPreview.type === 'income'
			? `Income · ${parsedPreview.description} · ${formatUsd(parsedPreview.amount)}`
			: `Expense · ${parsedPreview.description} · ${formatUsd(
					Math.abs(parsedPreview.amount),
				)}`;
	}, [parsedPreview]);

	const onCaptureLineChange = useCallback((text: string) => {
		setCaptureLine(text);
		setCaptureParseError(null);
	}, []);

	const onCaptureBlur = useCallback(() => {
		const t = captureLine.trim();
		if (t && !parseCaptureLine(t)) setCaptureParseError(PARSE_ERROR_MESSAGE);
		else setCaptureParseError(null);
	}, [captureLine]);

	const saveEntry = useCallback(async () => {
		if (isSubmitting) return;
		const line = captureLine.trim();
		if (!line) {
			queueMicrotask(() => captureLineRef.current?.focus());
			return;
		}

		const parsed = parseCaptureLine(line);
		if (!parsed) {
			setCaptureParseError(PARSE_ERROR_MESSAGE);
			Alert.alert('Check your line', PARSE_ERROR_MESSAGE);
			queueMicrotask(() => captureLineRef.current?.focus());
			return;
		}

		setCaptureParseError(null);
		setIsSubmitting(true);
		try {
			await addTransaction({
				description: parsed.description,
				amount: parsed.amount,
				date: new Date().toISOString(),
				type: parsed.type,
				source: 'manual',
			});

			setSavedLines((prev) => [line, ...prev].slice(0, 8));
			await pushCaptureRecentChip(line);
			setRecentChips(await loadCaptureRecentChips());
			setCaptureLine('');
			queueMicrotask(() => captureLineRef.current?.focus());
		} catch (e) {
			if (isDevMode) {
				transactionScreenLog.error('Save transaction error', e);
			}
			Alert.alert('Error', 'Failed to save. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, captureLine, addTransaction]);

	const canSave = !!parsedPreview;

	return (
		<ErrorBoundary>
			<SafeAreaView
				style={[styles.container, { paddingTop: topInset }]}
				edges={[]}
			>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={topInset}
				>
					<ScrollView
						ref={scrollRef}
						style={{ flex: 1 }}
						contentContainerStyle={styles.content}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode={
							Platform.OS === 'ios' ? 'interactive' : 'on-drag'
						}
						automaticallyAdjustContentInsets={false}
						contentInsetAdjustmentBehavior="never"
						showsVerticalScrollIndicator={false}
					>
					<View style={styles.formWrap}>
						<AppText.Caption color="muted" style={styles.kicker}>
							Immediate capture
						</AppText.Caption>
						<AppText.Title style={styles.heroTitle}>Capture</AppText.Title>
						<AppText.Caption color="muted" style={styles.heroSub}>
							Type one entry and save instantly.
						</AppText.Caption>

						<AppCard
							style={styles.captureCard}
							padding={space.lg}
							borderRadius={radius.xl}
							bordered
						>
							<AppText.Label color="muted" style={styles.captureFieldLabel}>
								New entry
							</AppText.Label>
							<TextInput
								ref={captureLineRef}
								style={styles.captureInput}
								value={captureLine}
								onChangeText={onCaptureLineChange}
								onBlur={onCaptureBlur}
								placeholder="Description, then amount (e.g. coffee 5.75)"
								placeholderTextColor={palette.textSubtle}
								accessibilityLabel="Quick capture line"
								returnKeyType="done"
								onSubmitEditing={() => {
									if (canSave) void saveEntry();
									else Keyboard.dismiss();
								}}
								autoCapitalize="sentences"
								autoCorrect
							/>
							{parsedSummary ? (
								<View style={styles.previewSummary}>
									<Text style={styles.previewSummaryText}>
										{parsedSummary}
									</Text>
								</View>
							) : null}
							{captureParseError ? (
								<AppText.Caption color="danger" style={styles.captureError}>
									{captureParseError}
								</AppText.Caption>
							) : null}
							{isSubmitting ? (
								<AppText.Caption color="muted" style={styles.savingHint}>
									Saving to server…
								</AppText.Caption>
							) : null}
							{recentChips.length > 0 ? (
								<View style={styles.chipsSection}>
									<AppText.Caption color="muted" style={styles.chipsLabel}>
										Recent
									</AppText.Caption>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.chipsRow}
									>
										{recentChips.map((chip) => (
											<TouchableOpacity
												key={chip}
												style={styles.recentChip}
												onPress={() => onCaptureLineChange(chip)}
											>
												<Text style={styles.recentChipText} numberOfLines={1}>
													{chip}
												</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							) : null}
							{savedLines.length > 0 ? (
								<View style={styles.savedSection}>
									<AppText.Caption color="muted" style={styles.savedHeading}>
										Just captured
									</AppText.Caption>
									{savedLines.map((line, i) => (
										<View key={`${line}-${i}`} style={styles.savedRow}>
											<AppText.Caption color="default">{line}</AppText.Caption>
										</View>
									))}
								</View>
							) : null}
							<View style={styles.saveSection}>
								<AppButton
									label={isSubmitting ? 'Saving to server…' : 'Save entry'}
									variant="primary"
									icon={isSubmitting ? undefined : 'checkmark-outline'}
									onPress={() => void saveEntry()}
									disabled={isSubmitting || !canSave}
									loading={isSubmitting}
									fullWidth
									style={styles.saveButton}
									accessibilityLabel="Save capture entry"
								/>
							</View>
							<AppText.Caption color="muted" style={styles.footerHint}>
								Save clears the line. Income hints: paycheck, salary, deposit,
								refund…
							</AppText.Caption>
						</AppCard>
					</View>

						<View
							style={{
								height: keyboardHeight > 0 ? 0 : insets.bottom + space.xxl,
							}}
						/>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</ErrorBoundary>
	);
}

const FORM_MAX_WIDTH = 420;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.surfaceAlt },

	content: {
		flexGrow: 1,
		paddingHorizontal: space.xl,
		paddingTop: space.xl,
		alignItems: 'stretch',
	},
	formWrap: {
		width: '100%',
		maxWidth: FORM_MAX_WIDTH,
		alignSelf: 'center',
	},
	kicker: {
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		fontWeight: '600',
		marginBottom: space.xs,
	},
	heroTitle: {
		...type.titleMd,
		fontSize: 20,
		fontWeight: '700',
		color: palette.text,
		letterSpacing: -0.4,
		marginBottom: space.sm,
	},
	heroSub: {
		lineHeight: 20,
		marginBottom: space.lg,
	},
	captureCard: {
		marginBottom: space.md,
	},
	captureFieldLabel: {
		marginBottom: space.xs,
	},
	captureInput: {
		borderRadius: radius.xl2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		backgroundColor: palette.input,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 17,
		color: palette.text,
		marginTop: space.xs,
	},
	previewSummary: {
		alignSelf: 'flex-start',
		marginTop: space.md,
		maxWidth: '100%',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: radius.xl2,
		borderWidth: 1,
		borderColor: palette.borderAccent,
		backgroundColor: palette.accentSoft,
	},
	previewSummaryText: {
		...type.bodySm,
		color: palette.primaryStrong,
		fontWeight: '600',
	},
	captureError: {
		marginTop: space.sm,
	},
	savingHint: {
		marginTop: space.sm,
	},
	chipsSection: {
		marginTop: space.md,
	},
	chipsLabel: {
		marginBottom: space.xs,
	},
	chipsRow: {
		flexDirection: 'row',
		gap: space.sm,
		paddingRight: space.lg,
	},
	recentChip: {
		maxWidth: 220,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceSunken,
	},
	recentChipText: {
		...type.bodyXs,
		color: palette.text,
	},
	savedSection: {
		marginTop: space.lg,
		paddingTop: space.md,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
	},
	savedHeading: {
		fontWeight: '600',
		marginBottom: space.sm,
	},
	savedRow: {
		borderRadius: radius.xl2,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceSunken,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		marginBottom: space.xs,
	},
	footerHint: {
		marginTop: space.md,
		lineHeight: 18,
	},
	saveSection: {
		marginTop: space.md,
		alignSelf: 'stretch',
	},
	saveButton: {
		alignSelf: 'stretch',
		width: '100%',
		minHeight: 52,
		borderRadius: radius.xl,
		...shadow.soft,
	},
});
