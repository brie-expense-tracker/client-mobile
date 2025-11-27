import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import {
	DebtsService,
	Debt,
} from '../../../../src/services/feature/debtsService';
import {
	Page,
	Card,
	LoadingState,
	EmptyState,
	Section,
} from '../../../../src/ui';
import { palette, radius, space } from '../../../../src/ui/theme';

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

	if (debts.length === 0) {
		return (
			<EmptyState
				icon="card-outline"
				title="No debts tracked yet"
				subtitle="Add your credit cards, loans, or any balances you want the dashboard to calculate against."
				ctaLabel="Add a debt"
				onPress={handleAddDebt}
			/>
		);
	}

	return (
		<Page>
			<ScrollView
				showsVerticalScrollIndicator={false}
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				{/* Hero */}
				<Section style={styles.heroSection}>
					<Card style={styles.heroCard}>
						<DebtsSummaryCard
							totalDebt={totalDebt}
							accountsCount={accountsCount}
							highestAPR={highestAPR}
							averageAPR={averageAPR}
							totalMinPayment={totalMinPayment ?? undefined}
							onAddDebt={handleAddDebt}
						/>
					</Card>
				</Section>

				{/* List */}
				<Section
					title="Your debts"
					subtitle={`Tracking ${accountsCount} ${
						accountsCount === 1 ? 'account' : 'accounts'
					} • ${currencyFmt(totalDebt)}`}
					style={styles.debtsSection}
				>
					<View style={styles.debtsFeedContainer}>
						<DebtsFeed debts={debts} scrollEnabled={false} />
					</View>
				</Section>
			</ScrollView>
		</Page>
	);
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scrollContent: {
		paddingTop: space.sm,
		paddingBottom: space.xl,
	},
	heroSection: {
		marginTop: space.md,
	},
	heroCard: {
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,

		backgroundColor: palette.surface,
		borderRadius: radius.xl,

		// subtle outline, like Bills summary
		borderWidth: 1,
		borderColor: palette.borderMuted,

		// soft floating shadow
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },

		// Android
		elevation: 3,
	},
	debtsSection: {
		marginTop: space.lg,
	},
	debtsFeedContainer: {
		paddingHorizontal: 0,
	},
});
