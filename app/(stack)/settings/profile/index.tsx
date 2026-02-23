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
import { logger } from '../../../../src/utils/logger';
import { palette, radius, space, type, shadow } from '../../../../src/ui/theme';

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

const currency = (n?: number | null) => {
	if (typeof n === 'number' && !Number.isNaN(n)) {
		return usd.format(n);
	}
	// Should not reach here if we check for null/undefined before calling
	// But as a safety fallback, format 0
	return usd.format(0);
};

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
	const accessibilityLabel = value 
		? `${label}, ${value}` 
		: label;
	
	return (
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			accessibilityRole={onPress ? "button" : undefined}
			accessibilityLabel={onPress ? accessibilityLabel : undefined}
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
	} = useProfile();
	const { user } = useAuth();
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchProfile();
		} finally {
			setRefreshing(false);
		}
	}, [fetchProfile]);

	// MVP completion: only count fields that are easily editable from this screen (1-2 taps)
	// Fields: firstName, lastName, monthlyIncome, savings, expenses.housing, phone
	const computeProfileCompletion = useCallback((profileData: any) => {
		if (!profileData) {
			return { filled: 0, total: 0, missing: 0, percentage: 0, missingItems: [] };
		}

		// Helper to check if a value is set (including 0, which is intentional)
		const isSet = (val: any): boolean => {
			if (typeof val === 'number') {
				// 0 is considered set (intentional), only null/undefined means not set
				return val !== null && val !== undefined;
			}
			return val !== undefined && val !== null && val !== '';
		};

		// Check individual fields
		const hasFirstName = isSet(profileData.firstName);
		const hasLastName = isSet(profileData.lastName);
		const hasName = hasFirstName && hasLastName; // Both required for "name" to be complete
		const hasMonthlyIncome = isSet(profileData.monthlyIncome);
		const hasSavings = isSet(profileData.savings);
		const hasHousing = isSet(profileData.expenses?.housing);
		const hasPhone = isSet(profileData.phone);

		// Count filled fields (name counts as 2 fields but one completion item)
		const filled = (hasName ? 2 : (hasFirstName || hasLastName ? 1 : 0)) +
			(hasMonthlyIncome ? 1 : 0) +
			(hasSavings ? 1 : 0) +
			(hasHousing ? 1 : 0) +
			(hasPhone ? 1 : 0);

		const total = 6; // firstName, lastName, monthlyIncome, savings, housing, phone
		const missing = Math.max(0, total - filled);
		const percentage = Math.round((filled / total) * 100);

		// Generate missing fields list, ordered by impact:
		// 1. Income (most critical for financial planning)
		// 2. Housing (major expense)
		// 3. Savings (important for goals)
		// 4. Name/Contact (identity, less critical for financial features)
		const missingItems: { label: string; route: string }[] = [];

		if (!hasMonthlyIncome) {
			missingItems.push({ label: 'Set your income', route: '/(stack)/settings/profile/editFinancial' });
		}
		if (!hasHousing) {
			missingItems.push({ label: 'Set housing expense', route: '/(stack)/settings/profile/editExpenses' });
		}
		if (!hasSavings) {
			missingItems.push({ label: 'Set your savings', route: '/(stack)/settings/profile/editFinancial' });
		}
		if (!hasName) {
			missingItems.push({ label: 'Set your name', route: '/(stack)/settings/profile/editName' });
		}
		if (!hasPhone) {
			missingItems.push({ label: 'Set your phone', route: '/(stack)/settings/profile/editPhone' });
		}

		return { filled, total, missing, percentage, missingItems };
	}, []);

	const profileCompletionData = useMemo(() => {
		return computeProfileCompletion(profile);
	}, [profile, computeProfileCompletion]);

	const profileStats = useMemo(() => {
		return {
			filled: profileCompletionData.filled,
			total: profileCompletionData.total,
			missing: profileCompletionData.missing,
		};
	}, [profileCompletionData]);

	const missingFields = useMemo(() => {
		return profileCompletionData.missingItems.slice(0, 3); // Limit to 3 items
	}, [profileCompletionData.missingItems]);


	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);


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
				title: 'Profile Data Export',
			});
		} catch (err) {
			logger.error('Export error:', err);
			Alert.alert('Error', 'Failed to export profile data');
		}
	};

	const handleBackupProfile = async () => {
		Alert.alert(
			'Export data',
			'This will generate a JSON file you can share or save.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Export', onPress: handleExportProfile },
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
									styles.completionPill,
									{ backgroundColor: 'rgba(14,165,233,0.08)' },
								]}
							>
								<Text
									style={[styles.completionPillText, { color: palette.primary }]}
								>
									{profileCompletionData.percentage}% ·{' '}
									{profileCompletionData.percentage === 100
										? 'Complete'
										: `${profileStats.missing} fields left`}
								</Text>
							</View>
						</View>
					</View>
					<TouchableOpacity
						onPress={() => router.push('/(stack)/settings/profile/editName')}
						activeOpacity={0.7}
						style={styles.editPill}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						accessibilityRole="button"
						accessibilityLabel="Edit name"
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

			{/* Profile Checklist */}
			{profileCompletionData.percentage < 100 && missingFields.length > 0 && (
				<Card style={styles.checklistCard}>
					<Text style={styles.checklistTitle}>Finish your profile</Text>
					
					{/* Progress Bar */}
					<View style={styles.checklistProgressTrack}>
						<View
							style={[
								styles.checklistProgressFill,
								{
									width: `${profileCompletionData.percentage}%`,
									backgroundColor: palette.primary,
								},
							]}
						/>
					</View>

					{/* Missing Items Chips */}
					<View style={styles.checklistChips}>
						{missingFields.map((item, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => router.push(item.route as any)}
								activeOpacity={0.7}
								style={styles.checklistChip}
								hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
								accessibilityRole="button"
								accessibilityLabel={item.label}
							>
								<Text style={styles.checklistChipText}>{item.label}</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* CTA Button */}
					<TouchableOpacity
						onPress={() => {
							// Route to the first missing field (ordered by impact)
							if (missingFields.length > 0) {
								router.push(missingFields[0].route as any);
							}
						}}
						activeOpacity={0.8}
						style={[styles.checklistButton, { backgroundColor: palette.primary }]}
						accessibilityRole="button"
						accessibilityLabel="Finish profile"
					>
						<Text style={styles.checklistButtonText}>Finish profile</Text>
					</TouchableOpacity>
				</Card>
			)}

			{/* Profile */}
			<Section title="Profile">
				<Card style={[styles.cardSoft, styles.listCard]}>
					<Row
						icon="person-outline"
						label="Name"
						value={
							profile.firstName || profile.lastName
								? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
								: 'Set your name'
						}
						onPress={() => router.push('/(stack)/settings/profile/editName')}
					/>
					<View style={styles.divider} />
					<Row
						icon="call-outline"
						label="Contact"
						value={(() => {
							const phoneSet = profile.phone && profile.phone.trim() !== '';
							if (phoneSet && user?.email) {
								return `${profile.phone} · ${user.email}`;
							}
							if (phoneSet) {
								return profile.phone;
							}
							if (user?.email) {
								return user.email;
							}
							return 'Set your phone number';
						})()}
						onPress={() => router.push('/(stack)/settings/profile/editPhone')}
					/>
					<View style={styles.divider} />
					<Row
						icon="cash-outline"
						label="Money"
						value={(() => {
							const incomeSet = profile.monthlyIncome !== null && profile.monthlyIncome !== undefined;
							const savingsSet = profile.savings !== null && profile.savings !== undefined;
							
							if (incomeSet && savingsSet) {
								return `${currency(profile.monthlyIncome)} · ${currency(profile.savings)}`;
							}
							if (incomeSet) {
								return currency(profile.monthlyIncome);
							}
							if (savingsSet) {
								return currency(profile.savings);
							}
							return 'Set your income & savings';
						})()}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>
					<View style={styles.divider} />
					<Row
						icon="card-outline"
						label="Expenses"
						value={(() => {
							const expenses = profile.expenses || {};
							const expenseItems: { label: string; value: number }[] = [];
							
							// Collect non-zero expense categories
							if (expenses.housing !== null && expenses.housing !== undefined && expenses.housing > 0) {
								expenseItems.push({ label: 'Housing', value: expenses.housing });
							}
							if (expenses.subscriptions !== null && expenses.subscriptions !== undefined && expenses.subscriptions > 0) {
								expenseItems.push({ label: 'Subscriptions', value: expenses.subscriptions });
							}
							if (expenses.loans !== null && expenses.loans !== undefined && expenses.loans > 0) {
								expenseItems.push({ label: 'Loans', value: expenses.loans });
							}
							
							if (expenseItems.length === 0) {
								return 'Set your housing expense';
							}
							
							// Show top 2 expense categories in compact format
							const topItems = expenseItems.slice(0, 2);
							return topItems.map(item => `${item.label} ${currency(item.value)}`).join(' · ');
						})()}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					/>
					<View style={styles.divider} />
					<Row
						icon="wallet-outline"
						label="Other financial details"
						value={(() => {
							const debtSet = profile.debt !== null && profile.debt !== undefined;
							
							if (debtSet) {
								return `Debt: ${currency(profile.debt)}`;
							}
							return 'Set debt';
						})()}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>
				</Card>
			</Section>

			{/* Quick Actions */}
			<Section title="Quick Actions">
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
						hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
						accessibilityRole="button"
						accessibilityLabel="Update money, Income, savings, expenses"
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="cash-outline" size={20} color={palette.success} />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Update money
						</Text>
						<Text style={styles.quickSub}>Income, savings, expenses</Text>
					</Pressable>

					<Pressable
						android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
						style={({ pressed }) => [
							styles.quickTile,
							pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
							pressed && Platform.OS === 'ios' ? { shadowOpacity: 0.03 } : null,
						]}
						onPress={() => router.push('/(tabs)/dashboard')}
						hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
						accessibilityRole="button"
						accessibilityLabel="Goals, Set targets"
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
						hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
						accessibilityRole="button"
						accessibilityLabel="Export data, Backup profile"
					>
						<View style={styles.quickIconWrap}>
							<Ionicons name="cloud-upload-outline" size={20} color={palette.textMuted} />
						</View>
						<Text
							style={[type.body, styles.quickLabel, { color: palette.text }]}
						>
							Export data
						</Text>
						<Text style={styles.quickSub}>Backup profile</Text>
					</Pressable>
				</View>
			</Section>

			{/* Management */}
			<Section title="Management">
				<Card style={[styles.cardSoft, styles.listCard]}>
					<Row
						icon="cloud-upload-outline"
						label="Export data"
						onPress={handleBackupProfile}
					/>
					<View style={styles.divider} />
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
		backgroundColor: palette.border, // Use theme color directly for consistency across light/dark
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

	completionPill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 999,
		marginTop: 2, // optical alignment
	},
	completionPillText: {
		fontSize: 11,
		fontWeight: '700',
	},

	checklistCard: {
		padding: space.lg,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: 'rgba(229,231,235,0.45)',
		backgroundColor: palette.surface,
		...shadow.soft,
	},
	checklistTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: palette.text,
		marginBottom: space.md,
	},
	checklistProgressTrack: {
		height: 6,
		borderRadius: 999,
		backgroundColor: palette.track,
		overflow: 'hidden',
		marginBottom: space.md,
	},
	checklistProgressFill: {
		height: '100%',
		borderRadius: 999,
	},
	checklistChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
		marginBottom: space.md,
	},
	checklistChip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: radius.lg,
		backgroundColor: palette.primarySubtle,
		borderWidth: 1,
		borderColor: 'rgba(14,165,233,0.2)',
	},
	checklistChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.primary,
	},
	checklistButton: {
		paddingVertical: space.sm,
		paddingHorizontal: space.lg,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checklistButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: palette.primaryTextOn,
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
		flexBasis: '31%', // Works well for 3 tiles per row
		flexGrow: 1,
		minWidth: 100, // Ensure tiles don't get too narrow
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
