import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget } from '../../../../src/context/budgetContext';
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
					size={20}
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
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	budgets?: Budget[];
	activeTab?: 'all' | 'monthly' | 'weekly';
}) {
	const filtered = useMemo(() => {
		if (activeTab === 'all') return budgets;
		return budgets.filter((b) => b.period === activeTab);
	}, [activeTab, budgets]);

	return (
		<View style={styles.screen}>
			<FlatList
				data={filtered}
				keyExtractor={(b) => b.id}
				renderItem={({ item }) => (
					<BudgetRow budget={item} onPressMenu={onPressMenu} />
				)}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				ListEmptyComponent={
					<View style={styles.emptyWrap}>
						<Ionicons name="wallet-outline" size={20} color="#9aa3ad" />
						<Text style={styles.emptyText}>
							{activeTab === 'all'
								? 'No budgets yet.'
								: `No ${activeTab} budgets.`}
						</Text>
					</View>
				}
				scrollEnabled={scrollEnabled}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	// Inset divider (between items only, not after last)
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: '#ECEFF3',
		marginLeft: 52,
	},

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 16,
		// No bottom border; separator handles dividers
	},
	iconBubble: {
		width: 40,
		height: 40,
		borderRadius: 12,
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
		paddingLeft: 8,
		paddingTop: 8,
		paddingRight: 8,
		paddingBottom: 8,
		marginLeft: 4,
	},

	// Empty state
	emptyWrap: {
		alignItems: 'center',
		gap: 8,
		paddingVertical: 24,
	},
	emptyText: { fontSize: 13, color: '#9aa3ad' },
});
