// app/(tabs)/wallet/components/bills/BillsFeed.tsx

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	Pressable,
	ActivityIndicator,
	TouchableOpacity,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Bill, BillService } from '../../../../../src/services';
import { resolveBillAppearance } from '../../../../../src/utils/billAppearance';
import { isDevMode } from '../../../../../src/config/environment';
import { createLogger } from '../../../../../src/utils/sublogger';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

const billsFeedLog = createLogger('BillsFeed');

// ---------- types & helpers ----------

interface BillWithPaymentStatus extends Bill {
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

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
		default:
			break;
	}

	return date.toISOString();
};

function buildMeta(bill: Bill | BillWithPaymentStatus) {
	const frequencyLabel =
		bill.frequency === 'weekly'
			? 'Weekly'
			: bill.frequency === 'yearly'
			? 'Yearly'
			: bill.frequency === 'quarterly'
			? 'Quarterly'
			: 'Monthly';

	let nextDueLabel = 'No date';
	let daysLabel = '';
	let isOverdue = false;

	// If bill is paid, it should not be marked as overdue
	const isPaid = 'isPaid' in bill && bill.isPaid === true;

	if (bill.nextExpectedDate) {
		const next = new Date(bill.nextExpectedDate);
		const now = new Date();

		nextDueLabel = `Next due: ${next.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})}`;

		const diffMs = next.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

		// Only mark as overdue if the bill is not paid
		if (diffDays < 0 && !isPaid) {
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

	// Double-check overdue (only if not paid)
	if (bill.nextExpectedDate && !isPaid) {
		const next = new Date(bill.nextExpectedDate);
		const now = new Date();
		const diffMs = next.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays < 0) {
			isOverdue = true;
		}
	}

	return { frequencyLabel, nextDueLabel, daysLabel, isOverdue };
}

// Helper to resolve status pill appearance (matches GoalsFeed pattern)
function resolveStatusAppearance(meta: {
	isOverdue: boolean;
	daysLabel: string;
}) {
	if (meta.isOverdue) {
		return {
			label: `Overdue${meta.daysLabel}`,
			pillBg: '#FFF1F2',
			pillTextColor: '#e11d48',
			pillBorder: '#FFE4E6',
			pillDot: '#e11d48',
		};
	}
	if (meta.daysLabel) {
		return {
			label: meta.daysLabel.trim(),
			pillBg: '#EFF6FF',
			pillTextColor: '#0284c7',
			pillBorder: '#DBEAFE',
			pillDot: '#0284c7',
		};
	}
	return null;
}

// ---------- Row component (matches GoalsFeed style) ----------

function BillRow({
	bill,
	onPressRow,
	onPaid,
}: {
	bill: BillWithPaymentStatus;
	onPressRow?: (bill: BillWithPaymentStatus) => void;
	onPaid?: () => void;
}) {
	const appearance = resolveBillAppearance(bill);
	const meta = buildMeta(bill);
	const statusAppearance = resolveStatusAppearance(meta);
	const isAuto = bill.autoPay === true;

	const handleRowPress = () => {
		if (onPressRow) {
			onPressRow(bill);
		} else {
			try {
				router.push(`/wallet/bills/${bill.patternId}`);
			} catch (err) {
				if (isDevMode) {
					billsFeedLog.error('Failed to navigate to pattern', err);
				}
			}
		}
	};

	const handlePayPress = async (e: any) => {
		e.stopPropagation();
		try {
			await BillService.payBill(bill.patternId);
			onPaid?.();
			Alert.alert('Paid', 'Bill marked as paid for this period.');
		} catch (err: any) {
			billsFeedLog.error('[BillRow] payBill error:', err);
			Alert.alert('Error', err?.message ?? 'Failed to pay bill.');
		}
	};

	return (
		<Pressable
			onPress={handleRowPress}
			style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			android_ripple={{ color: palette.borderMuted }}
			accessibilityRole="button"
			accessibilityLabel={`Open bill ${bill.vendor}`}
		>
			{/* Top row — icon + name + meta + amount (same structure as Goals) */}
			<View style={styles.headerRow}>
				<View style={styles.leftCol}>
					<View
						style={[
							styles.iconBubble,
							// small, subtle tint just behind the icon instead of the whole card
							{
								backgroundColor: `${appearance.color ?? palette.primary}20`,
							},
						]}
					>
						<Ionicons
							name={appearance.icon as any}
							size={18}
							color={appearance.color ?? palette.primary}
						/>
					</View>

					<View style={styles.titleBlock}>
						<Text style={styles.title} numberOfLines={1}>
							{bill.vendor}
						</Text>
						<Text style={styles.subtitle} numberOfLines={1}>
							{meta.frequencyLabel} · {meta.nextDueLabel}
						</Text>
					</View>
				</View>

				<View style={styles.amountCol}>
					<Text style={styles.amountLabel}>Amount</Text>
					<Text style={styles.amountValue}>{currency(bill.amount || 0)}</Text>
				</View>
			</View>

			{/* Bottom row — status pill on the right, optional text on the left */}
			<View style={styles.metaInlineRow}>
				<View style={{ flex: 1 }} />

				<View style={styles.rightCol}>
					{statusAppearance && (
						<View
							style={[
								styles.statusPill,
								{
									backgroundColor: statusAppearance.pillBg,
									borderColor: statusAppearance.pillBorder,
								},
							]}
						>
							<View
								style={[
									styles.statusDot,
									{ backgroundColor: statusAppearance.pillDot },
								]}
							/>
							<Text
								style={[
									styles.statusPillText,
									{ color: statusAppearance.pillTextColor },
								]}
							>
								{statusAppearance.label}
							</Text>
						</View>
					)}

					{isAuto ? (
						<View style={styles.autoChip}>
							<Text style={styles.autoChipText}>Auto</Text>
						</View>
					) : (
						<TouchableOpacity
							onPress={handlePayPress}
							style={styles.payChip}
							activeOpacity={0.8}
						>
							<Text style={styles.payChipText}>Pay bill</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Pressable>
	);
}

// ---------- Feed component (mirrors BudgetsFeed shape) ----------

interface Props {
	expenses: Bill[];
	onPressMenu?: (id: string) => void; // kept for parity with BudgetsFeed signature, even if unused
	onPressRow?: (bill: Bill) => void;
	scrollEnabled?: boolean;
	onPaid?: () => void;
}

const BillsFeed: React.FC<Props> = ({
	expenses = [],
	onPressMenu,
	onPressRow,
	scrollEnabled = true,
	onPaid,
}) => {
	const [billsWithPaymentStatus, setBillsWithPaymentStatus] = useState<
		BillWithPaymentStatus[]
	>([]);
	const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
	const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
		null
	);

	const lastFetchRef = useRef<string>('');
	const isFetchingRef = useRef(false);

	// Batch payment status
	useEffect(() => {
		const checkPaymentStatus = async () => {
			if (expenses.length === 0) {
				setBillsWithPaymentStatus([]);
				return;
			}

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
					billsFeedLog.debug(
						'⏭️ [BillsFeed] Skipping duplicate payment status check'
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
						billsFeedLog.debug(
							'⚠️ [BillsFeed] No valid ObjectIds to check payment status'
						);
					}
					setBillsWithPaymentStatus(
						expenses.map((expense) => ({
							...expense,
							isPaid: false,
							nextDueDate: expense.nextExpectedDate,
						}))
					);
					setIsLoadingPaymentStatus(false);
					isFetchingRef.current = false;
					return;
				}

				const paymentStatuses = await BillService.checkBatchPaidStatus(
					patternIds
				);

				const billsWithStatus = expenses.map((expense) => {
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

				setBillsWithPaymentStatus(billsWithStatus);
			} catch (error) {
				billsFeedLog.error('Error checking payment status', error);
				setPaymentStatusError('Failed to check payment status');
				setBillsWithPaymentStatus(
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

	// Sort: overdue first, then by next expected date
	const sortedBills = useMemo(
		() =>
			[...billsWithPaymentStatus].sort((a, b) => {
				const aDate = a.nextExpectedDate
					? new Date(a.nextExpectedDate).getTime()
					: 0;
				const bDate = b.nextExpectedDate
					? new Date(b.nextExpectedDate).getTime()
					: 0;

				const now = Date.now();
				const aOver = aDate > 0 && aDate < now ? 1 : 0;
				const bOver = bDate > 0 && bDate < now ? 1 : 0;
				if (aOver !== bOver) return bOver - aOver;

				return aDate - bDate;
			}),
		[billsWithPaymentStatus]
	);

	const isEmpty = sortedBills.length === 0;

	// Loading while payment status checks (same pattern as BudgetsFeed)
	if (isLoadingPaymentStatus && expenses.length > 0) {
		return (
			<View style={styles.loadingState}>
				<ActivityIndicator size="small" color={palette.primary} />
				<Text style={styles.loadingText}>Checking payment status…</Text>
			</View>
		);
	}

	// Error state
	if (paymentStatusError && expenses.length > 0) {
		return (
			<View style={styles.loadingState}>
				<Ionicons name="warning-outline" size={24} color={palette.warning} />
				<Text style={styles.errorText}>{paymentStatusError}</Text>
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => setBillsWithPaymentStatus([])}
				>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<FlatList
			data={sortedBills}
			keyExtractor={(item) => item.patternId}
			renderItem={({ item }) => (
				<BillRow
					bill={item}
					onPressRow={onPressRow ? (b) => onPressRow(b as Bill) : undefined}
					onPaid={onPaid}
				/>
			)}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="repeat-outline" size={40} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>No bills yet</Text>
					<Text style={styles.emptySubtitle}>
						Add your first bill to start tracking your payments.
					</Text>
				</View>
			}
			scrollEnabled={scrollEnabled}
			contentContainerStyle={[
				styles.listContent,
				isEmpty && styles.listContentEmpty,
			]}
			removeClippedSubviews={false}
			ListFooterComponent={
				!isEmpty ? <View style={styles.footerSpacer} /> : null
			}
		/>
	);
};

const styles = StyleSheet.create({
	// --- Card (matches GoalsFeed) ---
	card: {
		flexDirection: 'column',
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		marginBottom: space.sm,
	},
	cardPressed: {
		backgroundColor: palette.surfaceSubtle,
		opacity: 0.96,
		transform: [{ scale: 0.99 }],
	},

	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	leftCol: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconBubble: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: space.md,
		justifyContent: 'center',
		alignItems: 'center',
	},
	titleBlock: {
		flexShrink: 1,
	},
	title: {
		color: palette.text,
		fontWeight: '600',
	},
	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	amountCol: {
		alignItems: 'flex-end',
		marginLeft: space.md,
	},
	amountLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: 2,
	},
	amountValue: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
	},

	metaInlineRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
	},
	metaText: {
		...typography.bodyXs,
		color: palette.textMuted,
	},

	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderWidth: 1,
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 6,
	},
	statusPillText: {
		...typography.bodyXs,
		fontWeight: '600',
	},

	rightCol: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
	},
	payChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: radius.pill,
		backgroundColor: palette.primarySubtle,
	},
	payChipText: {
		color: palette.primary,
		fontWeight: '600',
		fontSize: 12,
	},
	autoChip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: palette.border,
	},
	autoChipText: {
		fontSize: 11,
		color: palette.textMuted,
		fontWeight: '500',
	},

	// keep your existing listContent / empty state styles as-is
	listContent: {
		paddingVertical: space.sm,
	},
	listContentEmpty: {
		flexGrow: 1,
	},
	footerSpacer: {
		height: space.md,
	},
	loadingState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 24,
	},
	loadingText: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 8,
	},
	errorText: {
		...typography.bodySm,
		color: palette.danger,
		marginTop: 8,
		textAlign: 'center',
	},
	retryButton: {
		marginTop: 16,
		paddingVertical: 8,
		paddingHorizontal: 16,
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

export default BillsFeed;
