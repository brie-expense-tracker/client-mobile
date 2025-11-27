import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	Alert,
	TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
	Page,
	Section,
	Card,
	LoadingState,
	EmptyState,
	palette,
	space,
	radius,
	type as typography,
} from '../../../../src/ui';

import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';
import { RecurringExpenseService } from '../../../../src/services';
import { resolveRecurringExpenseAppearance } from '../../../../src/utils/recurringExpenseAppearance';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

const formatCurrency = (amount: number): string =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount);

const formatDate = (dateString: string | null | undefined) => {
	if (!dateString) return 'Unknown';
	const date = new Date(dateString);
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

export default function RecurringSummaryScreen() {
	const router = useRouter();
	const { patternId } = useLocalSearchParams<{ patternId: string }>();

	const { expenses, isLoading, hasLoaded, refetch, deleteRecurringExpense } =
		useRecurringExpense();

	const [refreshing, setRefreshing] = useState(false);

	const expense = useMemo(
		() => expenses.find((e) => e.patternId === patternId) ?? null,
		[expenses, patternId]
	);

	// Make sure data is loaded
	useEffect(() => {
		if (!hasLoaded && !expense) {
			refetch();
		}
	}, [hasLoaded, expense, refetch]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch {
			Alert.alert('Error', 'Failed to refresh this recurring expense.');
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	const handleEdit = useCallback(() => {
		if (!expense) return;

		router.push({
			pathname: './edit',
			params: { id: expense.patternId },
		});
	}, [expense, router]);

	const handleDelete = useCallback(() => {
		if (!expense) return;

		Alert.alert(
			'Delete recurring expense?',
			`This will remove "${expense.vendor}" and its future tracking.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteRecurringExpense(expense.patternId);
							router.back();
						} catch (error) {
							const msg =
								error instanceof Error
									? error.message
									: 'Failed to delete recurring expense.';
							Alert.alert('Delete Failed', msg);
						}
					},
				},
			]
		);
	}, [expense, deleteRecurringExpense, router]);

	// -------- Loading / empty states --------

	if ((isLoading && !hasLoaded) || (!expense && !hasLoaded)) {
		return (
			<Page>
				<LoadingState label="Loading recurring expense..." />
			</Page>
		);
	}

	if (!expense) {
		return (
			<Page>
				<EmptyState
					icon="repeat-outline"
					title="Recurring expense not found"
					subtitle="We couldn't find this recurring pattern. It may have been deleted."
					ctaLabel="Back to recurring"
					onPress={() => router.back()}
				/>
			</Page>
		);
	}

	// -------- Derived state --------

	const { icon, color } = resolveRecurringExpenseAppearance(expense);
	const nextDate = expense.nextExpectedDate;
	const daysUntil = RecurringExpenseService.getDaysUntilNext(nextDate);

	const isOverdue = daysUntil <= 0;
	const isDueSoon = daysUntil > 0 && daysUntil <= 7;

	const amountLabel = formatCurrency(expense.amount);
	const frequencyLabel =
		expense.frequency.charAt(0).toUpperCase() + expense.frequency.slice(1);

	let statusLabel = '';
	let statusColor = palette.textMuted;
	let chipBg = palette.surfaceAlt;
	let chipTextColor = palette.textMuted;

	if (isOverdue) {
		statusLabel = 'Overdue';
		statusColor = '#EF4444';
		chipBg = '#FEF2F2';
		chipTextColor = '#B91C1C';
	} else if (isDueSoon) {
		statusLabel = 'Due soon';
		statusColor = '#F97316';
		chipBg = '#FFF7ED';
		chipTextColor = '#C05621';
	} else {
		statusLabel = 'Scheduled';
		statusColor = '#10B981';
		chipBg = '#ECFDF5';
		chipTextColor = '#047857';
	}

	const daysText =
		daysUntil === 0
			? 'Due today'
			: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ${
					daysUntil < 0 ? 'overdue' : 'remaining'
			  }`;

	return (
		<Page
			title={expense.vendor}
			subtitle={`${frequencyLabel} • ${amountLabel}`}
			right={
				<View style={styles.headerActions}>
					<View style={[styles.statusPill, { backgroundColor: chipBg }]}>
						<View
							style={[
								styles.statusDot,
								{
									backgroundColor: statusColor,
								},
							]}
						/>
						<Text style={[styles.statusPillText, { color: chipTextColor }]}>
							{statusLabel}
						</Text>
					</View>
				</View>
			}
		>
			<View style={styles.layout}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							tintColor={palette.primary}
							colors={[palette.primary]}
						/>
					}
				>
					{/* Overview / hero */}
					<Section
						title="Overview"
						subtitle="Quick view of this recurring payment."
					>
						<Card>
							{/* Header row */}
							<View style={styles.heroHeader}>
								<View
									style={[
										styles.iconWrapper,
										{ backgroundColor: `${color}1A` },
									]}
								>
									<Ionicons name={icon as any} size={24} color={color} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.vendorText, dynamicTextStyle('title2')]}>
										{expense.vendor}
									</Text>
									<Text
										style={[styles.frequencyText, dynamicTextStyle('caption2')]}
									>
										{frequencyLabel} • {amountLabel}
									</Text>
								</View>
							</View>

							{/* Next due */}
							<View style={styles.row}>
								<Text style={[styles.rowLabel, dynamicTextStyle('caption2')]}>
									Next due
								</Text>
								<View style={styles.rowRight}>
									<Text style={[styles.rowValue, dynamicTextStyle('body')]}>
										{formatDate(nextDate)}
									</Text>
									<Text style={[styles.rowHint, dynamicTextStyle('caption2')]}>
										{daysText}
									</Text>
								</View>
							</View>

							<View style={styles.row}>
								<Text style={[styles.rowLabel, dynamicTextStyle('caption2')]}>
									Status
								</Text>
								<Text
									style={[
										styles.rowValue,
										dynamicTextStyle('body'),
										{ color: statusColor },
									]}
								>
									{statusLabel}
								</Text>
							</View>

							<View style={styles.row}>
								<Text style={[styles.rowLabel, dynamicTextStyle('caption2')]}>
									Amount
								</Text>
								<Text style={[styles.rowValue, dynamicTextStyle('body')]}>
									{amountLabel}
								</Text>
							</View>

							<View style={styles.rowLast}>
								<Text style={[styles.rowLabel, dynamicTextStyle('caption2')]}>
									Frequency
								</Text>
								<Text style={[styles.rowValue, dynamicTextStyle('body')]}>
									{frequencyLabel}
								</Text>
							</View>
						</Card>
					</Section>

					{/* Metadata / extra info */}
					<Section title="Details">
						<Card>
							<View style={styles.detailRow}>
								<Text
									style={[styles.detailLabel, dynamicTextStyle('caption2')]}
								>
									Pattern ID
								</Text>
								<Text style={[styles.detailValue, dynamicTextStyle('body')]}>
									{expense.patternId}
								</Text>
							</View>

							{expense.confidence != null && (
								<View style={styles.detailRow}>
									<Text
										style={[styles.detailLabel, dynamicTextStyle('caption2')]}
									>
										Detection confidence
									</Text>
									<Text style={[styles.detailValue, dynamicTextStyle('body')]}>
										{Math.round((expense.confidence ?? 0) * 100)}%
									</Text>
								</View>
							)}

							{Array.isArray((expense as any).transactions) &&
								(expense as any).transactions.length > 0 && (
									<View style={styles.detailRowLast}>
										<Text
											style={[styles.detailLabel, dynamicTextStyle('caption2')]}
										>
											Linked transactions
										</Text>
										<Text
											style={[styles.detailValue, dynamicTextStyle('body')]}
										>
											{(expense as any).transactions.length}
										</Text>
									</View>
								)}
						</Card>
					</Section>

					{/* Actions */}
					<Section>
						<TouchableOpacity
							style={styles.primaryCta}
							onPress={handleEdit}
							activeOpacity={0.85}
						>
							<Text style={[styles.primaryCtaText, dynamicTextStyle('body')]}>
								Edit expense
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleDelete}
							style={styles.deleteButton}
							activeOpacity={0.7}
						>
							<Text style={styles.deleteText}>Delete recurring expense</Text>
						</TouchableOpacity>
					</Section>
				</ScrollView>
			</View>
		</Page>
	);
}

const styles = StyleSheet.create({
	layout: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: space.xl,
		gap: space.lg,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: radius.pill,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusPillText: {
		...typography.bodyXs,
		fontWeight: '600',
	},
	heroHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		columnGap: 12,
	},
	iconWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	vendorText: {
		...typography.titleSm,
		color: palette.text,
		fontWeight: '700',
	},
	frequencyText: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.borderMuted,
	},
	rowLast: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
	},
	rowLabel: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	rowRight: {
		alignItems: 'flex-end',
	},
	rowValue: {
		...typography.bodySm,
		color: palette.text,
		fontWeight: '500',
	},
	rowHint: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	detailRow: {
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.borderMuted,
	},
	detailRowLast: {
		paddingVertical: 8,
	},
	detailLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: 2,
	},
	detailValue: {
		...typography.bodySm,
		color: palette.text,
	},
	primaryCta: {
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryCtaText: {
		color: palette.primaryTextOn,
		fontSize: 16,
		fontWeight: '600',
	},
	deleteButton: {
		marginTop: 12,
		alignItems: 'center',
	},
	deleteText: {
		...typography.bodySm,
		color: '#EF4444',
		fontWeight: '500',
	},
});

