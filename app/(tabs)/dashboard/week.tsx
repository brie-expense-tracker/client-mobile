import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { summarizeWeekTransactions } from '../../../src/lib/week-analytics';
import { palette, radius, space, type } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton, AppReveal } from '../../../src/ui/primitives';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

export default function WeekScreen() {
	const insets = useSafeAreaInsets();
	const { transactions, isLoading, hasLoaded, refetch } =
		useContext(TransactionContext);
	const [refreshing, setRefreshing] = useState(false);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	useFocusEffect(
		useCallback(() => {
			void refetch();
		}, [refetch]),
	);

	const { totals, categories } = useMemo(
		() => summarizeWeekTransactions(transactions),
		[transactions],
	);

	const initialBusy = !hasLoaded && isLoading;

	if (initialBusy) {
		return (
			<View style={[styles.root, { paddingTop: insets.top }]}>
				<View style={styles.headerRow}>
					<BorderlessButton onPress={() => router.back()} hitSlop={12}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</BorderlessButton>
					<AppText.Heading style={styles.headerTitle}>This week</AppText.Heading>
					<View style={{ width: 24 }} />
				</View>
				<View style={styles.loadingBlock}>
					<ActivityIndicator size="large" color={palette.primary} />
					<AppText.Body color="muted" style={{ marginTop: space.md }}>
						Loading week…
					</AppText.Body>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.root, { paddingTop: insets.top }]}>
			<View style={styles.headerRow}>
				<BorderlessButton onPress={() => router.back()} hitSlop={12}>
					<Ionicons name="chevron-back" size={24} color={palette.text} />
				</BorderlessButton>
				<AppText.Heading style={styles.headerTitle}>This week</AppText.Heading>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + space.xxl },
				]}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={palette.primary}
						colors={[palette.primary]}
						progressBackgroundColor={palette.surface}
					/>
				}
			>
				<AppReveal delayMs={30} distance={8}>
					<AppText.Caption color="muted" style={styles.kicker}>
						Last 7 days · rolling window
					</AppText.Caption>
				</AppReveal>

				<AppReveal delayMs={80}>
					<View style={styles.totalsRow}>
						<WeekStatCard
							label="7-day in"
							value={`+${currency(totals.in)}`}
							tone="in"
						/>
						<WeekStatCard
							label="7-day out"
							value={`−${currency(totals.out)}`}
							tone="out"
						/>
						<WeekStatCard
							label="Net"
							value={`${totals.net >= 0 ? '+' : '−'}${currency(Math.abs(totals.net))}`}
							tone={totals.net >= 0 ? 'in' : 'out'}
						/>
					</View>
				</AppReveal>

				<AppReveal delayMs={130}>
					<AppCard style={styles.sectionCard} padding={space.lg}>
						<AppText.Heading style={styles.sectionTitle}>
							Spending by category
						</AppText.Heading>
						{categories.length === 0 ? (
							<AppText.Body color="muted" style={styles.emptyCats}>
								No spending in the last 7 days — category splits appear when you
								log cash out.
							</AppText.Body>
						) : (
							categories.map((slice) => (
								<View key={slice.category} style={styles.catRow}>
									<View style={styles.catLabelRow}>
										<AppText.Body style={styles.catName} numberOfLines={1}>
											{slice.category}
										</AppText.Body>
										<AppText.Body color="muted">{slice.pct}%</AppText.Body>
									</View>
									<View style={styles.barTrack}>
										<View
											style={[
												styles.barFill,
												{ width: `${Math.min(100, slice.pct)}%` },
											]}
										/>
									</View>
									<AppText.Caption color="subtle" style={styles.catAmt}>
										{currency(slice.amount)}
									</AppText.Caption>
								</View>
							))
						)}
					</AppCard>
				</AppReveal>

				<AppReveal delayMs={180}>
					<AppCard style={styles.sectionCard} padding={space.lg} bordered>
						<AppText.Heading style={styles.confidenceTitle}>
							Confidence
						</AppText.Heading>
						<AppText.Body color="muted" style={styles.confidenceBody}>
							Week totals assume inbox drafts are confirmed. Anything still in
							Inbox is excluded from category splits until you confirm.
						</AppText.Body>
					</AppCard>
				</AppReveal>

				<AppReveal delayMs={230}>
					<AppButton
						label="Open history"
						variant="secondary"
						icon="list-outline"
						iconPosition="left"
						fullWidth
						onPress={() => router.push('/(tabs)/dashboard/ledger')}
					/>
				</AppReveal>
			</ScrollView>
		</View>
	);
}

function WeekStatCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: 'in' | 'out';
}) {
	return (
		<AppCard style={styles.statCard} padding={space.md} elevated={false} bordered>
			<AppText.Label color="muted" style={styles.statLabel}>
				{label}
			</AppText.Label>
			<AppText
				style={styles.statValue}
				color={tone === 'in' ? 'success' : 'danger'}
			>
				{value}
			</AppText>
		</AppCard>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingVertical: space.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	headerTitle: {
		flex: 1,
		textAlign: 'center',
	},
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.lg,
		gap: space.lg,
	},
	kicker: {
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		fontWeight: '600',
	},
	totalsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
	},
	statCard: {
		flexGrow: 1,
		flexBasis: '30%',
		minWidth: 100,
	},
	statLabel: {
		marginBottom: space.xs,
	},
	statValue: {
		...type.titleMd,
		...(Platform.OS === 'ios'
			? { fontVariant: ['tabular-nums' as const] }
			: {}),
	},
	sectionCard: {
		marginBottom: 0,
	},
	sectionTitle: {
		marginBottom: space.md,
	},
	emptyCats: {
		lineHeight: 22,
	},
	catRow: {
		marginBottom: space.md,
	},
	catLabelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: space.xs,
	},
	catName: {
		flex: 1,
		marginRight: space.sm,
		fontWeight: '600',
	},
	barTrack: {
		height: 8,
		borderRadius: radius.pill,
		backgroundColor: palette.track,
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		borderRadius: radius.pill,
		backgroundColor: palette.primary,
	},
	catAmt: {
		marginTop: 4,
	},
	confidenceTitle: {
		marginBottom: space.sm,
	},
	confidenceBody: {
		lineHeight: 22,
	},
	loadingBlock: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: space.xxl,
	},
});
