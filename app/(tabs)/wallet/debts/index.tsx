import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import {
	DebtsService,
	Debt,
} from '../../../../src/services/feature/debtsService';
import { Page, LoadingState, EmptyState, Section } from '../../../../src/ui';
import { palette, space } from '../../../../src/ui/theme';

import DebtsSummaryCard from '../components/debts/DebtsSummaryCard';
import DebtsFeed from '../components/debts/DebtsFeed';

const currencyFmt = new Intl.NumberFormat('en-US', {
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

	// Summary metrics
	const accountsCount = debts.length;
	const interestRates = debts
		.map((d) => d.interestRate)
		.filter((r) => typeof r === 'number' && r > 0);

	const highestAPR =
		interestRates.length > 0 ? Math.max(...interestRates) * 100 : null;

	const averageAPR =
		interestRates.length > 0
			? (interestRates.reduce((sum, r) => sum + r, 0) / interestRates.length) *
			  100
			: null;

	const totalMinPayment =
		debts.reduce(
			(sum, d) =>
				typeof d.minPayment === 'number' && d.minPayment > 0
					? sum + d.minPayment
					: sum,
			0
		) || null;

	const handleAddDebt = () => {
		router.push('/wallet/debts/new');
	};

	if (loading) {
		return <LoadingState label="Loading debts…" />;
	}

	return (
		<Page>
			<ScrollView
				showsVerticalScrollIndicator={false}
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={palette.primary}
						colors={[palette.primary]}
					/>
				}
			>
				{/* Top-sheet hero, same pattern as budgets/bills/goals */}
				<View style={styles.heroShell}>
					<View style={styles.debtSummaryCardWrapper}>
						<DebtsSummaryCard
							totalDebt={totalDebt}
							accountsCount={accountsCount}
							highestAPR={highestAPR}
							averageAPR={averageAPR}
							totalMinPayment={totalMinPayment ?? undefined}
							onAddDebt={handleAddDebt}
						/>
					</View>
				</View>

				{/* List */}
				<Section
					title="Your debts"
					subtitle={`Tracking ${accountsCount} ${
						accountsCount === 1 ? 'account' : 'accounts'
					} • ${currencyFmt(totalDebt)}`}
					style={styles.debtsSection}
				>
					{debts.length === 0 ? (
						<EmptyState
							icon="card-outline"
							title="No debts tracked yet"
							subtitle="Add your credit cards, loans, or any balances you want the dashboard to calculate against."
							ctaLabel="Add a debt"
							onPress={handleAddDebt}
						/>
					) : (
						<View style={styles.debtsFeedContainer}>
							<DebtsFeed debts={debts} scrollEnabled={false} />
						</View>
					)}
				</Section>
			</ScrollView>
		</Page>
	);
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: palette.surfaceAlt, // light grey page bg
	},
	scrollContent: {
		paddingBottom: space.xl,
	},

	// background of the top area – stays light grey now
	heroShell: {
		backgroundColor: palette.surfaceAlt,
		paddingTop: space.lg,
		paddingBottom: space.lg,
		paddingHorizontal: space.lg,
	},

	// actual white card behind the debt summary
	debtSummaryCardWrapper: {
		backgroundColor: palette.surface,
		borderRadius: 24,
		padding: space.lg,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 4,
	},

	debtsSection: {
		marginTop: space.lg,
		paddingHorizontal: space.lg,
		paddingTop: space.sm,
	},
	debtsFeedContainer: {
		paddingHorizontal: 0,
	},
});
