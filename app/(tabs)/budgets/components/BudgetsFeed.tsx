import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { Budget } from '../../../../src/context/budgetContext';
import LinearProgressBar from './LinearProgressBar';
import { router } from 'expo-router';

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
					name={(budget.icon as any) ?? 'wallet-outline'}
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
					height={4}
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
						<Text
							style={[
								styles.metaSmall,
								over ? styles.textRed : styles.textBlue,
							]}
						>
							{over ? 'over ' : 'left '}
							{currency(left)}
						</Text>
					)}
				</View>
			</View>

			{/* kebab */}
			<TouchableOpacity
				onPress={handleKebabPress}
				style={styles.kebabHit}
				activeOpacity={0.7}
			>
				<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}

const TABS = [
	{ key: 'all', label: 'All' },
	{ key: 'monthly', label: 'Monthly' },
	{ key: 'weekly', label: 'Weekly' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function BudgetsFeed({
	scrollEnabled = true,
	onPressMenu,
	budgets = [],
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	budgets?: Budget[];
}) {
	const [tab, setTab] = useState<TabKey>('all');

	const filtered = useMemo(() => {
		if (tab === 'all') return budgets;
		return budgets.filter((b) => b.period === tab);
	}, [tab, budgets]);

	return (
		<View style={styles.screen}>
			{/* segmented tabs */}
			<View style={styles.tabsRow}>
				{TABS.map((t) => {
					const active = tab === t.key;
					return (
						<RectButton
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
						</RectButton>
					);
				})}
			</View>

			<FlatList
				data={filtered}
				keyExtractor={(b) => b.id}
				renderItem={({ item }) => (
					<BudgetRow budget={item} onPressMenu={onPressMenu} />
				)}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				contentContainerStyle={{ paddingBottom: 24 }}
				scrollEnabled={scrollEnabled}
			/>
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
	textBlue: { color: '#0284c7' },

	kebabHit: {
		paddingLeft: 8,
		paddingTop: 8,
		paddingRight: 8,
		paddingBottom: 8,
		marginLeft: 4,
	},
});
