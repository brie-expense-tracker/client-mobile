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
import { useTheme } from '../../../../src/context/ThemeContext';
import AIProfileInsights from './components/AIProfileInsights';
import CircularProgress from '../../../../src/components/CircularProgress';
import { useFeature } from '../../../../src/config/features';
import { IncomeSourceBadge } from '../../../../src/components/IncomeSourceBadge';
import { IncomeDivergenceWarning } from '../../../../src/components/IncomeDivergenceWarning';
import { logger } from '../../../../src/utils/logger';

const currency = (n?: number) =>
	typeof n === 'number' && !Number.isNaN(n) ? `$${n.toLocaleString()}` : '$0';

const Section = ({ title, children, right, colors }: any) => (
	<View style={styles.section}>
		<View style={styles.sectionHeader}>
			<Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
			{right}
		</View>
		<View style={styles.sectionBody}>{children}</View>
	</View>
);

const Card = ({ children, colors, style }: any) => (
	<View
		style={[
			styles.card,
			{
				backgroundColor: colors.card,
				shadowOpacity: colors.isDark ? 0.18 : 0.05,
				borderColor: colors.line,
			},
			style,
		]}
	>
		{children}
	</View>
);

const Row = ({ icon, label, value, onPress, colors, badge }: any) => {
	const Wrapper = onPress ? TouchableOpacity : View;
	return (
		<Wrapper activeOpacity={0.65} onPress={onPress} style={styles.rowContainer}>
			<View style={styles.rowLeft}>
				<View style={styles.rowIconWrap}>
					<Ionicons name={icon} size={18} color={colors.subtext} />
				</View>
				<View style={styles.rowTextWrap}>
					<Text
						style={[styles.rowLabel, { color: colors.text }]}
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
						style={[styles.rowValue, { color: colors.subtext }]}
					>
						{value}
					</Text>
				) : null}
				{onPress ? (
					<Ionicons name="chevron-forward" size={18} color={colors.subtext} />
				) : null}
			</View>
		</Wrapper>
	);
};

export default function AccountScreen() {
	const { colors } = useTheme();
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
		return (f + l || 'U').toUpperCase();
	}, [profile?.firstName, profile?.lastName]);

	if (loading) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: colors.bg }]}>
				<ActivityIndicator size="large" color={colors.tint} />
				<Text style={[styles.stateText, { color: colors.subtext }]}>
					{profile ? 'Loading profile...' : 'Setting up your profile...'}
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: colors.bg }]}>
				<Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
				<Text style={[styles.stateTitle, { color: colors.text }]}>
					Failed to load profile
				</Text>
				<Text style={[styles.stateText, { color: colors.subtext }]}>
					{error}
				</Text>
				<TouchableOpacity
					style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
					onPress={fetchProfile}
				>
					<Text style={styles.primaryBtnText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={[styles.stateWrap, { backgroundColor: colors.bg }]}>
				<Ionicons name="person-outline" size={48} color={colors.subtle} />
				<Text style={[styles.stateTitle, { color: colors.text }]}>
					No profile found
				</Text>
				<TouchableOpacity
					style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
					onPress={fetchProfile}
				>
					<Text style={styles.primaryBtnText}>Refresh</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const healthScore = getFinancialHealthScore();

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: colors.bg }}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleRefresh}
					tintColor={colors.tint}
					colors={[colors.tint]}
					progressBackgroundColor={colors.card}
				/>
			}
		>
			{/* Identity / hero */}
			<View style={styles.identityRow}>
				<View style={[styles.avatar, { backgroundColor: colors.slate }]}>
					<Text style={[styles.avatarLabel, { color: colors.text }]}>
						{initials || 'U'}
					</Text>
				</View>
				<View style={styles.identityTextWrap}>
					<Text
						style={[styles.identityName, { color: colors.text }]}
						numberOfLines={1}
					>
						{profile.firstName || profile.lastName
							? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
							: 'Your Name'}
					</Text>
					<Text
						style={[styles.identityEmail, { color: colors.subtext }]}
						numberOfLines={1}
					>
						{user?.email || 'No email set'}
					</Text>
				</View>
				<View style={styles.identityProgress}>
					<CircularProgress
						size={50}
						strokeWidth={6}
						value={profileCompletion}
						trackColor={colors.ringTrack}
						barColor={colors.success}
						label={`${profileCompletion}%`}
						labelColor={colors.text}
					/>
				</View>
			</View>

			{/* KPIs */}
			<View style={styles.kpiRow}>
				<Card colors={colors} style={styles.kpiCard}>
					<View style={styles.kpiHeader}>
						<Ionicons
							name="checkmark-circle-outline"
							size={18}
							color={colors.success}
						/>
						<Text style={[styles.kpiLabel, { color: colors.subtext }]}>
							Completion
						</Text>
					</View>
					<Text style={[styles.kpiValue, { color: colors.text }]}>
						{profileCompletion}%
					</Text>
					<View style={[styles.kpiBar, { backgroundColor: colors.line }]}>
						<View
							style={[
								styles.kpiBarFill,
								{
									backgroundColor: colors.success,
									width: `${profileCompletion}%`,
								},
							]}
						/>
					</View>
				</Card>

				<Card colors={colors} style={styles.kpiCard}>
					<View style={styles.kpiHeader}>
						<Ionicons
							name="trending-up-outline"
							size={18}
							color={colors.tint}
						/>
						<Text style={[styles.kpiLabel, { color: colors.subtext }]}>
							Health
						</Text>
					</View>
					<Text style={[styles.kpiValue, { color: colors.text }]}>
						{healthScore}/100
					</Text>
					<Text style={[styles.kpiSub, { color: colors.subtext }]}>
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
			<Section title="Account" colors={colors}>
				<Card colors={colors}>
					<Row
						icon="person-outline"
						label="Name"
						value={
							profile.firstName || profile.lastName
								? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
								: 'Not set'
						}
						onPress={() => router.push('/(stack)/settings/profile/editName')}
						colors={colors}
					/>
					<View style={[styles.divider, { backgroundColor: colors.line }]} />
					<Row
						icon="mail-outline"
						label="Email"
						value={user?.email || 'Not set'}
						colors={colors}
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
			<Section title="Financial" colors={colors}>
				<Card colors={colors}>
					<Row
						icon="cash-outline"
						label="Monthly Income"
						value={currency(
							incomeEstimate?.monthlyIncome || profile.monthlyIncome
						)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						colors={colors}
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
					<View style={[styles.divider, { backgroundColor: colors.line }]} />
					<Row
						icon="trending-up-outline"
						label="Savings & Investments"
						value={currency(profile.savings)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						colors={colors}
					/>
					<Text style={[styles.helperText, { color: colors.subtext }]}>
						Include cash + investment balances.
					</Text>
					<View style={[styles.divider, { backgroundColor: colors.line }]} />
					<Row
						icon="trending-down-outline"
						label="Total Debt"
						value={currency(profile.debt)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						colors={colors}
					/>
					{!!profile.expenses && (
						<>
							<View
								style={[styles.divider, { backgroundColor: colors.line }]}
							/>
							<Row
								icon="card-outline"
								label="Expenses"
								value={`Housing: ${currency(profile.expenses.housing)}`}
								onPress={() =>
									router.push('/(stack)/settings/profile/editExpenses')
								}
								colors={colors}
							/>
						</>
					)}
				</Card>
			</Section>

			{/* Quick Actions */}
			<Section
				title="Quick Actions"
				colors={colors}
				right={
					<TouchableOpacity
						onPress={handleBackupProfile}
						style={styles.inlineButton}
					>
						<Ionicons
							name="cloud-upload-outline"
							size={16}
							color={colors.tint}
						/>
						<Text style={[styles.inlineButtonText, { color: colors.tint }]}>
							Backup
						</Text>
					</TouchableOpacity>
				}
			>
				<View style={styles.quickGrid}>
					<TouchableOpacity
						style={[
							styles.quickTile,
							{ borderColor: colors.line, backgroundColor: colors.card },
						]}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					>
						<Ionicons name="cash-outline" size={20} color={colors.success} />
						<Text style={[styles.quickLabel, { color: colors.text }]}>
							Financial Info
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{ borderColor: colors.line, backgroundColor: colors.card },
						]}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					>
						<Ionicons name="card-outline" size={20} color={colors.warn} />
						<Text style={[styles.quickLabel, { color: colors.text }]}>
							Edit Expenses
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{ borderColor: colors.line, backgroundColor: colors.card },
						]}
						onPress={() => router.push('/(tabs)/wallet/goals')}
					>
						<Ionicons name="flag-outline" size={20} color={colors.tint} />
						<Text style={[styles.quickLabel, { color: colors.text }]}>
							Goals
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.quickTile,
							{ borderColor: colors.line, backgroundColor: colors.card },
						]}
						onPress={handleBackupProfile}
					>
						<Ionicons name="cloud-upload-outline" size={20} color="#8b5cf6" />
						<Text style={[styles.quickLabel, { color: colors.text }]}>
							Backup
						</Text>
					</TouchableOpacity>
				</View>
			</Section>

			{/* AI Insights */}
			{aiInsightsPreviewEnabled && (
				<Section
					title="AI Insights"
					colors={colors}
					right={
						<TouchableOpacity
							onPress={() => router.push('/(tabs)/chat')}
							style={styles.inlineButton}
						>
							<Text style={[styles.inlineButtonText, { color: colors.tint }]}>
								Chat about insights
							</Text>
							<Ionicons
								name="chatbubble-outline"
								size={15}
								color={colors.tint}
							/>
						</TouchableOpacity>
					}
				>
					<Card colors={colors}>
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
			<Section title="Management" colors={colors}>
				<Card colors={colors}>
					<Row
						icon="trash-outline"
						label="Delete Account"
						onPress={() =>
							router.push('/(stack)/settings/profile/deleteAccount')
						}
						colors={colors}
					/>
				</Card>
			</Section>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		padding: 16,
		paddingBottom: 28,
	},
	section: {
		marginTop: 18,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	sectionBody: {
		gap: 12,
	},
	card: {
		borderRadius: 14,
		padding: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowRadius: 3,
		elevation: 1,
	},
	rowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 10,
	},
	rowIconWrap: {
		width: 30,
		alignItems: 'center',
	},
	rowTextWrap: {
		flex: 1,
	},
	rowLabel: {
		fontSize: 14,
		fontWeight: '600',
	},
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		maxWidth: '60%',
		justifyContent: 'flex-end',
	},
	rowValue: {
		fontSize: 13,
		maxWidth: '90%',
	},
	divider: {
		height: 1,
		marginVertical: 4,
	},
	stateWrap: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	stateTitle: {
		marginTop: 12,
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
	},
	stateText: {
		marginTop: 6,
		fontSize: 14,
		textAlign: 'center',
	},
	primaryBtn: {
		marginTop: 20,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 8,
	},
	primaryBtnText: {
		color: '#fff',
		fontWeight: '700',
	},
	identityRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarLabel: {
		fontSize: 16,
		fontWeight: '700',
	},
	identityTextWrap: {
		flex: 1,
		marginLeft: 12,
	},
	identityName: {
		fontSize: 18,
		fontWeight: '700',
	},
	identityEmail: {
		fontSize: 13,
		marginTop: 2,
	},
	identityProgress: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	kpiRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 6,
	},
	kpiCard: {
		flex: 1,
	},
	kpiHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 6,
	},
	kpiLabel: {
		fontSize: 12,
		fontWeight: '600',
	},
	kpiValue: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 8,
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
		fontSize: 12,
		fontWeight: '600',
		marginTop: 4,
	},
	helperText: {
		fontSize: 12,
		marginTop: 4,
	},
	inlineButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 4,
	},
	inlineButtonText: {
		fontWeight: '700',
	},
	quickGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	quickTile: {
		width: '48%',
		paddingVertical: 14,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		gap: 8,
	},
	quickLabel: {
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center',
	},
});
