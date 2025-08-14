import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '../../../../src/hooks/useGoals';
import { Goal } from '../../../../src/context/goalContext';
import LinearProgressBar from './LinearProgressBar';
import { router } from 'expo-router';

type GoalStatus = 'ongoing' | 'completed' | 'cancelled';

const currency = (n: number) =>
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
	const color =
		status === 'completed'
			? styles.textGreen
			: status === 'cancelled'
			? styles.textRed
			: styles.textBlue;

	return <Text style={[styles.statusText, color]}>{label}</Text>;
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
	const left = Math.max(goal.target - goal.current, 0);
	const progressPercent =
		goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;

	const [kebabPressed, setKebabPressed] = useState(false);

	const handleKebabPress = () => {
		setKebabPressed(true);
		console.log('Kebab button pressed for goal:', goal.id);
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
					name={goal.icon as keyof typeof Ionicons.glyphMap}
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
						height={4}
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
						<Text style={styles.statusLabel}>Status:</Text>
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
				<TouchableOpacity onPress={handleKebabPress} style={styles.kebabHit}>
					<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	);
}

const TABS = [
	{ key: 'all', label: 'All' },
	{ key: 'ongoing', label: 'Active' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'cancelled', label: 'Overdue' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function GoalsFeed({
	scrollEnabled = true,
	onPressMenu,
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
}) {
	const [tab, setTab] = useState<TabKey>('all');
	const { goals, isLoading } = useGoals();

	// Filter goals based on selected tab
	const filtered = useMemo(() => {
		if (!goals || !Array.isArray(goals) || goals.length === 0) return [];
		if (tab === 'all') return goals;
		return goals.filter(
			(goal) => goal && goal.id && getGoalStatus(goal) === tab
		);
	}, [tab, goals]);

	return (
		<View style={styles.screen}>
			{/* Segmented tabs */}
			<View style={styles.tabsRow}>
				{TABS.map((t) => {
					const active = tab === t.key;
					return (
						<TouchableOpacity
							key={t.key}
							onPress={() => setTab(t.key)}
							style={[
								styles.tabBtn,
								active ? styles.tabBtnActive : styles.tabBtnIdle,
							]}
						>
							<Text
								style={[
									styles.tabText,
									active ? styles.tabTextActive : styles.tabTextIdle,
								]}
							>
								{t.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{isLoading ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>Loading goals...</Text>
				</View>
			) : filtered && filtered.length > 0 ? (
				<FlatList
					data={filtered}
					keyExtractor={(g) => g.id || `goal-${Math.random()}`}
					renderItem={({ item }) => (
						<GoalRow
							goal={item}
							onPressMenu={onPressMenu ?? ((id) => console.log('menu:', id))}
						/>
					)}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
					contentContainerStyle={{ paddingBottom: 24 }}
					scrollEnabled={scrollEnabled}
				/>
			) : (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No goals found</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	tabsRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
	},
	tabBtn: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
		borderWidth: 1,
		marginRight: 8,
	},
	tabBtnActive: { backgroundColor: '#18181b', borderColor: '#18181b' },
	tabBtnIdle: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
	tabText: { fontSize: 13 },
	tabTextActive: { color: '#ffffff', fontWeight: '600' },
	tabTextIdle: { color: '#52525b' },

	separator: { height: 1, backgroundColor: '#f1f1f1' },

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
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
	statusRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	statusLabel: { fontSize: 13, color: '#a1a1aa' },
	statusText: { fontSize: 13, fontWeight: '500' },
	textGreen: { color: '#059669' },
	textRed: { color: '#e11d48' },
	textBlue: { color: '#0284c7' },

	rightMeta: { alignItems: 'flex-end', marginLeft: 12 },
	metaDate: {
		fontSize: 12,
		color: '#a1a1aa',
	},

	kebabHit: { paddingLeft: 4, paddingTop: 4, marginLeft: 4 },
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 16,
		color: '#71717a',
		textAlign: 'center',
	},
});
