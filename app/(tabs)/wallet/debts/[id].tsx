import React, { useEffect, useState } from 'react';

import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import {
	DebtsService,
	DebtDTO,
} from '../../../../src/services/feature/debtsService';
import {
	Page,
	Section,
	Card,
	LoadingState,
	EmptyState,
} from '../../../../src/ui';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

const DebtSummaryScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const debtId = params.id as string;
	const [debt, setDebt] = useState<DebtDTO | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const d = await DebtsService.getById(debtId);
				if (!mounted) return;
				setDebt(d);
				setError(null);
			} catch {
				if (!mounted) return;
				setError('Could not load debt.');
			} finally {
				if (mounted) setLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [debtId]);

	const handleEdit = () => {
		router.push(`./edit?id=${debt?._id}`);
	};

	const handleDelete = () => {
		if (!debt) return;

		Alert.alert(
			'Delete debt?',
			`This will remove "${debt.name}" from your debts.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await DebtsService.deleteDebt(debt._id);
							router.back();
						} catch (err: any) {
							Alert.alert(
								'Delete failed',
								err?.message || 'Could not delete debt. Please try again.'
							);
						}
					},
				},
			]
		);
	};

	// Loading state with UI kit
	if (loading) {
		return (
			<Page>
				<LoadingState label="Loading debt..." />
			</Page>
		);
	}

	// Error / not found state with UI kit
	if (error || !debt) {
		return (
			<Page>
				<EmptyState
					title={error || 'Debt not found'}
					subtitle="The requested debt could not be loaded."
				/>
			</Page>
		);
	}

	return (
		<Page>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{/* Overview / Hero */}
				<Section>
					<Card>
						<View style={styles.debtHeader}>
							<View style={styles.iconBubble}>
								<Ionicons
									name="card-outline"
									size={24}
									color={palette.accent}
								/>
							</View>
							<View style={styles.debtInfo}>
								<Text style={[styles.debtName, dynamicTextStyle('title2')]}>
									{debt.name}
								</Text>
								<Text style={[styles.debtType, dynamicTextStyle('footnote')]}>
									{debt.type ? DebtsService.formatDebtType(debt.type) : 'Debt'}
								</Text>
							</View>
						</View>

						{/* Balance */}
						<View style={styles.balanceSection}>
							<Text style={[styles.balanceLabel, dynamicTextStyle('caption2')]}>
								Current balance
							</Text>
							<Text
								style={[styles.balanceValue, dynamicTextStyle('largeTitle')]}
							>
								{currency(debt.currentBalance)}
							</Text>
						</View>

						{/* Key details row */}
						<View style={styles.detailsRow}>
							{debt.interestRate !== undefined && debt.interestRate > 0 && (
								<View style={styles.detailItem}>
									<Text
										style={[styles.detailLabel, dynamicTextStyle('caption2')]}
									>
										Interest rate
									</Text>
									<Text style={[styles.detailValue, dynamicTextStyle('body')]}>
										{DebtsService.formatInterestRate(debt.interestRate)} APR
									</Text>
								</View>
							)}

							{debt.minPayment !== undefined && debt.minPayment > 0 && (
								<View style={styles.detailItem}>
									<Text
										style={[styles.detailLabel, dynamicTextStyle('caption2')]}
									>
										Min payment
									</Text>
									<Text style={[styles.detailValue, dynamicTextStyle('body')]}>
										{currency(debt.minPayment)}
									</Text>
								</View>
							)}

							{debt.dueDayOfMonth !== undefined && (
								<View style={styles.detailItem}>
									<Text
										style={[styles.detailLabel, dynamicTextStyle('caption2')]}
									>
										Due day
									</Text>
									<Text style={[styles.detailValue, dynamicTextStyle('body')]}>
										Day {debt.dueDayOfMonth}
									</Text>
								</View>
							)}
						</View>

						{/* Status pill */}
						{debt.isSynthetic && (
							<View style={styles.statusSection}>
								<View style={styles.statusRow}>
									<Text style={[styles.statusLabel, dynamicTextStyle('body')]}>
										Status
									</Text>
									<View style={styles.statusPill}>
										<Text
											style={[styles.statusText, dynamicTextStyle('footnote')]}
										>
											Auto-tracked
										</Text>
									</View>
								</View>
							</View>
						)}
					</Card>
				</Section>

				{/* Analysis */}
				<Section title="Analysis">
					<Card>
						<View style={styles.analysisItem}>
							<Ionicons name="trending-up" size={20} color={palette.positive} />
							<Text style={[styles.analysisText, dynamicTextStyle('body')]}>
								Current balance: {currency(debt.currentBalance)}
							</Text>
						</View>

						{debt.interestRate !== undefined && debt.interestRate > 0 && (
							<View style={styles.analysisItem}>
								<Ionicons name="calculator" size={20} color={palette.accent} />
								<Text style={[styles.analysisText, dynamicTextStyle('body')]}>
									Annual interest:{' '}
									{currency((debt.currentBalance * debt.interestRate) / 100)}
								</Text>
							</View>
						)}

						{debt.minPayment !== undefined && debt.minPayment > 0 && (
							<View style={styles.analysisItem}>
								<Ionicons name="calendar" size={20} color={palette.warning} />
								<Text style={[styles.analysisText, dynamicTextStyle('body')]}>
									Minimum payment: {currency(debt.minPayment)} per month
								</Text>
							</View>
						)}
					</Card>
				</Section>

				{/* Recent activity */}
				<Section title="Recent activity">
					<Card>
						{!debt.activity || debt.activity.length === 0 ? (
							<View style={styles.emptyState}>
								<Text style={[styles.emptyStateText, dynamicTextStyle('body')]}>
									No payments yet. Add a transaction and target this debt to see
									it here.
								</Text>
							</View>
						) : (
							debt.activity.map((item, index) => (
								<View
									key={item._id ?? String(index)}
									style={[
										styles.historyItem,
										index === debt.activity!.length - 1 && {
											borderBottomWidth: 0,
											paddingBottom: 0,
										},
									]}
								>
									<View style={styles.historyIcon}>
										<Ionicons
											name="checkmark-circle"
											size={16}
											color={palette.positive}
										/>
									</View>
									<View style={styles.historyContent}>
										<Text
											style={[
												styles.historyTitle,
												dynamicTextStyle('footnote'),
											]}
										>
											Payment
										</Text>
										<Text
											style={[styles.historyAmount, dynamicTextStyle('body')]}
										>
											-{currency(item.amount)}
										</Text>
										{item.note && (
											<Text
												style={[
													styles.historyNote,
													dynamicTextStyle('caption2'),
												]}
											>
												{item.note}
											</Text>
										)}
									</View>
									<Text
										style={[styles.historyDate, dynamicTextStyle('caption2')]}
									>
										{new Date(item.date).toLocaleDateString()}
									</Text>
								</View>
							))
						)}
					</Card>
				</Section>

				{/* Actions */}
				<Section>
					<TouchableOpacity
						style={styles.editButtonLarge}
						onPress={handleEdit}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel="Edit debt"
					>
						<Ionicons name="create-outline" size={20} color={palette.accent} />
						<Text style={[styles.editButtonText, dynamicTextStyle('body')]}>
							Edit debt
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleDelete}
						style={styles.deleteButton}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel="Delete debt"
					>
						<Text style={styles.deleteText}>Delete debt</Text>
					</TouchableOpacity>
				</Section>
			</ScrollView>
		</Page>
	);
};

const styles = StyleSheet.create({
	scrollContent: {
		paddingBottom: space.xl,
	},
	debtHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.lg,
	},
	iconBubble: {
		width: 48,
		height: 48,
		borderRadius: radius.lg,
		marginRight: space.md,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.accentSoft,
	},
	debtInfo: {
		flex: 1,
	},
	debtName: {
		fontWeight: '700',
		color: palette.textStrong,
		marginBottom: 4,
	},
	debtType: {
		color: palette.textMuted,
	},
	balanceSection: {
		alignItems: 'center',
		marginBottom: space.lg,
		paddingVertical: space.md,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: palette.borderSubtle,
	},
	balanceLabel: {
		fontWeight: '500',
		color: palette.textMuted,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	balanceValue: {
		fontWeight: '700',
		color: palette.textStrong,
	},
	detailsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: space.lg,
		flexWrap: 'wrap',
		gap: space.md,
	},
	detailItem: {
		flex: 1,
		minWidth: '30%',
		alignItems: 'center',
	},
	detailLabel: {
		fontWeight: '500',
		color: palette.textMuted,
		marginBottom: 2,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	detailValue: {
		fontWeight: '700',
		color: palette.textStrong,
	},
	statusSection: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.borderSubtle,
		paddingTop: space.md,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	statusLabel: {
		fontWeight: '600',
		color: palette.text,
		marginRight: space.sm,
	},
	statusPill: {
		paddingHorizontal: space.md,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: palette.accent,
	},
	statusText: {
		fontWeight: '600',
		color: palette.onAccent,
	},
	analysisItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	analysisText: {
		color: palette.text,
		marginLeft: space.sm,
		flex: 1,
	},
	emptyState: {
		paddingVertical: space.lg,
		alignItems: 'center',
	},
	emptyStateText: {
		color: palette.textMuted,
		textAlign: 'center',
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.md,
		paddingBottom: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.borderSubtle,
	},
	historyIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: palette.surfaceSubtle,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: space.sm,
	},
	historyContent: {
		flex: 1,
	},
	historyTitle: {
		fontWeight: '600',
		color: palette.text,
		marginBottom: 2,
	},
	historyAmount: {
		fontWeight: '700',
		color: palette.textStrong,
	},
	historyNote: {
		color: palette.textMuted,
		marginTop: 2,
	},
	historyDate: {
		color: palette.textMuted,
		marginLeft: space.sm,
	},
	editButtonLarge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.md,
		paddingHorizontal: space.lg,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.accent,
		backgroundColor: palette.surface,
		gap: space.xs,
	},
	editButtonText: {
		color: palette.accent,
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

export default DebtSummaryScreen;
