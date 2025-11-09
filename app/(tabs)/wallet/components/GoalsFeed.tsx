import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	Platform,
	ActionSheetIOS,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoal, Goal } from '../../../../src/context/goalContext';
import { createLogger } from '../../../../src/utils/sublogger';
import LinearProgressBar from './LinearProgressBar';

const goalsFeedLog = createLogger('GoalsFeed');
import { router } from 'expo-router';
import { normalizeIconName } from '../../../../src/constants/uiConstants';
import { isDevMode } from '../../../../src/config/environment';

type GoalStatus = 'ongoing' | 'completed' | 'cancelled';

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
				styles.pill,
				{ backgroundColor: colors.bg, borderColor: colors.border },
			]}
		>
			<Text style={[styles.pillText, { color: colors.text }]}>{label}</Text>
		</View>
	);
}

function GoalRow({
	goal,
	onPressMenu,
}: {
	goal: Goal;
	onPressMenu?: (id: string) => void;
}) {
	const status = getGoalStatus(goal);
	const dl = daysLeft(goal.deadline);
	const progressPercent =
		goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;

	const [kebabPressed, setKebabPressed] = useState(false);

	const handleKebabPress = () => {
		setKebabPressed(true);
		if (isDevMode) {
			goalsFeedLog.debug('Kebab button pressed for goal', { goalId: goal.id });
		}
		onPressMenu?.(goal.id);
		// Reset the flag after a short delay
		setTimeout(() => setKebabPressed(false), 100);
	};

	const handleRowPress = () => {
		// Don't navigate if kebab was just pressed
		if (kebabPressed) {
			setKebabPressed(false);
			return;
		}
		router.push({
			pathname: '/(stack)/goalDetails',
			params: {
				id: goal.id,
			},
		});
	};

	return (
		<TouchableOpacity
			style={styles.rowContainer}
			onPress={handleRowPress}
			activeOpacity={0.7}
		>
			{/* Icon */}
			<View
				style={[styles.iconWrapper, { backgroundColor: `${goal.color}20` }]}
			>
				<Ionicons
					name={normalizeIconName(goal.icon || 'flag-outline')}
					size={24}
					color={goal.color}
				/>
			</View>

			{/* Middle content */}
			<View style={styles.rowMiddle}>
				<Text style={styles.title}>{goal.name}</Text>

				{goal.categories && goal.categories.length > 0 && (
					<Text style={styles.subtitleGray}>{goal.categories.join(', ')}</Text>
				)}

				{/* Progress Bar */}
				<View style={styles.progressSection}>
					<LinearProgressBar
						percent={progressPercent}
						height={6}
						color={goal.color}
						trackColor="#f1f5f9"
						leftLabel={`$${goal.current.toFixed(0)} / $${goal.target.toFixed(
							0
						)}`}
						rightLabel={`${Math.round(progressPercent)}%`}
						style={styles.progressBar}
					/>
				</View>

				<View style={styles.statusRow}>
					<View style={styles.statusRowLeft}>
						<StatusPill status={status} />
					</View>
					<Text style={styles.metaDate}>
						{typeof dl === 'number'
							? dl >= 0
								? `${dl} days left`
								: `${Math.abs(dl)} days overdue`
							: ''}
					</Text>
				</View>
			</View>

			{/* Right meta */}
			<View style={styles.rightMeta}>
				{/* Menu button */}
				<TouchableOpacity
					onPress={handleKebabPress}
					style={styles.kebabHit}
					hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
					accessibilityRole="button"
					accessibilityLabel={`More options for ${goal.name}`}
				>
					<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	);
}

export default function GoalsFeed({
	scrollEnabled = true,
	onPressMenu,
	goals: externalGoals,
	filterBy = 'all',
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	goals?: Goal[];
	filterBy?: 'all' | 'active' | 'completed' | 'overdue';
}) {
	const [refreshing, setRefreshing] = useState(false);
	const [sortBy, setSortBy] = useState<
		'name' | 'deadline' | 'progress' | 'target' | 'created'
	>('deadline');
	const { goals: hookGoals, isLoading, refetch } = useGoal();

	// Use external goals if provided, otherwise use hook goals
	const goals = externalGoals || hookGoals;

	// Filter and sort goals
	const filteredAndSorted = useMemo(() => {
		if (!goals || !Array.isArray(goals) || goals.length === 0) return [];

		// Apply filter
		let filtered = goals;
		if (filterBy !== 'all') {
			const statusMap = {
				active: 'ongoing',
				completed: 'completed',
				overdue: 'cancelled',
			};
			const targetStatus = statusMap[filterBy];
			filtered = goals.filter(
				(goal) => goal && goal.id && getGoalStatus(goal) === targetStatus
			);
		}

		// Apply sorting
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'deadline': {
					const dateA = new Date(a.deadline).getTime();
					const dateB = new Date(b.deadline).getTime();
					return dateA - dateB;
				}
				case 'progress': {
					const percentA = a.target > 0 ? (a.current / a.target) * 100 : 0;
					const percentB = b.target > 0 ? (b.current / b.target) * 100 : 0;
					return percentB - percentA; // Higher progress first
				}
				case 'target':
					return b.target - a.target; // Higher target first
				case 'created': {
					const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
					const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
					return createdB - createdA; // Newer first
				}
				default:
					return 0;
			}
		});

		return sorted;
	}, [filterBy, sortBy, goals]);

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

	const openSortPicker = () => {
		const labels = [
			'Deadline',
			'Name',
			'Progress',
			'Target',
			'Created',
			'Cancel',
		];
		const keys: (typeof sortBy)[] = [
			'deadline',
			'name',
			'progress',
			'target',
			'created',
		];
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{ title: 'Sort by', options: labels, cancelButtonIndex: 5 },
				(idx) => {
					if (idx == null || idx === 5) return;
					setSortBy(keys[idx]);
				}
			);
		} else {
			Alert.alert('Sort by', undefined, [
				{ text: 'Deadline', onPress: () => setSortBy('deadline') },
				{ text: 'Name', onPress: () => setSortBy('name') },
				{ text: 'Progress', onPress: () => setSortBy('progress') },
				{ text: 'Target', onPress: () => setSortBy('target') },
				{ text: 'Created', onPress: () => setSortBy('created') },
				{ text: 'Cancel', style: 'cancel' },
			]);
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

	return (
		<View style={styles.screen}>
			{isLoading ? (
				<View style={styles.loadingState}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading goals...</Text>
				</View>
			) : (
				<>
					{/* Toolbar */}
					<View style={styles.toolbar}>
						<TouchableOpacity
							onPress={openSortPicker}
							activeOpacity={0.7}
							style={styles.toolbarChip}
							accessibilityRole="button"
							accessibilityLabel="Change sort order"
						>
							<Ionicons name="swap-vertical" size={14} color="#0A84FF" />
							<Text style={styles.toolbarChipText}>
								Sort:{' '}
								{sortBy === 'deadline'
									? 'Deadline'
									: sortBy === 'name'
									? 'Name'
									: sortBy === 'progress'
									? 'Progress'
									: sortBy === 'target'
									? 'Target'
									: 'Created'}
							</Text>
						</TouchableOpacity>
					</View>

					<FlatList
						data={filteredAndSorted}
						extraData={filteredAndSorted}
						keyExtractor={(g) => g.id || `goal-${Math.random()}`}
						renderItem={({ item }) => (
							<GoalRow
								goal={item}
								onPressMenu={
									onPressMenu ??
									((id) => {
										if (isDevMode) {
											goalsFeedLog.debug('Menu action', { id });
										}
									})
								}
							/>
						)}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						scrollEnabled={scrollEnabled}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor="#007ACC"
								colors={['#007ACC']}
							/>
						}
						ListEmptyComponent={
							<View style={styles.emptyState}>
								<Ionicons name="flag-outline" size={48} color="#d1d5db" />
								<Text style={styles.emptyTitle}>{getEmptyStateMessage()}</Text>
								<Text style={styles.emptySubtitle}>
									{getEmptyStateSubtitle()}
								</Text>
								{filterBy === 'all' && (
									<TouchableOpacity
										style={styles.addGoalButton}
										onPress={() => router.push('/(stack)/addGoal')}
									>
										<Ionicons name="add" size={16} color="#007ACC" />
										<Text style={styles.addGoalButtonText}>Add Goal</Text>
									</TouchableOpacity>
								)}
							</View>
						}
					/>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	// Inset divider (matches BudgetsFeed)
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: '#ECEFF3',
	},

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 16,
		// No bottom border; separator handles dividers
	},
	iconWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},

	rowMiddle: { flex: 1 },
	title: { fontSize: 17, fontWeight: '700', color: '#0a0a0a' },
	subtitleGray: { color: '#71717a', fontSize: 13, marginTop: 2 },

	progressSection: {
		marginTop: 12,
		marginBottom: 8,
	},
	progressBar: {
		marginBottom: 8,
	},

	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		justifyContent: 'space-between',
	},
	statusRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },

	// Status pill styling
	pill: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
	},
	pillText: { fontSize: 12, fontWeight: '600' },

	rightMeta: { alignItems: 'flex-end', marginLeft: 12 },
	metaDate: {
		fontSize: 12,
		color: '#a1a1aa',
	},

	kebabHit: { paddingLeft: 4, paddingTop: 4, marginLeft: 4 },

	loadingState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		fontSize: 16,
		color: '#71717a',
		textAlign: 'center',
		marginTop: 12,
	},

	// Toolbar
	toolbar: {
		paddingTop: 8,
		paddingBottom: 6,
	},
	toolbarChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		alignSelf: 'flex-start',
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	toolbarChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0A84FF',
	},

	// Empty state
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		textAlign: 'center',
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 8,
		lineHeight: 20,
	},
	addGoalButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: '#f0f8ff',
		borderWidth: 1,
		borderColor: '#007ACC',
		marginTop: 20,
	},
	addGoalButtonText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
});
