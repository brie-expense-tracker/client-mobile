import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Share,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';
import useAuth from '../../../../src/context/AuthContext';
import AIProfileInsights from './components/AIProfileInsights';
import CircularProgress from '../../../../src/components/CircularProgress';
import { useFeature } from '../../../../src/config/features';
import { IncomeSourceBadge } from '../../../../src/components/IncomeSourceBadge';
import { IncomeDivergenceWarning } from '../../../../src/components/IncomeDivergenceWarning';
import { logger } from '../../../../src/utils/logger';
import { palette, radius, space, type, shadow } from '../../../../src/ui/theme';

const currency = (n?: number) =>
	typeof n === 'number' && !Number.isNaN(n) ? `$${n.toLocaleString()}` : '$0';

const Section = ({
	title,
	children,
	right,
}: {
	title: string;
	children: React.ReactNode;
	right?: React.ReactNode;
}) => (
	<View style={styles.section}>
		<View style={styles.sectionHeader}>
			<Text
				style={[
					type.labelSm,
					styles.sectionTitle,
					{ color: palette.textSubtle },
				]}
			>
				{title}
			</Text>
			{right}
		</View>
		<View style={styles.sectionBody}>{children}</View>
	</View>
);

const Card = ({
	children,
	style,
}: {
	children: React.ReactNode;
	style?: any;
}) => (
	<View
		style={[
			styles.card,
			{
				backgroundColor: palette.surface,
				borderColor: palette.border,
				shadowOpacity: shadow.card.shadowOpacity,
				shadowRadius: shadow.card.shadowRadius,
				shadowColor: shadow.card.shadowColor,
				shadowOffset: shadow.card.shadowOffset,
				elevation: shadow.card.elevation,
			},
			style,
		]}
	>
		{children}
	</View>
);

const Row = ({
	icon,
	label,
	value,
	onPress,
	badge,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value?: string;
	onPress?: () => void;
	badge?: React.ReactNode;
}) => {
	const Wrapper = onPress ? TouchableOpacity : View;
	return (
		<Wrapper
			activeOpacity={onPress ? 0.7 : 1}
			onPress={onPress}
			style={styles.rowContainer}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.rowIconWrap, { backgroundColor: palette.subtle }]}>
					<Ionicons name={icon} size={18} color={palette.textMuted} />
				</View>
				<View style={styles.rowTextWrap}>
					<Text
						style={[type.body, styles.rowLabel, { color: palette.text }]}
						numberOfLines={1}
					>
						{label}
					</Text>
					{badge}
				</View>
			</View>
			<View style={styles.rowRight}>
				{value ? (
					<Text
						numberOfLines={1}
						style={[type.small, styles.rowValue, { color: palette.textMuted }]}
					>
						{value}
					</Text>
				) : null}
				{onPress ? (
					<Ionicons
						name="chevron-forward"
						size={16}
						color={palette.textSubtle}
					/>
				) : null}
			</View>
		</Wrapper>
	);
};

export default function AccountScreen() {
	const router = useRouter();
	const {
		profile,
		loading,
		error,
		fetchProfile,
		incomeEstimate,
		incomeComparison,
		fetchIncomeComparison,
	} = useProfile();
	const { user } = useAuth();
	const aiInsightsPreviewEnabled = useFeature('aiInsightsPreview');
	const [profileCompletion, setProfileCompletion] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchProfile();
			await fetchIncomeComparison();
		} finally {
			setRefreshing(false);
		}
	}, [fetchProfile, fetchIncomeComparison]);

	const calculateProfileCompletion = useCallback((profileData: any) => {
		if (!profileData) return 0;
		const fields = [
			profileData.firstName,
			profileData.lastName,
			profileData.monthlyIncome,
			profileData.savings,
			profileData.debt,
			profileData.expenses?.housing,
			profileData.expenses?.transportation,
			profileData.expenses?.food,
			profileData.financialGoal,
		];
		const filled = fields.filter(
			(f: any) => f !== undefined && f !== null && f !== ''
		).length;
		return Math.round((filled / fields.length) * 100);
	}, []);

	useEffect(() => {
		fetchProfile();
		fetchIncomeComparison();
	}, [fetchProfile, fetchIncomeComparison]);

	useEffect(() => {
		if (profile) {
			setProfileCompletion(calculateProfileCompletion(profile));
		}
	}, [profile, calculateProfileCompletion]);

	const handleExportProfile = async () => {
		try {
			const profileData = {
				exportDate: new Date().toISOString(),
				profile: {
					firstName: profile?.firstName,
					lastName: profile?.lastName,
					monthlyIncome: profile?.monthlyIncome,
					savings: profile?.savings,
					debt: profile?.debt,
					expenses: profile?.expenses,
					financialGoal: profile?.financialGoal,
				},
			};

			const jsonString = JSON.stringify(profileData, null, 2);

			await Share.share({
				message: jsonString,
				title: 'Profile Export',
			});
		} catch (err) {
			logger.error('Export error:', err);
			Alert.alert('Error', 'Failed to export profile data');
		}
	};

	const handleBackupProfile = async () => {
		Alert.alert(
			'Backup Profile',
			'This will create a backup of your profile data. Continue?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Backup', onPress: handleExportProfile },
			]
		);
	};

	const getFinancialHealthScore = useCallback(() => {
		if (!profile) return 0;
		let score = 0;
		const income = profile.monthlyIncome || 0;
		const savings = profile.savings || 0;
		const debt = profile.debt || 0;

		if (savings >= income * 6) score += 40;
		else if (savings >= income * 3) score += 30;
		else if (savings >= income * 1) score += 20;
		else if (savings > 0) score += 10;

		if (income > 0) {
			const debtRatio = debt / income;
			if (debtRatio <= 0.2) score += 30;
			else if (debtRatio <= 0.4) score += 20;
			else if (debtRatio <= 0.6) score += 10;
		}

		score += Math.round((profileCompletion / 100) * 30);
		return Math.min(score, 100);
	}, [profile, profileCompletion]);

	const initials = useMemo(() => {
		const f = (profile?.firstName || '').charAt(0);
		const l = (profile?.lastName || '').charAt(0);
		const raw = (f + l || 'U').trim();
		return raw.length > 0 ? raw.toUpperCase() : 'U';
	}, [profile?.firstName, profile?.lastName]);

	if (loading) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: palette.bg }]}>
				<ActivityIndicator size="large" color={palette.primary} />
				<Text
					style={[type.body, styles.stateText, { color: palette.textMuted }]}
				>
					{profile ? 'Loading profile…' : 'Setting up your profile…'}
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: palette.bg }]}>
				<Ionicons
					name="alert-circle-outline"
					size={48}
					color={palette.danger}
				/>
				<Text style={[type.h2, styles.stateTitle, { color: palette.text }]}>
					Failed to load profile
				</Text>
				<Text
					style={[type.body, styles.stateText, { color: palette.textMuted }]}
				>
					{error}
				</Text>
				<TouchableOpacity
					style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
					activeOpacity={0.8}
					onPress={fetchProfile}
				>
					<Text style={[type.body, styles.primaryBtnText]}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: palette.bg }]}>
				<Ionicons name="person-outline" size={48} color={palette.border} />
				<Text style={[type.h2, styles.stateTitle, { color: palette.text }]}>
					No profile found
				</Text>
				<TouchableOpacity
					style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
					activeOpacity={0.8}
					onPress={fetchProfile}
				>
					<Text style={[type.body, styles.primaryBtnText]}>Refresh</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const healthScore = getFinancialHealthScore();

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: palette.bg }}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleRefresh}
					tintColor={palette.primary}
					colors={[palette.primary]}
					progressBackgroundColor={palette.surface}
				/>
			}
		>
			{/* Identity / hero */}
			<View style={styles.identityRow}>
				<View
					style={[styles.avatar, { backgroundColor: palette.primarySubtle }]}
				>
					<Text
						style={[type.h2, styles.avatarLabel, { color: palette.primary }]}
					>
						{initials}
					</Text>
				</View>
				<View style={styles.identityTextWrap}>
					<Text
						style={[type.titleMd, styles.identityName, { color: palette.text }]}
						numberOfLines={1}
					>
						{profile.firstName || profile.lastName
							? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
							: 'Your Name'}
					</Text>
					<Text
						style={[
							type.small,
							styles.identityEmail,
							{ color: palette.textMuted },
						]}
						numberOfLines={1}
					>
						{user?.email || 'No email set'}
					</Text>
				</View>
				<View style={styles.identityProgress}>
					<CircularProgress
						size={52}
						strokeWidth={6}
						value={profileCompletion}
						trackColor={palette.track}
						barColor={palette.success}
						label={`${profileCompletion}%`}
						labelColor={palette.text}
					/>
				</View>
			</View>

			{/* KPIs */}
			<View style={styles.kpiRow}>
				<Card style={styles.kpiCard}>
					<View style={styles.kpiHeader}>
						<Ionicons
							name="checkmark-circle-outline"
							size={18}
							color={palette.success}
						/>
						<Text
							style={[
								type.small,
								styles.kpiLabel,
								{ color: palette.textSubtle },
							]}
						>
							Completion
						</Text>
					</View>
					<Text style={[type.numLg, styles.kpiValue, { color: palette.text }]}>
						{profileCompletion}%
					</Text>
					<View style={[styles.kpiBar, { backgroundColor: palette.border }]}>
						<View
							style={[
								styles.kpiBarFill,
								{
									backgroundColor: palette.success,
									width: `${profileCompletion}%`,
								},
							]}
						/>
					</View>
				</Card>

				<Card style={styles.kpiCard}>
					<View style={styles.kpiHeader}>
						<Ionicons
							name="trending-up-outline"
							size={18}
							color={palette.primary}
						/>
						<Text
							style={[
								type.small,
								styles.kpiLabel,
								{ color: palette.textSubtle },
							]}
						>
							Health
						</Text>
					</View>
					<Text style={[type.numLg, styles.kpiValue, { color: palette.text }]}>
						{healthScore}/100
					</Text>
					<Text
						style={[type.small, styles.kpiSub, { color: palette.textSubtle }]}
					>
						{healthScore >= 80
							? 'Excellent'
							: healthScore >= 60
							? 'Good'
							: healthScore >= 40
							? 'Fair'
							: 'Needs work'}
					</Text>
				</Card>
			</View>

			{/* Account */}
			<Section title="Account">
				<Card>
					<Row
						icon="person-outline"
						label="Name"
						value={
							profile.firstName || profile.lastName
								? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
								: 'Not set'
						}
						onPress={() => router.push('/(stack)/settings/profile/editName')}
					/>
					<View style={[styles.divider, { backgroundColor: palette.border }]} />
					<Row
						icon="mail-outline"
						label="Email"
						value={user?.email || 'Not set'}
					/>
				</Card>
			</Section>

			{/* Income Divergence */}
			{incomeComparison &&
				incomeComparison.userDeclared &&
				incomeComparison.observed &&
				incomeComparison.divergence && (
					<IncomeDivergenceWarning
						userDeclaredAmount={incomeComparison.userDeclared.monthlyIncome}
						observedAmount={incomeComparison.observed.monthlyIncome}
						divergencePercent={incomeComparison.divergence}
						onUpdateIncome={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>
				)}

			{/* Financial */}
			<Section title="Financial">
				<Card>
					<Row
						icon="cash-outline"
						label="Monthly Income"
						value={currency(
							incomeEstimate?.monthlyIncome || profile.monthlyIncome
						)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						badge={
							incomeEstimate && (
								<IncomeSourceBadge
									source={incomeEstimate.source}
									confidence={incomeEstimate.confidence}
									compact
								/>
							)
						}
					/>
					<View style={[styles.divider, { backgroundColor: palette.border }]} />
					<Row
						icon="trending-up-outline"
						label="Savings & Investments"
						value={currency(profile.savings)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>
					<Text
						style={[
							type.small,
							styles.helperText,
							{ color: palette.textSubtle },
						]}
					>
						Include cash + investment balances.
					</Text>
					<View style={[styles.divider, { backgroundColor: palette.border }]} />
					<Row
						icon="trending-down-outline"
						label="Total Debt"
						value={currency(profile.debt)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>
					{!!profile.expenses && (
						<>
							<View
								style={[styles.divider, { backgroundColor: palette.border }]}
							/>
							<Row
								icon="card-outline"
								label="Expenses"
								value={`Housing: ${currency(profile.expenses.housing)}`}
								onPress={() =>
									router.push('/(stack)/settings/profile/editExpenses')
								}
							/>
						</>
					)}
				</Card>
			</Section>

			{/* Quick Actions */}
			<Section
				title="Quick Actions"
				right={
					<TouchableOpacity
						onPress={handleBackupProfile}
						style={styles.inlineButton}
						activeOpacity={0.7}
					>
						<Ionicons
							name="cloud-upload-outline"
							size={16}
							color={palette.primary}
						/>
						<Text
							style={[
								type.small,
								styles.inlineButtonText,
								{ color: palette.primary },
							]}
						>
							Backup
						</Text>
					</TouchableOpacity>
				}
			>
				<View style={styles.quickGrid}>
					<TouchableOpacity
						style={[
							styles.quickTile,
							{
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
						activeOpacity={0.8}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					>
						<Ionicons name="cash-outline" size={20} color={palette.success} />
						<Text
							style={[type.small, styles.quickLabel, { color: palette.text }]}
						>
							Financial Info
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
						activeOpacity={0.8}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					>
						<Ionicons name="card-outline" size={20} color={palette.warning} />
						<Text
							style={[type.small, styles.quickLabel, { color: palette.text }]}
						>
							Edit Expenses
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
						activeOpacity={0.8}
						onPress={() => router.push('/(tabs)/wallet/goals')}
					>
						<Ionicons name="flag-outline" size={20} color={palette.primary} />
						<Text
							style={[type.small, styles.quickLabel, { color: palette.text }]}
						>
							Goals
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
						activeOpacity={0.8}
						onPress={handleBackupProfile}
					>
						<Ionicons name="cloud-upload-outline" size={20} color="#8b5cf6" />
						<Text
							style={[type.small, styles.quickLabel, { color: palette.text }]}
						>
							Backup
						</Text>
					</TouchableOpacity>
				</View>
			</Section>

			{/* AI Insights */}
			{aiInsightsPreviewEnabled && (
				<Section
					title="AI Insights"
					right={
						<TouchableOpacity
							onPress={() => router.push('/(tabs)/chat')}
							style={styles.inlineButton}
							activeOpacity={0.7}
						>
							<Text
								style={[
									type.small,
									styles.inlineButtonText,
									{ color: palette.primary },
								]}
							>
								Chat about insights
							</Text>
							<Ionicons
								name="chatbubble-outline"
								size={15}
								color={palette.primary}
							/>
						</TouchableOpacity>
					}
				>
					<Card>
						<AIProfileInsights
							profile={profile}
							onAction={(a) => {
								if (a === 'export_insights') {
									Alert.alert(
										'Export',
										'Use Share from the insights screen to export.'
									);
									return;
								}
								if (a === 'optimize_income' || a === 'debt_strategy')
									router.push('/(stack)/settings/profile/editFinancial');
								else if (a === 'reduce_expenses')
									router.push('/(stack)/settings/profile/editExpenses');
								else if (a === 'set_savings_goal')
									router.push('/(tabs)/wallet/goals');
								else if (a === 'create_budget')
									router.push('/(tabs)/wallet/budgets');
								else router.push('/(tabs)/chat');
							}}
							mode="preview"
						/>
					</Card>
				</Section>
			)}

			{/* Management */}
			<Section title="Management">
				<Card>
					<Row
						icon="trash-outline"
						label="Delete Account"
						onPress={() =>
							router.push('/(stack)/settings/profile/deleteAccount')
						}
					/>
				</Card>
			</Section>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.lg,
		paddingBottom: space.xxl,
	},
	section: {
		marginTop: space.lg,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.sm,
	},
	sectionTitle: {
		// type.labelSm is applied in-line
	},
	sectionBody: {
		gap: space.sm,
	},

	card: {
		borderRadius: radius.lg,
		padding: space.md,
		borderWidth: StyleSheet.hairlineWidth,
		...shadow.card,
	},

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: space.sm,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: space.sm,
	},
	rowIconWrap: {
		width: 30,
		height: 30,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowTextWrap: {
		flex: 1,
	},
	rowLabel: {},
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		maxWidth: '60%',
		justifyContent: 'flex-end',
	},
	rowValue: {
		maxWidth: '90%',
	},

	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: space.xs,
	},

	stateWrap: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: space.xl,
	},
	stateTitle: {
		marginTop: space.sm,
		textAlign: 'center',
	},
	stateText: {
		marginTop: space.xs,
		textAlign: 'center',
	},
	primaryBtn: {
		marginTop: space.lg,
		paddingHorizontal: space.xl,
		paddingVertical: space.sm,
		borderRadius: radius.lg,
	},
	primaryBtnText: {
		color: palette.primaryTextOn,
		fontWeight: '700',
	},

	identityRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.md,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarLabel: {
		fontWeight: '700',
	},
	identityTextWrap: {
		flex: 1,
		marginLeft: space.md,
	},
	identityName: {},
	identityEmail: {
		marginTop: 2,
	},
	identityProgress: {
		alignItems: 'center',
		justifyContent: 'center',
	},

	kpiRow: {
		flexDirection: 'row',
		gap: space.md,
		marginBottom: space.sm,
	},
	kpiCard: {
		flex: 1,
	},
	kpiHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		marginBottom: space.xs,
	},
	kpiLabel: {},
	kpiValue: {
		marginBottom: space.xs,
	},
	kpiBar: {
		height: 6,
		borderRadius: 3,
		overflow: 'hidden',
	},
	kpiBarFill: {
		height: '100%',
		borderRadius: 3,
	},
	kpiSub: {
		marginTop: 4,
	},

	helperText: {
		marginTop: 4,
	},

	inlineButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 4,
	},
	inlineButtonText: {
		fontWeight: '700',
	},

	quickGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
	},
	quickTile: {
		width: '48%',
		paddingVertical: space.md,
		borderRadius: radius.lg,
		borderWidth: 1,
		alignItems: 'center',
		gap: space.xs,
	},
	quickLabel: {
		textAlign: 'center',
	},
});
