// app/(tabs)/wallet/components/goals/GoalsFeed.tsx

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
import { useGoal, Goal } from '../../../../../src/context/goalContext';
import { createLogger } from '../../../../../src/utils/sublogger';
import LinearProgressBar from '../shared/LinearProgressBar';
import { router } from 'expo-router';
import { normalizeIconName } from '../../../../../src/constants/uiConstants';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';

const goalsFeedLog = createLogger('GoalsFeed');

type GoalStatus = 'ongoing' | 'completed' | 'cancelled';

const formatCurrency = (n: number) =>
	`$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const daysLeft = (deadline: string) => {
	const end = new Date(deadline).setHours(0, 0, 0, 0);
	const now = new Date().setHours(0, 0, 0, 0);
	return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

const getGoalStatus = (goal: Goal): GoalStatus => {
	if (goal.current >= goal.target) return 'completed';
	const dl = daysLeft(goal.deadline);
	if (dl < 0) return 'cancelled';
	return 'ongoing';
};

function StatusPill({ status }: { status: GoalStatus }) {
	const label =
		status === 'completed'
			? 'Completed'
			: status === 'cancelled'
			? 'Overdue'
			: 'Active';

	const colors =
		status === 'completed'
			? { bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' }
			: status === 'cancelled'
			? { bg: '#FFF1F2', text: '#e11d48', border: '#FFE4E6' }
			: { bg: '#EFF6FF', text: '#0284c7', border: '#DBEAFE' };

	return (
		<View
			style={[
				styles.statusChip,
				{ backgroundColor: colors.bg, borderColor: colors.border },
			]}
		>
			<Text style={[styles.statusChipText, { color: colors.text }]}>
				{label}
			</Text>
		</View>
	);
}

function GoalRow({ goal }: { goal: Goal }) {
	const status = getGoalStatus(goal);
	const dl = daysLeft(goal.deadline);
	const progressPercent =
		goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;

	const handleRowPress = () => {
		router.push({
			pathname: '/(tabs)/wallet/goals/[id]',
			params: { id: goal.id },
		});
	};

	const dateLabel =
		dl >= 0
			? `${dl} day${dl === 1 ? '' : 's'} left`
			: `${Math.abs(dl)} day${Math.abs(dl) === 1 ? '' : 's'} overdue`;

	const subtitle =
		goal.categories && goal.categories.length > 0
			? goal.categories.join(', ')
			: 'Savings goal';

	const actualColor = goal.color || palette.primary;

	return (
		<Pressable
			onPress={handleRowPress}
			style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			android_ripple={{ color: palette.borderMuted }}
			accessibilityRole="button"
			accessibilityLabel={`Open goal ${goal.name}`}
		>
			{/* Top row — same flow as Budgets/Bills header */}
			<View style={styles.headerRow}>
				<View style={styles.leftCol}>
					<View
						style={[styles.iconBubble, { backgroundColor: `${actualColor}20` }]}
					>
						<Ionicons
							name={normalizeIconName(goal.icon || 'flag-outline')}
							size={18}
							color={actualColor}
						/>
					</View>

					<View style={styles.titleBlock}>
						<Text style={styles.title} numberOfLines={1}>
							{goal.name}
						</Text>
						<Text style={styles.subtitleGray} numberOfLines={1}>
							{subtitle}
						</Text>
					</View>
				</View>

				<View style={styles.amountCol}>
					<Text style={styles.amountLabel}>Goal</Text>
					<Text style={styles.amountValue}>
						{formatCurrency(goal.target || 0)}
					</Text>
				</View>
			</View>

			{/* Middle row — progress bar, like budgets */}
			<View style={styles.progressRow}>
				<LinearProgressBar
					percent={progressPercent}
					height={6}
					color={actualColor}
					trackColor={palette.borderMuted}
					animated
					style={styles.progressBar}
				/>
			</View>

			{/* Bottom row — meta text on left, status pill on right */}
			<View style={styles.metaInlineRow}>
				<View>
					<Text style={styles.metaSmall}>
						Saved {formatCurrency(goal.current)}{' '}
						<Text style={styles.metaFaint}>
							/ {formatCurrency(goal.target)} · {Math.round(progressPercent)}%
						</Text>
					</Text>
					<Text style={styles.metaDate}>{dateLabel}</Text>
				</View>

				<StatusPill status={status} />
			</View>
		</Pressable>
	);
}

export default function GoalsFeed({
	scrollEnabled = true,
	goals: externalGoals,
	filterBy = 'all',
}: {
	scrollEnabled?: boolean;
	goals?: Goal[];
	filterBy?: 'all' | 'active' | 'completed' | 'overdue';
}) {
	const [refreshing, setRefreshing] = useState(false);
	const { goals: hookGoals, isLoading, refetch } = useGoal();

	const goals = externalGoals || hookGoals;

	const filteredAndSorted = useMemo(() => {
		if (!goals || !Array.isArray(goals) || goals.length === 0) return [];

		let filtered = goals;

		if (filterBy !== 'all') {
			const statusMap = {
				active: 'ongoing',
				completed: 'completed',
				overdue: 'cancelled',
			} as const;
			const targetStatus = statusMap[filterBy];
			filtered = goals.filter(
				(goal) => goal && goal.id && getGoalStatus(goal) === targetStatus
			);
		}

		const statusPriority: Record<GoalStatus, number> = {
			cancelled: 0,
			ongoing: 1,
			completed: 2,
		};

		return [...filtered].sort((a, b) => {
			const statusA = getGoalStatus(a);
			const statusB = getGoalStatus(b);
			const weightA = statusPriority[statusA];
			const weightB = statusPriority[statusB];

			if (weightA !== weightB) return weightA - weightB;

			const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
			const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;

			return dateA - dateB;
		});
	}, [filterBy, goals]);

	const handleRefresh = async () => {
		if (!refetch) return;
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			goalsFeedLog.error('Error refreshing goals', error);
		} finally {
			setRefreshing(false);
		}
	};

	const getEmptyStateMessage = () => {
		switch (filterBy) {
			case 'active':
				return 'No active goals';
			case 'completed':
				return 'No completed goals';
			case 'overdue':
				return 'No overdue goals';
			default:
				return 'No goals found';
		}
	};

	const getEmptyStateSubtitle = () => {
		switch (filterBy) {
			case 'active':
				return 'Create a new goal to start tracking your progress';
			case 'completed':
				return 'Complete some goals to see them here';
			case 'overdue':
				return 'All your goals are on track!';
			default:
				return 'Add your first goal to get started';
		}
	};

	if (isLoading && !goals.length) {
		return (
			<View style={styles.loadingState}>
				<ActivityIndicator size="small" color={palette.primary} />
				<Text style={styles.loadingText}>Loading goals…</Text>
			</View>
		);
	}

	const isEmpty = filteredAndSorted.length === 0;

	return (
		<FlatList
			data={filteredAndSorted}
			keyExtractor={(g, idx) => g.id || `goal-${idx}`}
			renderItem={({ item }) => <GoalRow goal={item} />}
			scrollEnabled={scrollEnabled}
			removeClippedSubviews={false}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleRefresh}
					tintColor={palette.primary}
					colors={[palette.primary]}
				/>
			}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="flag-outline" size={48} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>{getEmptyStateMessage()}</Text>
					<Text style={styles.emptySubtitle}>{getEmptyStateSubtitle()}</Text>
				</View>
			}
			contentContainerStyle={[
				styles.listContent,
				isEmpty && styles.listContentEmpty,
			]}
			ListFooterComponent={
				!isEmpty ? <View style={styles.footerSpacer} /> : null
			}
		/>
	);
}

const styles = StyleSheet.create({
	// Card layout – same family as Budgets/Bills
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
		alignItems: 'flex-end',
		marginTop: 4,
	},
	metaSmall: {
		...typography.bodyXs,
		color: palette.text,
	},
	metaFaint: {
		color: palette.textMuted,
	},
	metaDate: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},

	statusChip: {
		borderRadius: radius.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderWidth: 1,
	},
	statusChipText: {
		fontSize: 12,
		fontWeight: '600',
	},

	loadingState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		...typography.bodySm,
		color: palette.textMuted,
		textAlign: 'center',
		marginTop: 12,
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
