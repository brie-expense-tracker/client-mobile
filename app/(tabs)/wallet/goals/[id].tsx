import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Alert,
	RefreshControl,
	TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useGoal, Goal } from '../../../../src/context/goalContext';
import {
	Page,
	Section,
	Card,
	LoadingState,
	EmptyState,
} from '../../../../src/ui';
import LinearProgressBar from '../components/shared/LinearProgressBar';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';
import { normalizeIconName } from '../../../../src/constants/uiConstants';

// --- Helpers (can be shared with GoalsFeed later) ---

type GoalStatus = 'ongoing' | 'completed' | 'cancelled';

const daysLeft = (deadline: string) => {
	if (!deadline) return undefined;
	const end = new Date(deadline).setHours(0, 0, 0, 0);
	const now = new Date().setHours(0, 0, 0, 0);
	return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

const getGoalStatus = (goal: Goal): GoalStatus => {
	if (goal.current >= goal.target) return 'completed';
	const dl = daysLeft(goal.deadline);
	if (dl != null && dl < 0) return 'cancelled';
	return 'ongoing';
};

// --- Screen ---

export default function GoalSummaryScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();

	const { goals, isLoading, hasLoaded, refetch, deleteGoal } = useGoal();
	const [refreshing, setRefreshing] = useState(false);

	const goal = useMemo(
		() => goals.find((g) => g.id === id) ?? null,
		[goals, id]
	);

	useEffect(() => {
		// If we don't have the goal yet but we've never loaded, fetch it
		if (!hasLoaded && !goal) {
			refetch();
		}
	}, [goal, hasLoaded, refetch]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	const handleEdit = () => {
		if (!goal) return;

		router.push({
			pathname: './edit',
			params: { id: goal.id },
		});
	};

	const handleDelete = () => {
		if (!goal) return;

		Alert.alert(
			'Delete goal?',
			`This will remove "${goal.name}" and its progress from your goals.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteGoal(goal.id);
							router.back();
						} catch (err: any) {
							Alert.alert(
								'Delete failed',
								err?.message || 'Could not delete goal. Please try again.'
							);
						}
					},
				},
			]
		);
	};

	// --- Loading / empty states ---

	if ((isLoading && !hasLoaded) || (!goal && !hasLoaded)) {
		return (
			<Page>
				<LoadingState label="Loading goal…" />
			</Page>
		);
	}

	if (!goal) {
		return (
			<Page>
				<EmptyState
					icon="flag-outline"
					title="Goal not found"
					subtitle="We couldn't find this goal. It may have been deleted or is no longer available."
					ctaLabel="Back to goals"
					onPress={() => router.back()}
				/>
			</Page>
		);
	}

	// --- Derived stats ---

	const progressPercent =
		goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
	const remaining = Math.max(goal.target - goal.current, 0);
	const dl = daysLeft(goal.deadline);
	const status = getGoalStatus(goal);

	return (
		<Page
			title={goal.name}
			subtitle={`${Math.round(progressPercent)}% complete`}
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
					{/* Overview / hero card */}
					<Section title="Overview" subtitle="Snapshot of your goal.">
						<Card>
							{/* Title row with icon */}
							<View style={styles.heroHeader}>
								<View
									style={[
										styles.iconWrapper,
										{ backgroundColor: `${goal.color ?? palette.primary}12` },
									]}
								>
									<Ionicons
										name={normalizeIconName(
											(goal.icon as any) ?? 'flag-outline'
										)}
										size={24}
										color={goal.color ?? palette.primary}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.heroTitle, dynamicTextStyle('title2')]}>
										{goal.name}
									</Text>
									<Text style={styles.heroSubtitle}>
										{status === 'completed'
											? 'Completed'
											: status === 'cancelled'
											? 'Overdue'
											: 'Active'}
										{typeof dl === 'number' &&
											` • ${
												dl >= 0
													? `${dl} days left`
													: `${Math.abs(dl)} days overdue`
											}`}
									</Text>
								</View>
							</View>

							<View style={styles.heroTopRow}>
								<View>
									<Text
										style={[styles.labelMuted, dynamicTextStyle('caption2')]}
									>
										Total target
									</Text>
									<Text
										style={[styles.valueEmphasis, dynamicTextStyle('title2')]}
									>
										${goal.target.toFixed(0)}
									</Text>
								</View>
								<View>
									<Text
										style={[styles.labelMuted, dynamicTextStyle('caption2')]}
									>
										Saved so far
									</Text>
									<Text
										style={[styles.valueEmphasis, dynamicTextStyle('title2')]}
									>
										${goal.current.toFixed(0)}
									</Text>
								</View>
							</View>

							<View style={styles.progressBlock}>
								<LinearProgressBar
									percent={progressPercent}
									height={8}
									color={goal.color || palette.primary}
									trackColor={palette.borderMuted}
									leftLabel={`$${goal.current.toFixed(0)} saved`}
									rightLabel={`${Math.round(progressPercent)}%`}
								/>
								<Text style={styles.remainingText}>
									${remaining.toFixed(0)} remaining
								</Text>
							</View>
						</Card>
					</Section>

					{/* Details */}
					<Section title="Details">
						<Card>
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Deadline</Text>
								<Text style={styles.detailValue}>
									{goal.deadline
										? new Date(goal.deadline).toLocaleDateString()
										: 'Not set'}
								</Text>
							</View>

							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Status</Text>
								<Text style={styles.detailValue}>
									{status === 'completed'
										? 'Completed'
										: status === 'cancelled'
										? 'Overdue'
										: 'Active'}
								</Text>
							</View>
						</Card>
					</Section>

					{/* Optional: Recent activity / contributions could go here later */}

					{/* Actions */}
					<Section>
						<TouchableOpacity
							style={styles.primaryCta}
							onPress={handleEdit}
							activeOpacity={0.85}
						>
							<Text style={[styles.primaryCtaText, dynamicTextStyle('body')]}>
								Edit goal
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleDelete}
							style={styles.deleteButton}
							activeOpacity={0.7}
						>
							<Text style={styles.deleteText}>Delete goal</Text>
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
		gap: space.lg,
		paddingBottom: space.xl,
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
	heroTitle: {
		...typography.titleSm,
		color: palette.text,
	},
	heroSubtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	heroTopRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		columnGap: 16,
		marginBottom: 16,
	},
	labelMuted: {
		...typography.bodyXs,
		color: palette.textMuted,
	},
	valueEmphasis: {
		...typography.titleMd,
		color: palette.text,
		fontWeight: '700',
		marginTop: 4,
	},
	progressBlock: {
		marginTop: 4,
		marginBottom: 8,
	},
	remainingText: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 6,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.borderMuted,
	},
	detailLabel: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	detailValue: {
		...typography.bodySm,
		color: palette.text,
		fontWeight: '500',
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-end',
		gap: 8,
		maxWidth: '70%',
	},
	chip: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	chipText: {
		...typography.bodyXs,
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
