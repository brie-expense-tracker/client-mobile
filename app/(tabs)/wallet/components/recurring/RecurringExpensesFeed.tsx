// app/(tabs)/wallet/recurring/components/RecurringExpensesFeed.tsx

import React, { useMemo, useState, useEffect } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	Pressable,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
	RecurringExpense,
	RecurringExpenseService,
} from '../../../../../src/services';
import { resolveRecurringExpenseAppearance } from '../../../../../src/utils/recurringExpenseAppearance';
import { isDevMode } from '../../../../../src/config/environment';
import { createLogger } from '../../../../../src/utils/sublogger';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

const recurringExpensesFeedLog = createLogger('RecurringExpensesFeed');

// Extended interface for expenses with payment status
interface RecurringExpenseWithPaymentStatus extends RecurringExpense {
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

// Helper for next due date
const calculateNextDueDate = (
	currentDate: string,
	frequency: string
): string => {
	const date = new Date(currentDate);

	switch (frequency) {
		case 'weekly':
			date.setDate(date.getDate() + 7);
			break;
		case 'monthly':
			date.setMonth(date.getMonth() + 1);
			break;
		case 'quarterly':
			date.setMonth(date.getMonth() + 3);
			break;
		case 'yearly':
			date.setFullYear(date.getFullYear() + 1);
			break;
	}
	return date.toISOString();
};

// ---------- helpers ----------

function buildMeta(exp: RecurringExpense) {
	const frequencyLabel =
		exp.frequency === 'weekly'
			? 'Weekly'
			: exp.frequency === 'yearly'
			? 'Yearly'
			: exp.frequency === 'quarterly'
			? 'Quarterly'
			: 'Monthly';

	let nextDueLabel = 'No date';
	let daysLabel = '';
	let isOverdue = false;

	if (exp.nextExpectedDate) {
		const next = new Date(exp.nextExpectedDate);
		const now = new Date();

		nextDueLabel = `Next due: ${next.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})}`;

		const diffMs = next.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			isOverdue = true;
			const abs = Math.abs(diffDays);
			daysLabel = abs === 0 ? '' : ` · ${abs}d late`;
		} else if (diffDays === 0) {
			daysLabel = 'Today';
		} else if (diffDays === 1) {
			daysLabel = '1d';
		} else if (diffDays <= 7) {
			daysLabel = `${diffDays}d`;
		}
	}

	// Check if overdue based on date
	if (exp.nextExpectedDate) {
		const next = new Date(exp.nextExpectedDate);
		const now = new Date();
		const diffMs = next.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays < 0) {
			isOverdue = true;
		}
	}

	return { frequencyLabel, nextDueLabel, daysLabel, isOverdue };
}

interface Props {
	expenses: RecurringExpense[];
	onPressMenu?: (id: string) => void;
	onPressRow?: (expense: RecurringExpense) => void;
	scrollEnabled?: boolean;
}

const RecurringExpensesFeed: React.FC<Props> = ({
	expenses = [],
	onPressMenu,
	onPressRow,
	scrollEnabled = true,
}) => {
	const [expensesWithPaymentStatus, setExpensesWithPaymentStatus] = useState<
		RecurringExpenseWithPaymentStatus[]
	>([]);
	const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
	const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
		null
	);

	const lastFetchRef = React.useRef<string>('');
	const isFetchingRef = React.useRef(false);

	// Batch payment status
	useEffect(() => {
		const checkPaymentStatus = async () => {
			if (expenses.length === 0) return;

			const cacheKey = expenses
				.map(
					(e) =>
						`${e.patternId || (e as any).id}:${e.icon}:${e.color}:${
							(e as any).appearanceMode || 'brand'
						}`
				)
				.sort()
				.join(',');

			if (lastFetchRef.current === cacheKey || isFetchingRef.current) {
				if (isDevMode) {
					recurringExpensesFeedLog.debug(
						'⏭️ [RecurringExpensesFeed] Skipping duplicate payment status check'
					);
				}
				return;
			}

			isFetchingRef.current = true;
			lastFetchRef.current = cacheKey;
			setIsLoadingPaymentStatus(true);
			setPaymentStatusError(null);

			try {
				const objectIdRe = /^[0-9a-fA-F]{24}$/;
				const patternIds = expenses
					.map((expense) => expense.patternId || (expense as any).id)
					.filter((id) => id && objectIdRe.test(id));

				if (patternIds.length === 0) {
					if (isDevMode) {
						recurringExpensesFeedLog.debug(
							'⚠️ [RecurringExpensesFeed] No valid ObjectIds to check payment status'
						);
					}
					setExpensesWithPaymentStatus(
						expenses.map((expense) => ({
							...expense,
							isPaid: false,
							nextDueDate: expense.nextExpectedDate,
						}))
					);
					setIsLoadingPaymentStatus(false);
					return;
				}

				const paymentStatuses =
					await RecurringExpenseService.checkBatchPaidStatus(patternIds);

				const expensesWithStatus = expenses.map((expense) => {
					const expenseId = expense.patternId || (expense as any).id;
					const isPaid = paymentStatuses[expenseId] || false;
					let paymentDate: string | undefined;
					let nextDueDate: string = expense.nextExpectedDate;

					if (isPaid) {
						paymentDate = new Date().toLocaleDateString();
						nextDueDate = calculateNextDueDate(
							expense.nextExpectedDate,
							expense.frequency
						);
					}

					return {
						...expense,
						isPaid,
						paymentDate,
						nextDueDate,
					};
				});

				setExpensesWithPaymentStatus(expensesWithStatus);
			} catch (error) {
				recurringExpensesFeedLog.error('Error checking payment status', error);
				setPaymentStatusError('Failed to check payment status');
				setExpensesWithPaymentStatus(
					expenses.map((expense) => ({
						...expense,
						isPaid: false,
						nextDueDate: expense.nextExpectedDate,
					}))
				);
			} finally {
				setIsLoadingPaymentStatus(false);
				isFetchingRef.current = false;
			}
		};

		checkPaymentStatus();
	}, [expenses]);

	const sortedExpenses = useMemo(() => {
		// Sort: overdue first, then by next expected date
		return [...expensesWithPaymentStatus].sort((a, b) => {
			const aDate = a.nextExpectedDate
				? new Date(a.nextExpectedDate).getTime()
				: 0;
			const bDate = b.nextExpectedDate
				? new Date(b.nextExpectedDate).getTime()
				: 0;

			// Check if overdue
			const now = new Date().getTime();
			const aOver = aDate > 0 && aDate < now ? 1 : 0;
			const bOver = bDate > 0 && bDate < now ? 1 : 0;
			if (aOver !== bOver) return bOver - aOver;

			return aDate - bDate;
		});
	}, [expensesWithPaymentStatus]);

	const handlePress = (item: RecurringExpense) => {
		if (onPressRow) {
			onPressRow(item);
		} else {
			try {
				router.push(`/wallet/recurring/${item.patternId}`);
			} catch (err) {
				if (isDevMode) {
					recurringExpensesFeedLog.error('Failed to navigate to pattern', err);
				}
			}
		}
	};

	const renderItem = ({
		item,
	}: {
		item: RecurringExpenseWithPaymentStatus;
	}) => {
		const appearance = resolveRecurringExpenseAppearance(item);
		const meta = buildMeta(item);
		// Create background color with opacity
		const iconBgColor = appearance.color + '20';

		return (
			<Pressable
				onPress={() => handlePress(item)}
				style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			>
				{/* Icon + title */}
				<View style={styles.leftCol}>
					<View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
						<Ionicons
							name={appearance.icon as any}
							size={20}
							color={appearance.color}
						/>
					</View>
					<View style={styles.titleBlock}>
						<Text style={styles.name}>{item.vendor}</Text>
						<Text style={styles.subtitle}>
							{meta.frequencyLabel} · {meta.nextDueLabel}
						</Text>
					</View>
				</View>

				{/* Amount + status */}
				<View style={styles.rightCol}>
					<Text style={styles.amount}>{currency(item.amount || 0)}</Text>

					{meta.isOverdue ? (
						<View style={[styles.badge, styles.badgeDanger]}>
							<View style={styles.badgeDot} />
							<Text style={styles.badgeText}>Overdue{meta.daysLabel}</Text>
						</View>
					) : meta.daysLabel ? (
						<View style={[styles.badge, styles.badgeNeutral]}>
							<Text style={[styles.badgeText, styles.badgeTextNeutral]}>
								{meta.daysLabel.trim()}
							</Text>
						</View>
					) : null}
				</View>
			</Pressable>
		);
	};

	// Loading while payment status checks
	if (isLoadingPaymentStatus && expenses.length > 0) {
		return (
			<View style={styles.screen}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color={palette.primary} />
					<Text style={styles.loadingText}>Checking payment status...</Text>
				</View>
			</View>
		);
	}

	// Error state
	if (paymentStatusError && expenses.length > 0) {
		return (
			<View style={styles.screen}>
				<View style={styles.errorContainer}>
					<Ionicons name="warning-outline" size={24} color={palette.warning} />
					<Text style={styles.errorText}>{paymentStatusError}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={() => setExpensesWithPaymentStatus([])}
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<FlatList
			data={sortedExpenses}
			keyExtractor={(item) => item.patternId}
			renderItem={renderItem}
			contentContainerStyle={styles.listContent}
			scrollEnabled={scrollEnabled}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="repeat-outline" size={48} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>No recurring expenses found</Text>
					<Text style={styles.emptySubtitle}>
						Add your first recurring expense to get started
					</Text>
				</View>
			}
		/>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.surface,
	},
	listContent: {
		paddingVertical: space.sm,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.surfaceSubtle ?? 'rgba(15, 23, 42, 0.06)',
		marginBottom: space.sm,
	},
	cardPressed: {
		backgroundColor: palette.surfaceSubtle,
		transform: [{ scale: 0.99 }],
		opacity: 0.98,
	},
	leftCol: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: space.md,
	},
	titleBlock: {
		flexShrink: 1,
	},
	name: {
		...typography.labelSm,
		color: palette.text,
		marginBottom: 2,
		textTransform: 'none',
		letterSpacing: 0,
		fontWeight: '600',
	},
	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
	},
	rightCol: {
		alignItems: 'flex-end',
		marginLeft: space.md,
	},
	amount: {
		...typography.labelSm,
		color: palette.text,
		marginBottom: 4,
		textTransform: 'none',
		letterSpacing: 0,
		fontWeight: '600',
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 999,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
	},
	badgeDanger: {
		backgroundColor: palette.dangerSoft,
	},
	badgeNeutral: {
		backgroundColor: palette.surfaceSubtle,
	},
	badgeDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: palette.danger,
		marginRight: 4,
	},
	badgeText: {
		...typography.bodyXs,
		color: palette.danger,
	},
	badgeTextNeutral: {
		color: palette.textMuted,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 10,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorText: {
		...typography.bodySm,
		color: palette.danger,
		textAlign: 'center',
		marginTop: 10,
	},
	retryButton: {
		marginTop: 20,
		paddingVertical: 10,
		paddingHorizontal: 20,
		backgroundColor: palette.primary,
		borderRadius: radius.lg,
	},
	retryButtonText: {
		...typography.bodySm,
		color: palette.surface,
		fontWeight: '600',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		...typography.titleSm,
		color: palette.text,
		textAlign: 'center',
		marginTop: 16,
	},
	emptySubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		textAlign: 'center',
		marginTop: 8,
		lineHeight: 20,
	},
});

export default RecurringExpensesFeed;
