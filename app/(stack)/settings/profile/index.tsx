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
import IncomeSourceBadge from '../../../../src/components/IncomeSourceBadge';
import IncomeDivergenceWarning from '../../../../src/components/IncomeDivergenceWarning';

const currency = (n?: number) =>
	typeof n === 'number' && !Number.isNaN(n) ? `$${n.toLocaleString()}` : '$0';

const Section = ({ title, children, right, colors }: any) => (
	<View style={{ marginTop: 18 }}>
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 10,
			}}
		>
			<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
				{title}
			</Text>
			{right}
		</View>
		<View style={{ gap: 12 }}>{children}</View>
	</View>
);

const Card = ({ children, colors, style }: any) => (
	<View
		style={[
			{
				backgroundColor: colors.card,
				borderRadius: 12,
				padding: 12,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: colors.isDark ? 0.2 : 0.05,
				shadowRadius: 2,
				elevation: 1,
				borderWidth: 1,
				borderColor: colors.line,
			},
			style,
		]}
	>
		{children}
	</View>
);

const Row = ({ icon, label, value, onPress, colors, badge }: any) => (
	<TouchableOpacity
		activeOpacity={0.7}
		onPress={onPress}
		style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
	>
		<View
			style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
		>
			<Ionicons name={icon} size={18} color={colors.subtext} />
			<View style={{ flexDirection: 'column', gap: 4, flex: 1 }}>
				<Text
					style={{
						fontSize: 14,
						color: colors.text,
						fontWeight: '600',
						flexShrink: 1,
					}}
					numberOfLines={1}
				>
					{label}
				</Text>
				{badge}
			</View>
		</View>
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				maxWidth: '60%',
			}}
		>
			{value ? (
				<Text
					numberOfLines={1}
					style={{ fontSize: 13, color: colors.subtext, maxWidth: '90%' }}
				>
					{value}
				</Text>
			) : null}
			{onPress ? (
				<Ionicons name="chevron-forward" size={18} color={colors.subtext} />
			) : null}
		</View>
	</TouchableOpacity>
);

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
			console.error('Export error:', err);
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

	// ---------- Header: avatar + identity ----------
	const initials = useMemo(() => {
		const f = (profile?.firstName || '').charAt(0);
		const l = (profile?.lastName || '').charAt(0);
		return (f + l || 'U').toUpperCase();
	}, [profile?.firstName, profile?.lastName]);

	// states
	if (loading) {
		return (
			<View style={[s.stateWrap, { backgroundColor: colors.bg }]}>
				<ActivityIndicator size="large" color={colors.tint} />
				<Text style={[s.stateText, { color: colors.subtext }]}>
					{profile ? 'Loading profile...' : 'Setting up your profile...'}
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={[s.stateWrap, { backgroundColor: colors.bg }]}>
				<Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
				<Text style={[s.stateTitle, { color: colors.text }]}>
					Failed to load profile
				</Text>
				<Text style={[s.stateText, { color: colors.subtext }]}>{error}</Text>
				<TouchableOpacity
					style={[s.primaryBtn, { backgroundColor: colors.tint }]}
					onPress={fetchProfile}
				>
					<Text style={s.primaryBtnText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={[s.stateWrap, { backgroundColor: colors.bg }]}>
				<Ionicons name="person-outline" size={48} color={colors.subtle} />
				<Text style={[s.stateTitle, { color: colors.text }]}>
					No profile found
				</Text>
				<TouchableOpacity
					style={[s.primaryBtn, { backgroundColor: colors.tint }]}
					onPress={fetchProfile}
				>
					<Text style={s.primaryBtnText}>Refresh</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const healthScore = getFinancialHealthScore();

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: colors.bg }}
			contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
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
			{/* identity */}
			<View
				style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
			>
				<View
					style={{
						width: 48,
						height: 48,
						borderRadius: 24,
						backgroundColor: colors.slate,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
						{initials || 'U'}
					</Text>
				</View>
				<View style={{ flex: 1, marginLeft: 12 }}>
					<Text
						style={{ fontSize: 18, fontWeight: '700', color: colors.text }}
						numberOfLines={1}
					>
						{profile.firstName || profile.lastName
							? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
							: 'Your Name'}
					</Text>
					<Text
						style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}
						numberOfLines={1}
					>
						{user?.email || 'No email set'}
					</Text>
				</View>
				<View style={{ alignItems: 'center', justifyContent: 'center' }}>
					<CircularProgress
						size={48}
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
			<View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
				<Card colors={colors} style={{ flex: 1 }}>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							marginBottom: 6,
						}}
					>
						<Ionicons
							name="checkmark-circle-outline"
							size={18}
							color={colors.success}
						/>
						<Text
							style={{ fontSize: 12, color: colors.subtext, fontWeight: '600' }}
						>
							Completion
						</Text>
					</View>
					<Text
						style={{
							fontSize: 22,
							fontWeight: '800',
							color: colors.text,
							marginBottom: 8,
						}}
					>
						{profileCompletion}%
					</Text>
					{/* slim progress keeps structure if you still want it */}
					<View
						style={{
							height: 6,
							backgroundColor: colors.line,
							borderRadius: 3,
							overflow: 'hidden',
						}}
					>
						<View
							style={{
								height: '100%',
								width: `${profileCompletion}%`,
								backgroundColor: colors.success,
							}}
						/>
					</View>
				</Card>

				<Card colors={colors} style={{ flex: 1 }}>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							marginBottom: 6,
						}}
					>
						<Ionicons
							name="trending-up-outline"
							size={18}
							color={colors.tint}
						/>
						<Text
							style={{ fontSize: 12, color: colors.subtext, fontWeight: '600' }}
						>
							Health
						</Text>
					</View>
					<Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
						{healthScore}/100
					</Text>
					<Text
						style={{
							fontSize: 12,
							fontWeight: '600',
							color: colors.subtext,
							marginTop: 4,
						}}
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
					<View style={{ height: 1, backgroundColor: colors.line }} />
					<Row
						icon="mail-outline"
						label="Email"
						value={user?.email || 'Not set'}
						colors={colors}
					/>
				</Card>
			</Section>

			{/* Income Divergence Warning */}
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
					<View style={{ height: 1, backgroundColor: colors.line }} />
					<Row
						icon="trending-up-outline"
						label="Total Savings"
						value={currency(profile.savings)}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
						colors={colors}
					/>
					<View style={{ height: 1, backgroundColor: colors.line }} />
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
							<View style={{ height: 1, backgroundColor: colors.line }} />
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
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 6,
							paddingHorizontal: 8,
							paddingVertical: 4,
						}}
					>
						<Ionicons
							name="cloud-upload-outline"
							size={18}
							color={colors.tint}
						/>
						<Text style={{ color: colors.tint, fontWeight: '700' }}>
							Backup
						</Text>
					</TouchableOpacity>
				}
			>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
					<TouchableOpacity
						style={{
							width: '48%',
							paddingVertical: 14,
							borderRadius: 12,
							borderWidth: 1,
							borderColor: colors.line,
							backgroundColor: colors.card,
							alignItems: 'center',
							gap: 8,
						}}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					>
						<Ionicons name="cash-outline" size={22} color={colors.success} />
						<Text
							style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
						>
							Financial Info
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={{
							width: '48%',
							paddingVertical: 14,
							borderRadius: 12,
							borderWidth: 1,
							borderColor: colors.line,
							backgroundColor: colors.card,
							alignItems: 'center',
							gap: 8,
						}}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					>
						<Ionicons name="card-outline" size={22} color={colors.warn} />
						<Text
							style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
						>
							Edit Expenses
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={{
							width: '48%',
							paddingVertical: 14,
							borderRadius: 12,
							borderWidth: 1,
							borderColor: colors.line,
							backgroundColor: colors.card,
							alignItems: 'center',
							gap: 8,
						}}
						onPress={() => router.push('/(tabs)/budgets?tab=goals')}
					>
						<Ionicons name="flag-outline" size={22} color={colors.tint} />
						<Text
							style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
						>
							Goals
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={{
							width: '48%',
							paddingVertical: 14,
							borderRadius: 12,
							borderWidth: 1,
							borderColor: colors.line,
							backgroundColor: colors.card,
							alignItems: 'center',
							gap: 8,
						}}
						onPress={handleBackupProfile}
					>
						<Ionicons name="cloud-upload-outline" size={22} color="#8b5cf6" />
						<Text
							style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
						>
							Backup
						</Text>
					</TouchableOpacity>
				</View>
			</Section>

			{/* AI Insights (Preview) - Only show if feature is enabled */}
			{aiInsightsPreviewEnabled && (
				<Section
					title="AI Insights"
					colors={colors}
					right={
						<TouchableOpacity
							onPress={() => {
								// Navigate to assistant with insights context
								router.push('/(tabs)/assistant');
							}}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								gap: 6,
								paddingHorizontal: 8,
								paddingVertical: 4,
							}}
						>
							<Text style={{ color: colors.tint, fontWeight: '700' }}>
								Chat about insights
							</Text>
							<Ionicons
								name="chatbubble-outline"
								size={16}
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
									router.push('/(tabs)/budgets?tab=goals');
								else if (a === 'create_budget')
									router.push('/(tabs)/budgets?tab=budgets');
								else router.push('/(tabs)/assistant');
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

const s = StyleSheet.create({
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
	stateText: { marginTop: 6, fontSize: 14, textAlign: 'center' },
	primaryBtn: {
		marginTop: 20,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 8,
	},
	primaryBtnText: { color: '#fff', fontWeight: '700' },
});
