import React, { useState, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	RefreshControl,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { DebtsService, Debt } from '../../../src/services/feature/debtsService';
import { Page, Card, LoadingState, EmptyState } from '../../../src/ui';
import { dynamicTextStyle } from '../../../src/utils/accessibility';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

export default function DebtsScreen() {
	const router = useRouter();
	const [debts, setDebts] = useState<Debt[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(async () => {
		try {
			const data = await DebtsService.getDebts();
			setDebts(data);
		} catch (err) {
			console.warn('Failed to load debts', err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	const onRefresh = () => {
		setRefreshing(true);
		load();
	};

	const totalDebt = DebtsService.calculateTotalDebt(debts);

	if (loading) {
		return (
			<Page title="Debts">
				<LoadingState label="Loading debts…" />
			</Page>
		);
	}

	if (debts.length === 0) {
		return (
			<Page title="Debts">
				<EmptyState
					icon="card-outline"
					title="No debts tracked yet"
					description="Add your credit cards, loans, or any balances you want the dashboard to calculate against."
					ctaLabel="Add a debt"
					onPress={() => {
						router.push('/(stack)/debts/new');
					}}
				/>
			</Page>
		);
	}

	return (
		<Page
			title="Debts"
			subtitle={
				debts.length > 0
					? `${debts.length} ${
							debts.length === 1 ? 'debt' : 'debts'
					  } • ${currency(totalDebt)}`
					: undefined
			}
		>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24 }}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				{/* Summary Card */}
				<Card style={styles.summaryCard}>
					<View style={styles.summaryRow}>
						<View style={styles.summaryItem}>
							<Text style={[styles.summaryLabel, dynamicTextStyle]}>
								Total Debt
							</Text>
							<Text style={[styles.summaryValue, dynamicTextStyle]}>
								{currency(totalDebt)}
							</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={[styles.summaryLabel, dynamicTextStyle]}>Count</Text>
							<Text style={[styles.summaryValue, dynamicTextStyle]}>
								{debts.length}
							</Text>
						</View>
					</View>
				</Card>

				{/* Debts List */}
				<Card>
					{debts.map((debt, index) => (
						<DebtRow
							key={debt._id ?? `debt-${index}`}
							debt={debt}
							isLast={index === debts.length - 1}
						/>
					))}
				</Card>
			</ScrollView>

			{/* Floating add button */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => {
					router.push('/(stack)/debts/new');
				}}
			>
				<Ionicons name="add" size={26} color="#fff" />
			</TouchableOpacity>
		</Page>
	);
}

function DebtRow({ debt, isLast }: { debt: Debt; isLast: boolean }) {
	const router = useRouter();
	return (
		<>
			<TouchableOpacity
				style={styles.debtRow}
				onPress={() => {
					router.push(`/(stack)/debts/${debt._id}`);
				}}
			>
				<View style={{ flex: 1 }}>
					<Text style={[styles.debtName, dynamicTextStyle]}>{debt.name}</Text>
					<Text style={[styles.debtBalance, dynamicTextStyle]}>
						{currency(debt.currentBalance)}
					</Text>
					<View style={styles.metaRow}>
						<Text style={styles.meta}>
							{DebtsService.formatDebtType(debt.type)}
						</Text>
						{typeof debt.minPayment === 'number' && debt.minPayment > 0 && (
							<Text style={styles.meta}>Min {currency(debt.minPayment)}</Text>
						)}
						{debt.interestRate > 0 && (
							<Text style={styles.meta}>
								{DebtsService.formatInterestRate(debt.interestRate)} APR
							</Text>
						)}
						{debt.isSynthetic && <Text style={styles.meta}>Auto-tracked</Text>}
					</View>
				</View>
				<Ionicons name="chevron-forward" size={20} color="#94a3b8" />
			</TouchableOpacity>
			{!isLast && <View style={styles.separator} />}
		</>
	);
}

const styles = StyleSheet.create({
	summaryCard: {
		marginBottom: 16,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 16,
	},
	summaryItem: {
		flex: 1,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#6B7280',
		fontWeight: '500',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111827',
	},
	debtRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		gap: 12,
	},
	debtName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#0f172a',
		marginBottom: 4,
	},
	debtBalance: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 8,
	},
	metaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 0,
	},
	meta: {
		backgroundColor: '#e2e8f0',
		color: '#0f172a',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		fontSize: 12,
	},
	separator: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginLeft: 0,
		marginVertical: 8,
	},
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 30,
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: '#0f172a',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 10,
	},
});
