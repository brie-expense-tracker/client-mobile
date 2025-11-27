import React, { useState, useEffect } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	Text,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../../../../src/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RecurringExpenseService } from '../../../../src/services';
import { DateField } from '../../../../src/components/DateField';
import { PeriodSelector } from '../../../../src/components/forms';
import { useBudget } from '../../../../src/context/budgetContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, radius, space, type } from '../../../../src/ui/theme';

const STORAGE_KEY = '@brie:available_categories';

const FREQUENCY_OPTIONS = [
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{ value: 'yearly', label: 'Yearly', icon: 'calendar-outline' as const },
];

const AddRecurringExpenseScreen: React.FC = () => {
	const [vendor, setVendor] = useState('');
	const [amount, setAmount] = useState('');
	const [frequency, setFrequency] = useState<
		'weekly' | 'monthly' | 'quarterly' | 'yearly'
	>('monthly');
	const [nextDueDate, setNextDueDate] = useState(
		new Date().toISOString().split('T')[0]
	);
	const [category, setCategory] = useState<string | null>(null);
	const [storedCategories, setStoredCategories] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	const { getAllCategories } = useBudget();
	const budgetCategories = getAllCategories();

	// Load stored categories from AsyncStorage
	useEffect(() => {
		const loadStoredCategories = async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					setStoredCategories(Array.isArray(parsed) ? parsed : []);
				}
			} catch (error) {
				console.error('Error loading stored categories:', error);
			}
		};

		loadStoredCategories();
	}, []);

	// Combine budget categories and stored categories, remove duplicates
	const availableCategories = Array.from(
		new Set([...budgetCategories, ...storedCategories])
	).sort();

	const handleSave = async () => {
		if (!vendor.trim()) {
			Alert.alert('Missing information', 'Please enter a vendor name.');
			return;
		}

		if (!amount.trim() || isNaN(parseFloat(amount))) {
			Alert.alert('Invalid amount', 'Please enter a valid amount.');
			return;
		}

		setLoading(true);
		try {
			await RecurringExpenseService.createRecurringExpense({
				vendor: vendor.trim(),
				amount: parseFloat(amount),
				frequency,
				nextExpectedDate: new Date(nextDueDate).toISOString(),
				category: category ?? undefined,
			});

			Alert.alert('Success', 'Recurring bill added successfully!', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			logger.error('[AddRecurringExpenseScreen] Error saving:', error);
			Alert.alert('Error', 'Failed to save recurring bill. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDateChange = (isoDate: string) => {
		setNextDueDate(isoDate);
	};

	return (
		<SafeAreaView style={styles.container} edges={['left', 'right']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
			>
				{/* Header / Hero */}
				<View style={styles.header}>
					<View style={styles.pill}>
						<Text style={styles.pillText}>New bill</Text>
					</View>
					<Text style={styles.title}>Add a recurring bill</Text>
					<Text style={styles.subtitle}>
						Track subscriptions and regular payments so Brie can remind you
						before they&apos;re due.
					</Text>
				</View>

				{/* Details Card */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Details</Text>

					<View style={styles.fieldGroup}>
						<Label text="Vendor name" required />
						<TextInput
							style={styles.input}
							value={vendor}
							onChangeText={setVendor}
							placeholder="Netflix, Rent, Gym membership"
							placeholderTextColor={palette.textSubtle}
							autoCapitalize="words"
							returnKeyType="next"
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Amount" required />
						<View style={styles.amountContainer}>
							<Text style={[type.body, styles.currencySymbol]}>$</Text>
							<TextInput
								style={[type.body, styles.amountInput]}
								value={amount}
								onChangeText={setAmount}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Frequency" required />
						<PeriodSelector
							options={FREQUENCY_OPTIONS}
							selectedPeriod={frequency}
							onPeriodSelect={(f) =>
								setFrequency(f as 'weekly' | 'monthly' | 'quarterly' | 'yearly')
							}
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Next due date" required />
						<DateField
							value={nextDueDate}
							onChange={handleDateChange}
							title=""
							placeholder="Select date"
							minDate={new Date().toISOString().split('T')[0]}
						/>
						<Text style={styles.helperText}>
							This is when the next payment is expected.
						</Text>
					</View>
				</View>

				{/* Category & Info Card */}
				<View style={[styles.card, { marginTop: space.lg }]}>
					<Text style={styles.sectionLabel}>Category & reminders</Text>

					<View style={styles.fieldGroup}>
						<Label text="Category" optional />
						<Text style={styles.helperText}>
							This category will be applied to each payment.
						</Text>

						{availableCategories.length > 0 ? (
							<View style={styles.categoryChipContainer}>
								{availableCategories.map((cat) => (
									<TouchableOpacity
										key={cat}
										style={[
											styles.categoryChip,
											category === cat && styles.categoryChipSelected,
										]}
										onPress={() =>
											setCategory((prev) => (prev === cat ? null : cat))
										}
										activeOpacity={0.7}
									>
										<Text
											style={[
												type.body,
												category === cat
													? styles.categoryChipTextSelected
													: styles.categoryChipText,
											]}
										>
											{cat}
										</Text>
									</TouchableOpacity>
								))}
								<TouchableOpacity
									style={[styles.categoryChip, styles.newChip]}
									onPress={() => router.push('/settings/categories')}
									activeOpacity={0.7}
								>
									<Text style={[type.body, styles.newChipText]}>+ New</Text>
								</TouchableOpacity>
							</View>
						) : (
							<View>
								<Text style={[type.small, styles.emptyText]}>
									No categories yet.
								</Text>
								<TouchableOpacity
									style={styles.manageButton}
									onPress={() => router.push('/settings/categories')}
									activeOpacity={0.7}
								>
									<Text style={[type.body, styles.manageButtonText]}>
										Add your first category
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>

					<View style={[styles.infoCard, { marginTop: space.md }]}>
						<Ionicons
							name="information-circle"
							size={20}
							color={palette.info}
						/>
						<Text style={[type.body, styles.infoText]}>
							This recurring bill will be tracked and you&apos;ll receive
							notifications when it&apos;s due.
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* Footer CTA */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.cta, loading && { opacity: 0.7 }]}
					onPress={handleSave}
					disabled={loading}
					activeOpacity={0.85}
				>
					{loading ? (
						<ActivityIndicator color={palette.primaryTextOn} />
					) : (
						<Text style={styles.ctaText}>Save bill</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

function Label({
	text,
	required,
	optional,
	style,
}: {
	text: string;
	required?: boolean;
	optional?: boolean;
	style?: any;
}) {
	return (
		<Text style={[styles.label, style]}>
			{text}
			{required && <Text style={styles.required}> *</Text>}
			{optional && <Text style={styles.optional}> (optional)</Text>}
		</Text>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.sm,
		paddingBottom: space.xl,
	},
	header: {
		marginBottom: space.lg,
	},
	pill: {
		alignSelf: 'flex-start',
		paddingHorizontal: space.sm + 2,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: palette.accentSoft,
		marginBottom: space.sm,
	},
	pillText: {
		color: palette.accent,
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: palette.text,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: palette.textMuted,
		lineHeight: 20,
	},
	card: {
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderWidth: 1,
		borderColor: palette.border,
		gap: space.md,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 2,
	},
	fieldGroup: {
		marginTop: 8,
	},
	label: {
		fontWeight: '600',
		color: palette.text,
		marginBottom: 4,
		fontSize: 14,
	},
	required: {
		color: palette.danger,
	},
	optional: {
		color: palette.textMuted,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	amountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		backgroundColor: palette.surface,
	},
	currencySymbol: {
		color: palette.text,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		fontWeight: '600',
	},
	amountInput: {
		flex: 1,
		paddingHorizontal: 0,
		paddingVertical: space.md,
		color: palette.text,
		fontWeight: '600',
	},
	helperText: {
		marginTop: 4,
		fontSize: 12,
		color: palette.textMuted,
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: palette.infoSubtle,
		padding: space.md,
		borderRadius: radius.md,
		borderLeftWidth: 4,
		borderLeftColor: palette.info,
	},
	infoText: {
		flex: 1,
		marginLeft: space.sm,
		color: palette.textMuted,
		lineHeight: 20,
	},
	categoryChipContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
		marginTop: space.sm,
	},
	categoryChip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: radius.pill,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
	},
	categoryChipSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
	},
	categoryChipText: {
		color: palette.textSubtle,
	},
	categoryChipTextSelected: {
		color: palette.primary,
		fontWeight: '600',
	},
	newChip: {
		borderStyle: 'dashed',
		borderColor: palette.primary,
	},
	newChipText: {
		color: palette.primary,
		fontWeight: '600',
	},
	emptyText: {
		color: palette.textSubtle,
		marginBottom: space.xs,
	},
	manageButton: {
		marginTop: space.xs,
	},
	manageButtonText: {
		color: palette.primary,
		fontWeight: '500',
	},
	footer: {
		paddingHorizontal: space.lg,
		paddingBottom: space.xl,
		paddingTop: space.sm,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		backgroundColor: palette.surface,
	},
	cta: {
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: {
		color: palette.primaryTextOn,
		fontWeight: '700',
		fontSize: 16,
	},
});

export default AddRecurringExpenseScreen;
