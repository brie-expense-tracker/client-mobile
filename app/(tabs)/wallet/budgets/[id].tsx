import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	Alert,
	TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBudget, Budget } from '../../../../src/context/budgetContext';
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
	space,
	radius,
	type as typography,
} from '../../../../src/ui/theme';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';
import { normalizeIconName } from '../../../../src/constants/uiConstants';

export default function BudgetSummaryScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();

	const { budgets, isLoading, hasLoaded, refetch, deleteBudget } = useBudget();

	const [refreshing, setRefreshing] = useState(false);

	const budget: Budget | null = useMemo(
		() => budgets.find((b) => b.id === id) ?? null,
		[budgets, id]
	);

	// Ensure data is loaded
	useEffect(() => {
		if (!hasLoaded && !budget) {
			refetch();
		}
	}, [budget, hasLoaded, refetch]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	const handleEdit = () => {
		if (!budget) return;

		router.push({
			pathname: './edit',
			params: { id: budget.id },
		});
	};

	const handleDelete = () => {
		if (!budget) return;

		Alert.alert(
			'Delete budget?',
			`This will remove "${budget.name}" and its stats from your budgets overview.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteBudget(budget.id);
							router.back();
						} catch (err: any) {
							const msg =
								err?.message || 'Could not delete budget. Please try again.';
							Alert.alert('Delete failed', msg);
						}
					},
				},
			]
		);
	};

	// ======================
	// Loading / error states
	// ======================

	if ((isLoading && !hasLoaded) || (!budget && !hasLoaded)) {
		return (
			<Page>
				<LoadingState label="Loading budget…" />
			</Page>
		);
	}

	if (!budget) {
		return (
			<Page>
				<EmptyState
					icon="wallet-outline"
					title="Budget not found"
					subtitle="We couldn't find this budget. It may have been deleted."
					ctaLabel="Back to budgets"
					onPress={() => router.back()}
				/>
			</Page>
		);
	}

	// ======================
	// Derived values
	// ======================

	const spent = budget.spent ?? 0;
	const total = budget.amount ?? 0;
	const leftRaw = total - spent;
	const over = leftRaw < 0;
	const left = Math.abs(leftRaw);
	const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

	const periodLabel =
		budget.period === 'weekly' ? 'Weekly budget' : 'Monthly budget';

	return (
		<Page
			title={budget.name}
			subtitle={`${percent.toFixed(0)}% used • ${periodLabel}`}
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
					{/* Overview / hero */}
					<Section
						title="Overview"
						subtitle="Snapshot of how this budget is performing."
					>
						<Card>
							{/* Title row with icon */}
							<View style={styles.heroHeader}>
								<View
									style={[
										styles.iconWrapper,
										{ backgroundColor: `${budget.color ?? palette.primary}12` },
									]}
								>
									<Ionicons
										name={normalizeIconName(
											(budget.icon as any) ?? 'wallet-outline'
										)}
										size={24}
										color={budget.color ?? palette.primary}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.heroTitle, dynamicTextStyle('title2')]}>
										{budget.name}
									</Text>
									<Text style={styles.heroSubtitle}>{periodLabel}</Text>
								</View>
							</View>

							{/* Progress */}
							<View
								style={styles.progressBlock}
								accessibilityRole="progressbar"
								accessibilityLabel={`Budget progress: ${percent.toFixed(
									1
								)}% used, $${spent.toFixed(2)} spent out of $${total.toFixed(
									2
								)}`}
							>
								<LinearProgressBar
									percent={percent}
									height={8}
									color={budget.color ?? palette.primary}
									trackColor={palette.borderMuted}
									leftLabel={`$${spent.toFixed(2)} / $${total.toFixed(2)}`}
									rightLabel={`${percent.toFixed(0)}%`}
								/>
							</View>

							{/* Core stats */}
							<View style={styles.statsRow}>
								<View style={styles.statItem}>
									<Text style={styles.statLabel}>Spent</Text>
									<Text style={[styles.statValue, dynamicTextStyle('title2')]}>
										${spent.toFixed(2)}
									</Text>
								</View>
								<View style={styles.statItem}>
									<Text style={styles.statLabel}>Budget</Text>
									<Text style={[styles.statValue, dynamicTextStyle('title2')]}>
										${total.toFixed(2)}
									</Text>
								</View>
								<View style={styles.statItem}>
									<Text style={styles.statLabel}>{over ? 'Over' : 'Left'}</Text>
									<Text
										style={[
											styles.statValue,
											dynamicTextStyle('title2'),
											over ? styles.overText : styles.underText,
										]}
									>
										${left.toFixed(2)}
									</Text>
								</View>
							</View>
						</Card>
					</Section>

					{/* Details */}
					<Section title="Details">
						<Card>
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Period</Text>
								<Text style={styles.detailValue}>
									{budget.period === 'weekly' ? 'Weekly' : 'Monthly'}
								</Text>
							</View>

							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Rollover</Text>
								<Text style={styles.detailValue}>
									{budget.rollover ? 'Enabled' : 'Disabled'}
								</Text>
							</View>

							{budget.categories && budget.categories.length > 0 && (
								<View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
									<Text style={styles.detailLabel}>Categories</Text>
									<View style={styles.chipRow}>
										{budget.categories.map((cat) => (
											<View key={cat} style={styles.chip}>
												<Text style={styles.chipText}>{cat}</Text>
											</View>
										))}
									</View>
								</View>
							)}
						</Card>
					</Section>

					{/* You can add more Sections here:
						- Spending breakdown
						- Analysis / insights
						- History
						- Export / Share actions
					*/}

					{/* Actions */}
					<Section>
						<TouchableOpacity
							style={styles.primaryCta}
							onPress={handleEdit}
							activeOpacity={0.85}
						>
							<Text style={[styles.primaryCtaText, dynamicTextStyle('body')]}>
								Edit budget
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleDelete}
							style={styles.deleteButton}
							activeOpacity={0.7}
						>
							<Text style={styles.deleteText}>Delete budget</Text>
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
	progressBlock: {
		marginBottom: 16,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		columnGap: 16,
	},
	statItem: {
		flex: 1,
	},
	statLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: 4,
	},
	statValue: {
		...typography.titleSm,
		color: palette.text,
		fontWeight: '700',
	},
	overText: {
		color: '#e11d48',
	},
	underText: {
		color: '#10b981',
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
