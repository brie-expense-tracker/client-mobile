// app/(tabs)/wallet/components/BudgetsFeed.tsx

import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Budget, getBudgetId } from '../../../../../src/context/budgetContext';
import {
	normalizeIconName,
	DEFAULT_COLOR,
} from '../../../../../src/constants/uiConstants';
import { createLogger } from '../../../../../src/utils/sublogger';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import LinearProgressBar from '../shared/LinearProgressBar';

const budgetsFeedLog = createLogger('BudgetsFeed');

const formatCurrency = (n: number) =>
	`$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function BudgetRow({
	budget,
	onPressMenu,
}: {
	budget: Budget;
	onPressMenu?: (id: string) => void;
}) {
	const spent = budget.spent || 0;
	const leftRaw = budget.amount - spent;
	const over = leftRaw < 0;
	const left = Math.abs(leftRaw);
	const percent =
		budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
	const actualColor = budget.color ?? DEFAULT_COLOR;

	const handleRowPress = () => {
		router.push({
			pathname: '/(tabs)/wallet/budgets/[id]',
			params: { id: budget.id },
		});
	};

	const subtitleLabel =
		budget.period === 'weekly' ? 'Weekly budget' : 'Monthly budget';

	return (
		<Pressable
			onPress={handleRowPress}
			style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			// neutral ripple, same family as Goals/Debts/Bills
			android_ripple={{ color: palette.borderMuted, borderless: false }}
			accessibilityRole="button"
			accessibilityLabel={`Open ${budget.name} budget`}
		>
			{/* Top row — same flow as bills/goals (icon + title/subtitle + amount) */}
			<View style={styles.headerRow}>
				<View style={styles.leftCol}>
					<View
						style={[styles.iconBubble, { backgroundColor: `${actualColor}20` }]}
					>
						<Ionicons
							name={normalizeIconName(budget.icon || 'wallet-outline')}
							size={20}
							color={actualColor}
						/>
					</View>

					<View style={styles.titleBlock}>
						<Text style={styles.title} numberOfLines={1}>
							{budget.name}
						</Text>
						<Text style={styles.subtitleGray} numberOfLines={1}>
							{subtitleLabel}
						</Text>
					</View>
				</View>

				<View style={styles.amountCol}>
					<Text style={styles.amountLabel}>Budget</Text>
					<Text style={styles.amountValue}>
						{formatCurrency(budget.amount)}
					</Text>
				</View>
			</View>

			{/* Middle row — budgets-only progress */}
			<View style={styles.progressRow}>
				<LinearProgressBar
					percent={percent}
					height={6}
					color={actualColor}
					trackColor={palette.borderMuted}
					animated
					style={styles.progressBar}
				/>
			</View>

			{/* Bottom row — meta + status chip */}
			<View style={styles.metaInlineRow}>
				<Text style={styles.metaSmall}>
					Spent {formatCurrency(spent)}{' '}
					<Text style={styles.metaFaint}>
						/ {formatCurrency(budget.amount)}
					</Text>
				</Text>

				{budget.amount > 0 && (
					<View
						style={[
							styles.statusChip,
							over ? styles.statusChipOver : styles.statusChipLeft,
						]}
					>
						<Text
							style={[
								styles.statusChipText,
								over ? styles.textRed : styles.textBlue,
							]}
						>
							{over ? 'Over ' : 'Left '}
							{formatCurrency(left)}
						</Text>
					</View>
				)}
			</View>
		</Pressable>
	);
}

export default function BudgetsFeed({
	scrollEnabled = true,
	onPressMenu,
	budgets = [],
	activeTab = 'all',
	isLoading = false,
	onRefresh,
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	budgets?: Budget[];
	activeTab?: 'all' | 'monthly' | 'weekly';
	isLoading?: boolean;
	onRefresh?: () => Promise<void>;
}) {
	const [refreshing, setRefreshing] = useState(false);

	const filteredAndSorted = useMemo(() => {
		let list = budgets;

		if (activeTab !== 'all') {
			list = list.filter((b) => b.period === activeTab);
		}

		return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
	}, [activeTab, budgets]);

	const handleRefresh = async () => {
		if (!onRefresh) return;

		setRefreshing(true);

		try {
			await onRefresh();
		} catch (error) {
			budgetsFeedLog.error('Error refreshing budgets', error);
		} finally {
			setRefreshing(false);
		}
	};

	if (isLoading && !budgets.length) {
		return (
			<View style={styles.loadingState}>
				<ActivityIndicator size="small" color={palette.primary} />
				<Text style={styles.loadingText}>Loading budgets…</Text>
			</View>
		);
	}

	const isEmpty = filteredAndSorted.length === 0;

	return (
		<FlatList
			data={filteredAndSorted}
			keyExtractor={(b) => getBudgetId(b)}
			renderItem={({ item }) => (
				<BudgetRow budget={item} onPressMenu={onPressMenu} />
			)}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="wallet-outline" size={40} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>
						{activeTab === 'all' ? 'No budgets yet' : `No ${activeTab} budgets`}
					</Text>
					<Text style={styles.emptySubtitle}>
						Create a budget to start tracking your spending.
					</Text>
				</View>
			}
			scrollEnabled={scrollEnabled}
			removeClippedSubviews={false}
			contentContainerStyle={[
				styles.listContent,
				isEmpty && styles.listContentEmpty,
			]}
			ListFooterComponent={
				!isEmpty ? <View style={styles.footerSpacer} /> : null
			}
			refreshControl={
				onRefresh ? (
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={palette.primary}
						colors={[palette.primary]}
					/>
				) : undefined
			}
		/>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		// match GoalsFeed border (clear, visible line)
		borderWidth: 1,
		borderColor: palette.borderMuted,
		marginBottom: space.sm,
	},
	cardPressed: {
		backgroundColor: palette.surfaceSubtle,
		transform: [{ scale: 0.99 }],
		opacity: 0.98,
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
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: space.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	titleBlock: {
		flexShrink: 1,
	},
	title: {
		color: palette.text,
		fontWeight: '600',
	},
	subtitleGray: {
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
	progressRow: {
		marginTop: 4,
	},
	progressBar: {
		marginBottom: 8,
	},
	metaInlineRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	metaSmall: {
		...typography.bodyXs,
		color: palette.text,
	},
	metaFaint: {
		color: palette.textMuted,
	},
	textRed: {
		color: palette.danger,
	},
	textBlue: {
		color: palette.primary,
	},
	statusChip: {
		borderRadius: radius.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	statusChipOver: {
		backgroundColor: palette.dangerSoft,
	},
	statusChipLeft: {
		backgroundColor: palette.primarySoft,
	},
	statusChipText: {
		...typography.bodyXs,
		fontWeight: '600',
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
	listContent: {
		paddingVertical: space.sm,
	},
	listContentEmpty: {
		flexGrow: 1,
	},
	footerSpacer: {
		height: space.md,
	},
});
