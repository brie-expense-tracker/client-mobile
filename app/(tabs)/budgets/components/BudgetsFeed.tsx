import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Platform,
	ActionSheetIOS,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget, getBudgetId } from '../../../../src/context/budgetContext';
import LinearProgressBar from './LinearProgressBar';
import { router } from 'expo-router';
import { normalizeIconName } from '../../../../src/constants/uiConstants';

const currency = (n: number) =>
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

	const [kebabPressed, setKebabPressed] = useState(false);

	const handleRowPress = () => {
		// Don't navigate if kebab was just pressed
		if (kebabPressed) {
			setKebabPressed(false);
			return;
		}
		router.push({
			pathname: '/(stack)/budgetDetails',
			params: {
				id: budget.id,
			},
		});
	};

	const handleKebabPress = () => {
		setKebabPressed(true);
		console.log('Kebab button pressed for budget:', budget.id);
		onPressMenu?.(budget.id);
		// Reset the flag after a short delay
		setTimeout(() => setKebabPressed(false), 100);
	};

	return (
		<TouchableOpacity
			style={styles.rowContainer}
			onPress={handleRowPress}
			activeOpacity={0.7}
		>
			{/* left icon */}
			<View
				style={[
					styles.iconBubble,
					{ backgroundColor: (budget.color ?? '#18181b') + '12' },
				]}
			>
				<Ionicons
					name={normalizeIconName(budget.icon || 'wallet-outline')}
					size={24}
					color={budget.color ?? '#18181b'}
				/>
			</View>

			{/* middle */}
			<View style={styles.rowMiddle}>
				<Text style={styles.title}>{budget.name}</Text>
				<Text style={styles.subtitleGray}>
					{budget.period === 'weekly' ? 'Weekly' : 'Monthly'} budget
				</Text>

				<LinearProgressBar
					percent={percent}
					height={6}
					color={budget.color ?? '#18181b'}
					trackColor="#e5e7eb"
					animated={true}
					style={{ marginTop: 8 }}
				/>

				<View style={styles.metaInlineRow}>
					<Text style={styles.metaSmall}>
						Spent {currency(spent)}{' '}
						<Text style={styles.metaFaint}>/ {currency(budget.amount)}</Text>
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
									styles.metaSmall,
									styles.statusChipText,
									over ? styles.textRed : styles.textBlue,
								]}
							>
								{over ? 'Over ' : 'Left '}
								{currency(left)}
							</Text>
						</View>
					)}
				</View>
			</View>

			{/* kebab */}
			<TouchableOpacity
				onPress={handleKebabPress}
				style={styles.kebabHit}
				activeOpacity={0.7}
				hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
				accessibilityRole="button"
				accessibilityLabel={`More options for ${budget.name}`}
			>
				<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
			</TouchableOpacity>
		</TouchableOpacity>
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
	const [sortBy, setSortBy] = useState<'name' | 'amount' | 'spent'>('name');

	const filteredAndSorted = useMemo(() => {
		let filtered = budgets;
		if (activeTab !== 'all') {
			filtered = budgets.filter((b) => b.period === activeTab);
		}

		// Sort budgets
		return [...filtered].sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'amount':
					return b.amount - a.amount; // Higher amount first
				case 'spent':
					return (b.spent || 0) - (a.spent || 0); // Higher spent first
				default:
					return 0;
			}
		});
	}, [activeTab, sortBy, budgets]);

	const handleRefresh = async () => {
		if (!onRefresh) return;
		setRefreshing(true);
		try {
			await onRefresh();
		} catch (error) {
			console.error('Error refreshing budgets:', error);
		} finally {
			setRefreshing(false);
		}
	};

	const openSortPicker = () => {
		const labels = ['Name', 'Amount', 'Spent', 'Cancel'];
		const keys: (typeof sortBy)[] = ['name', 'amount', 'spent'];
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{ title: 'Sort by', options: labels, cancelButtonIndex: 3 },
				(idx) => {
					if (idx == null || idx === 3) return;
					setSortBy(keys[idx]);
				}
			);
		} else {
			Alert.alert('Sort by', undefined, [
				{ text: 'Name', onPress: () => setSortBy('name') },
				{ text: 'Amount', onPress: () => setSortBy('amount') },
				{ text: 'Spent', onPress: () => setSortBy('spent') },
				{ text: 'Cancel', style: 'cancel' },
			]);
		}
	};

	return (
		<View style={styles.screen}>
			{isLoading ? (
				<View style={styles.loadingState}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading budgets...</Text>
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
								{sortBy === 'name'
									? 'Name'
									: sortBy === 'amount'
									? 'Amount'
									: 'Spent'}
							</Text>
						</TouchableOpacity>
					</View>

				<FlatList
					data={filteredAndSorted}
					extraData={filteredAndSorted}
					keyExtractor={(b) => getBudgetId(b)}
					renderItem={({ item }) => (
						<BudgetRow budget={item} onPressMenu={onPressMenu} />
					)}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
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
								<Ionicons name="wallet-outline" size={48} color="#d1d5db" />
								<Text style={styles.emptyTitle}>
									{activeTab === 'all'
										? 'No budgets found'
										: `No ${activeTab} budgets`}
								</Text>
								<Text style={styles.emptySubtitle}>
									{activeTab === 'all'
										? 'Create a budget to start tracking your spending'
										: `Create a ${activeTab} budget to get started`}
								</Text>
							</View>
						}
						scrollEnabled={scrollEnabled}
					/>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	// Inset divider (between items only, not after last)
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
	iconBubble: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},

	rowMiddle: { flex: 1 },
	title: { fontSize: 17, fontWeight: '700', color: '#0a0a0a' },
	subtitleGray: { color: '#71717a', fontSize: 13, marginTop: 2 },

	metaInlineRow: {
		marginTop: 6,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	metaSmall: { fontSize: 12, color: '#3f3f46' },
	metaFaint: { color: '#a1a1aa' },
	textRed: { color: '#e11d48' },
	textBlue: { color: '#0ea5e9' },

	// Status chips
	statusChip: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	statusChipOver: {
		backgroundColor: '#FFF1F2',
	},
	statusChipLeft: {
		backgroundColor: '#EFF6FF',
	},
	statusChipText: {
		fontWeight: '600',
	},

	kebabHit: {
		paddingLeft: 4,
		paddingTop: 4,
		marginLeft: 4,
	},

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
});
