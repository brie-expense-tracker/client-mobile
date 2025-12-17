import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Alert,
	Share,
	RefreshControl,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';
import useAuth from '../../../../src/context/AuthContext';
import AIProfileInsights from './components/AIProfileInsights';
import { useFeature } from '../../../../src/config/features';
import { IncomeSourceBadge } from '../../../../src/components/IncomeSourceBadge';
import { IncomeDivergenceWarning } from '../../../../src/components/IncomeDivergenceWarning';
import { logger } from '../../../../src/utils/logger';
import { palette, radius, space, type, shadow } from '../../../../src/ui/theme';

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

const currency = (n?: number) =>
	typeof n === 'number' && !Number.isNaN(n) ? usd.format(n) : usd.format(0);

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
			<Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
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
}) => <View style={[styles.card, style]}>{children}</View>;

const Row = ({
	icon,
	label,
	value,
	onPress,
	badge,
	rightMeta,
	iconColor,
	iconBgColor,
	labelColor,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value?: string;
	onPress?: () => void;
	badge?: React.ReactNode;
	rightMeta?: React.ReactNode;
	iconColor?: string;
	iconBgColor?: string;
	labelColor?: string;
}) => {
	return (
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			style={({ pressed }) => [
				styles.rowContainer,
				pressed && onPress ? styles.pressed : null,
				!onPress && { opacity: 0.98 },
			]}
		>
			<View style={styles.rowLeft}>
				<View
					style={[
						styles.rowIconWrap,
						{ backgroundColor: iconBgColor || palette.subtle },
					]}
				>
					<Ionicons
						name={icon}
						size={18}
						color={iconColor || palette.textMuted}
					/>
				</View>

				<View style={styles.rowTextWrap}>
					<Text
						style={[
							type.body,
							styles.rowLabel,
							{ color: labelColor || palette.text },
						]}
						numberOfLines={1}
					>
						{label}
					</Text>

					{!!badge && <View style={{ marginTop: 4 }}>{badge}</View>}
				</View>
			</View>

			<View style={styles.rowRight}>
				{!!value && (
					<Text
						numberOfLines={1}
						style={[
							type.small,
							styles.rowValue,
							styles.tabularNums,
							{ color: palette.textSecondary },
						]}
					>
						{value}
					</Text>
				)}

				{!!rightMeta && <View style={styles.rowMeta}>{rightMeta}</View>}

				{!!onPress && (
					<Ionicons
						name="chevron-forward"
						size={16}
						color={palette.textSubtle}
						style={styles.chevron}
					/>
				)}
			</View>
		</Pressable>
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
			profileData.expenses?.loans,
			profileData.expenses?.subscriptions,
			profileData.financialGoal,
		];
		const filled = fields.filter(
			(f: any) => f !== undefined && f !== null && f !== ''
		).length;
		return Math.round((filled / fields.length) * 100);
	}, []);

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

	const healthScore = getFinancialHealthScore();
	const healthStatus = useMemo(() => {
		if (healthScore >= 80)
			return { label: 'Excellent', color: palette.success };
		if (healthScore >= 60) return { label: 'Good', color: palette.primary };
		if (healthScore >= 40) return { label: 'Fair', color: palette.warning };
		return { label: 'Needs work', color: palette.danger };
	}, [healthScore]);

	const profileStats = useMemo(() => {
		if (!profile) return { filled: 0, total: 0, missing: 0 };

		const fields = [
			profile.firstName,
			profile.lastName,
			profile.monthlyIncome,
			profile.savings,
			profile.debt,
			profile.expenses?.housing,
			profile.expenses?.loans,
			profile.expenses?.subscriptions,
			profile.financialGoal,
		];

		const filled = fields.filter(
			(f) => f !== undefined && f !== null && f !== ''
		).length;
		const total = fields.length;
		const missing = Math.max(0, total - filled);

		return { filled, total, missing };
	}, [profile]);

	const completionSub =
		profileCompletion === 100
			? 'Profile complete'
			: `${profileStats.missing} fields left`;

	const healthSub =
		healthScore >= 80
			? 'Keep it up'
			: healthScore >= 60
			? 'On track'
			: 'Improve by adding savings';

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

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: palette.surfaceAlt }}
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
			<Card style={styles.heroCard}>
				<View style={styles.identityRow}>
					<View style={styles.avatar}>
						<Text
							style={[type.h2, styles.avatarLabel, { color: palette.primary }]}
						>
							{initials}
						</Text>
					</View>
					<View style={styles.identityTextWrap}>
						<Text
							style={[
								type.titleMd,
								styles.identityName,
								{ color: palette.text },
							]}
							numberOfLines={1}
						>
							{profile.firstName || profile.lastName
								? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
								: 'Your Name'}
						</Text>
						<Text
							style={[type.bodyXs, { color: palette.textSubtle, marginTop: 2 }]}
							numberOfLines={1}
						>
							{user?.email || 'No email set'}
						</Text>
						<View style={styles.identityMeta}>
							<View
								style={[
									styles.healthPill,
									{ backgroundColor: 'rgba(14,165,233,0.08)' },
								]}
							>
								<View
									style={[
										styles.healthDot,
										{ backgroundColor: healthStatus.color },
									]}
								/>
								<Text
									style={[styles.healthPillText, { color: healthStatus.color }]}
								>
									Health: {healthStatus.label}
								</Text>
							</View>
						</View>
					</View>
					<TouchableOpacity
						onPress={() => router.push('/(stack)/settings/profile/editName')}
						activeOpacity={0.7}
						style={styles.editPill}
					>
						<Ionicons name="pencil" size={14} color={palette.primary} />
						<Text
							style={[
								type.small,
								styles.editPillText,
								{ color: palette.primary },
							]}
						>
							Edit
						</Text>
					</TouchableOpacity>
				</View>
			</Card>

			{/* KPIs */}
			<Card style={styles.kpiModule}>
				<View style={styles.kpiTopRow}>
					<View style={styles.kpiTopLeft}>
						<Text style={styles.kpiEyebrow}>Profile</Text>
						<Text style={styles.kpiTitle}>Your snapshot</Text>
					</View>

					<View style={styles.kpiTopRight}>
						<View
							style={[
								styles.healthPill,
								{ backgroundColor: 'rgba(14,165,233,0.10)' }, // tint from primary
							]}
						>
							<View
								style={[
									styles.healthDot,
									{ backgroundColor: healthStatus.color },
								]}
							/>
							<Text
								style={[styles.healthPillText, { color: healthStatus.color }]}
							>
								{healthStatus.label}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.kpiGrid}>
					{/* Completion lane */}
					<View style={styles.kpiLane}>
						<View style={styles.kpiLaneHeader}>
							<Ionicons
								name="checkmark-circle-outline"
								size={18}
								color={palette.success}
							/>
							<Text style={styles.kpiLaneLabel}>Completion</Text>
						</View>

						<View style={styles.kpiValueRow}>
							<Text style={styles.kpiValue}>{profileCompletion}%</Text>
							<Text style={styles.kpiSub}>{completionSub}</Text>
						</View>

						<View style={styles.kpiTrack}>
							<View
								style={[
									styles.kpiFill,
									{
										width: `${profileCompletion}%`,
										backgroundColor: palette.success,
									},
								]}
							/>
						</View>
					</View>

					<View style={styles.kpiDivider} />

					{/* Health lane */}
					<View style={styles.kpiLane}>
						<View style={styles.kpiLaneHeader}>
							<Ionicons
								name="trending-up-outline"
								size={18}
								color={healthStatus.color}
							/>
							<Text style={styles.kpiLaneLabel}>Health</Text>
						</View>

						<View style={styles.kpiValueRow}>
							<Text style={styles.kpiValue}>{healthScore}</Text>
							<Text style={styles.kpiValueSuffix}>/100</Text>
							<Text style={styles.kpiSub}>{healthSub}</Text>
						</View>

						<View style={styles.kpiTrack}>
							<View
								style={[
									styles.kpiFill,
									{
										width: `${healthScore}%`,
										backgroundColor: healthStatus.color,
									},
								]}
							/>
						</View>
					</View>
				</View>
			</Card>

			{/* Account */}
			<Section title="Account">
				<Card style={[styles.cardSoft, styles.listCard]}>
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
						icon="call-outline"
						label="Phone"
						value={profile.phone || 'Not set'}
						onPress={() => router.push('/(stack)/settings/profile/editPhone')}
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
				<Card style={[styles.cardSoft, styles.listCard]}>
					<Row
						icon="cash-outline"
						label="Monthly Income"
						value={currency(
							incomeEstimate?.monthlyIncome || profile.monthlyIncome
						)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						rightMeta={
							incomeEstimate && (
								<IncomeSourceBadge
									source={incomeEstimate.source}
									confidence={incomeEstimate.confidence}
									compact
									tone="ghost"
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
					{profile.savings === 0 && (
						<Text
							style={[
								type.labelXs,
								{
									color: palette.warning,
									marginLeft: 52,
									marginBottom: 2,
									fontWeight: '600',
								},
							]}
						>
							Adding savings improves your health score
						</Text>
					)}
					<Text
						style={[
							type.small,
							styles.helperText,
							{ color: palette.textSubtle, marginLeft: 52, marginTop: 2 },
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
					<Pressable
						android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
						style={({ pressed }) => [
							styles.quickTile,
							pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
							pressed && Platform.OS === 'ios' ? { shadowOpacity: 0.03 } : null,
						]}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="cash-outline" size={20} color={palette.success} />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Financial Info
						</Text>
						<Text style={styles.quickSub}>Adjust income</Text>
					</Pressable>

					<Pressable
						android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
						style={({ pressed }) => [
							styles.quickTile,
							pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
							pressed && Platform.OS === 'ios' ? { shadowOpacity: 0.03 } : null,
						]}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="card-outline" size={20} color={palette.warning} />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Edit Expenses
						</Text>
						<Text style={styles.quickSub}>Monthly costs</Text>
					</Pressable>

					<Pressable
						android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
						style={({ pressed }) => [
							styles.quickTile,
							pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
							pressed && Platform.OS === 'ios' ? { shadowOpacity: 0.03 } : null,
						]}
						onPress={() => router.push('/(tabs)/wallet/goals')}
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="flag-outline" size={20} color={palette.primary} />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Goals
						</Text>
						<Text style={styles.quickSub}>Set targets</Text>
					</Pressable>

					<Pressable
						android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
						style={({ pressed }) => [
							styles.quickTile,
							pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
							pressed && Platform.OS === 'ios' ? { shadowOpacity: 0.03 } : null,
						]}
						onPress={handleBackupProfile}
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="cloud-upload-outline" size={20} color="#8b5cf6" />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Backup
						</Text>
						<Text style={styles.quickSub}>Export data</Text>
					</Pressable>
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
					<Card style={[styles.cardSoft, styles.listCard]}>
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
				<Card style={[styles.cardSoft, styles.listCard]}>
					<Row
						icon="trash-outline"
						label="Delete Account"
						iconColor={palette.danger}
						iconBgColor={palette.dangerSoft}
						labelColor={palette.danger}
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
		paddingTop: space.md, // slightly tighter
		paddingBottom: space.xxl,
	},
	section: {
		marginTop: 22, // slightly less than xl
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	sectionTitle: {
		letterSpacing: 1.4,
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		color: palette.textSubtle,
	},
	sectionBody: {
		gap: space.sm,
	},

	card: {
		borderRadius: radius.xl,
		padding: space.lg,
		borderWidth: 1,
		borderColor: 'rgba(229,231,235,0.45)', // lighter
		backgroundColor: palette.surface,
		...shadow.soft, // use soft by default
	},
	cardSoft: {
		borderRadius: radius.xl,
		marginHorizontal: 0, // remove inset; it reads cleaner
		backgroundColor: palette.surface,
		...shadow.soft,
	},
	listCard: {
		paddingVertical: space.xs,
		paddingHorizontal: space.md,
	},

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
	},
	pressed: {
		opacity: 0.92,
		transform: [{ scale: 0.995 }],
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: space.sm,
	},
	rowIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: palette.subtle,
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
		justifyContent: 'flex-end',
		gap: 10,
		flexShrink: 0,
	},
	rowValue: {
		maxWidth: 120,
		textAlign: 'right',
		flexShrink: 1,
		fontWeight: '500',
	},
	rowMeta: {
		flexShrink: 0,
	},
	tabularNums: {
		// makes currency columns feel “designed”
		fontVariant: ['tabular-nums'],
	},
	chevron: {
		marginLeft: 0,
	},

	divider: {
		height: 1,
		opacity: 0.45,
		backgroundColor: 'rgba(229,231,235,0.5)',
		marginLeft: 52, // aligns under text, not under icon
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

	heroCard: {
		padding: 14,
		borderRadius: radius.xl,
		...shadow.card, // only hero gets stronger shadow
	},
	identityRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatar: {
		width: 58,
		height: 58,
		borderRadius: 29,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1.5,
		borderColor: 'rgba(229,231,235,0.9)',
		backgroundColor: palette.primarySubtle,
	},
	avatarLabel: {
		fontWeight: '700',
	},
	identityTextWrap: {
		flex: 1,
		marginLeft: space.md,
	},
	identityName: {},
	identityMeta: {
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	editPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: palette.primarySubtle,
	},
	editPillText: {
		fontWeight: '700',
	},

	kpiModule: {
		padding: space.lg,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: 'rgba(229,231,235,0.45)',
		backgroundColor: 'rgba(255,255,255,0.96)',
		...shadow.soft,
	},

	kpiTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.md,
	},
	kpiTopLeft: {
		flex: 1,
	},
	kpiEyebrow: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 1.1,
		textTransform: 'uppercase',
		color: palette.textSubtle,
	},
	kpiTitle: {
		marginTop: 4,
		fontSize: 16,
		fontWeight: '700',
		color: palette.text,
	},
	kpiTopRight: {
		marginLeft: space.md,
	},

	healthPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 999,
		marginTop: 2, // optical alignment
	},
	healthDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	healthPillText: {
		fontSize: 11,
		fontWeight: '700',
	},

	kpiGrid: {
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	kpiLane: {
		flex: 1,
	},
	kpiLaneHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8,
	},
	kpiLaneLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: palette.textSubtle,
	},

	kpiValueRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		flexWrap: 'wrap',
		gap: 6,
		marginBottom: 10,
	},
	kpiValue: {
		fontSize: 22,
		fontWeight: '800',
		color: palette.text,
		fontVariant: ['tabular-nums'],
	},
	kpiValueSuffix: {
		fontSize: 12,
		fontWeight: '700',
		color: palette.textSubtle,
		marginLeft: -4,
	},
	kpiSub: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textSubtle,
	},

	kpiTrack: {
		height: 7,
		borderRadius: 999,
		backgroundColor: palette.track,
		overflow: 'hidden',
	},
	kpiFill: {
		height: '100%',
		borderRadius: 999,
	},

	kpiDivider: {
		width: 1,
		backgroundColor: 'rgba(229,231,235,0.7)',
		marginHorizontal: space.lg,
	},

	helperText: {
		marginTop: 2,
		marginBottom: 6,
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
		flexBasis: '48%',
		flexGrow: 1,
		paddingVertical: space.sm,
		paddingHorizontal: space.md,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: 'rgba(229,231,235,0.6)',
		backgroundColor: palette.surface,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	quickIconWrap: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: palette.surfaceAlt, // a bit stronger than subtle
		alignItems: 'center',
		justifyContent: 'center',
	},
	quickLabel: {
		textAlign: 'center',
		fontWeight: '700',
	},
	quickSub: {
		marginTop: -2,
		color: palette.textSubtle,
		fontSize: 11,
		fontWeight: '500',
	},
});
