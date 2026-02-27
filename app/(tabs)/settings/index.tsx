import React, { useMemo } from 'react';
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Text,
	Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '../../../src/context/AuthContext';
import { setUseLocalMode } from '../../../src/storage/localModeStorage';
import { isDevMode } from '../../../src/config/environment';
import { palette, radius, space, type } from '../../../src/ui/theme';
import { useProfile } from '../../../src/context/profileContext';
import {
	AppCard,
	AppText,
	AppButton,
	AppRow,
} from '../../../src/ui/primitives';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

/* ---------------------------- Profile Completion ---------------------------- */

function getProfileCompletion(
	profile: {
		firstName?: string;
		lastName?: string;
		phone?: string;
		monthlyIncome?: number;
		expenses?: { housing?: number; loans?: number; subscriptions?: number };
	} | null,
	email?: string,
): { percent: number; fieldsLeft: number } {
	if (!profile) return { percent: 0, fieldsLeft: 5 };

	const fields = [
		!!(profile.firstName && profile.firstName.trim()),
		!!(profile.lastName && profile.lastName.trim()),
		!!email?.trim(),
		!!profile.phone?.trim(),
		typeof profile.monthlyIncome === 'number' && profile.monthlyIncome > 0,
	];
	const filled = fields.filter(Boolean).length;
	const total = 5;
	const fieldsLeft = total - filled;
	const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
	return { percent, fieldsLeft };
}

/* ---------------------------- Sign-in view (no ProfileProvider) ---------------------------- */

function SignInView() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const handleSignInToSync = async () => {
		await setUseLocalMode(false);
		router.replace('/(auth)/login');
	};

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<AppText.Title>Profile</AppText.Title>
			</View>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: insets.bottom + space.xl },
				]}
				showsVerticalScrollIndicator={false}
			>
				<AppCard onPress={handleSignInToSync}>
					<View style={styles.signInPrompt}>
						<Ionicons
							name="cloud-upload-outline"
							size={24}
							color={palette.primary}
						/>
						<View style={{ flex: 1 }}>
							<AppText.Heading>Sign in to backup and sync</AppText.Heading>
							<AppText.Caption color="muted" style={{ marginTop: 4 }}>
								Create an account to save your data to the cloud and use it on
								other devices.
							</AppText.Caption>
						</View>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={palette.textSubtle}
						/>
					</View>
				</AppCard>
			</ScrollView>
		</View>
	);
}

/* ---------------------------- Profile content (requires ProfileProvider) ---------------------------- */

function ProfileContent() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { logout, user, firebaseUser } = useAuth();
	const { profile } = useProfile();

	const displayName = useMemo(() => {
		if (profile?.firstName || profile?.lastName) {
			return (
				[profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
				'User'
			);
		}
		return firebaseUser?.displayName || 'User';
	}, [profile, firebaseUser]);

	const email = user?.email || firebaseUser?.email || '';
	const initials = useMemo(() => {
		const parts = displayName.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0]! + parts[parts.length - 1]![0]).toUpperCase();
		}
		return displayName.slice(0, 2).toUpperCase();
	}, [displayName]);

	const completion = useMemo(
		() => getProfileCompletion(profile, email),
		[profile, email],
	);

	// Go to onboarding/edit screens (profile, income, savings, debt)
	const handleEditName = () => router.push('/(onboarding)/edit/profile');
	const handleEditPhone = () => router.push('/(onboarding)/edit/profile');
	const handleEditFinancial = () => router.push('/(onboarding)/edit');
	const handleEditExpenses = () => router.push('/(onboarding)/edit');

	const handleEditProfile = handleEditName; // Edit button → name
	const handleFinishProfile = handleEditFinancial; // Finish → income/money
	const handleSetPhone = handleEditPhone;
	// DEV only: full onboarding flow for testing
	const handleOpenOnboarding = () => router.push('/(onboarding)/profileSetup');

	const handleUpdateMoney = () => router.push('/(tabs)/transaction');
	const handleDashboard = () => router.push('/(tabs)/dashboard');
	const handleExportData = () => {
		// MVP: Export screen may not exist - show placeholder
		Alert.alert(
			'Export data',
			'Back up your profile and transactions. This feature is coming soon.',
			[{ text: 'OK' }],
		);
	};

	const handleLogout = async () => {
		try {
			await logout();
		} catch {
			// ignore
		}
	};

	/* ---------- Authenticated: Profile MVP ---------- */

	const savings = profile?.savings ?? 0;
	const debt = profile?.debt ?? 0;
	const expenses = profile?.expenses ?? {
		housing: 0,
		loans: 0,
		subscriptions: 0,
	};
	const housingLabel =
		expenses.housing > 0 ? `Housing ${currency(expenses.housing)}` : 'Not set';
	const moneyValue = `${currency(savings)} • ${currency(debt)}`;

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<View style={styles.headerLeft} />
				<AppText.Title style={styles.headerTitle}>Profile</AppText.Title>
				<View style={styles.headerRight} />
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + space.xxl },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* User Profile Summary Card */}
				<AppCard style={styles.profileCard} padding={space.lg}>
					<View style={styles.profileSummary}>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>{initials}</Text>
						</View>
						<View style={styles.profileInfo}>
							<AppText.Heading>{displayName}</AppText.Heading>
							<AppText.Caption color="muted" style={styles.profileEmail}>
								{email || 'No email'}
							</AppText.Caption>
							<AppText.Caption color="primary" style={styles.completionText}>
								{completion.percent}% • {completion.fieldsLeft} fields left
							</AppText.Caption>
						</View>
						<AppButton
							label="Edit"
							variant="primary"
							size="sm"
							icon="pencil-outline"
							iconPosition="left"
							onPress={handleEditProfile}
							style={styles.editButton}
						/>
					</View>
				</AppCard>

				{/* Profile Completion Progress Card */}
				<AppCard style={styles.completionCard} padding={space.lg}>
					<AppText.Heading style={styles.completionTitle}>
						Finish your profile
					</AppText.Heading>
					<View style={styles.progressBar}>
						<View
							style={[styles.progressFill, { width: `${completion.percent}%` }]}
						/>
					</View>
					<View style={styles.completionButtons}>
						<AppButton
							label="Set your phone"
							variant="secondary"
							size="sm"
							onPress={handleSetPhone}
							style={styles.completionSecondary}
						/>
						<AppButton
							label="Finish profile"
							variant="primary"
							size="sm"
							onPress={handleFinishProfile}
							style={styles.completionPrimary}
						/>
					</View>
				</AppCard>

				{/* DEV: Onboarding access */}
				{isDevMode && (
					<View style={styles.section}>
						<AppText.Label color="subtle" style={styles.sectionTitle}>
							DEV
						</AppText.Label>
						<AppCard padding={space.lg}>
							<AppText.Caption color="muted" style={{ marginBottom: space.sm }}>
								Open full onboarding flow for testing
							</AppText.Caption>
							<AppButton
								label="Open Onboarding"
								variant="secondary"
								size="sm"
								icon="layers-outline"
								iconPosition="left"
								onPress={handleOpenOnboarding}
							/>
						</AppCard>
					</View>
				)}

				{/* PROFILE Section - each row goes directly to its edit screen */}
				<View style={styles.section}>
					<AppText.Label color="subtle" style={styles.sectionTitle}>
						PROFILE
					</AppText.Label>
					<AppCard padding={0} borderRadius={radius.lg}>
						<AppRow
							icon="person-outline"
							label="Name"
							right={<AppText.Body>{displayName}</AppText.Body>}
							onPress={handleEditName}
						/>
						<AppRow
							icon="call-outline"
							label="Contact"
							right={
								<AppText.Body numberOfLines={1}>
									{email || 'Not set'}
								</AppText.Body>
							}
							onPress={handleEditPhone}
						/>
						<AppRow
							icon="cash-outline"
							label="Money"
							right={<AppText.Body>{moneyValue}</AppText.Body>}
							onPress={handleEditFinancial}
						/>
						<AppRow
							icon="wallet-outline"
							label="Expenses"
							right={<AppText.Body>{housingLabel}</AppText.Body>}
							onPress={handleEditExpenses}
						/>
						<AppRow
							icon="card-outline"
							label="Other financial details"
							right={<AppText.Body>Debt: {currency(debt)}</AppText.Body>}
							bordered={false}
							onPress={handleEditFinancial}
						/>
					</AppCard>
				</View>

				{/* QUICK ACTIONS */}
				<View style={styles.section}>
					<AppText.Label color="subtle" style={styles.sectionTitle}>
						QUICK ACTIONS
					</AppText.Label>
					<View style={styles.quickActions}>
						<TouchableOpacity
							style={styles.quickActionCard}
							onPress={handleUpdateMoney}
							activeOpacity={0.7}
						>
							<View
								style={[
									styles.quickActionIcon,
									{ backgroundColor: palette.successSubtle },
								]}
							>
								<Ionicons
									name="cash-outline"
									size={24}
									color={palette.success}
								/>
							</View>
							<AppText.Heading style={styles.quickActionTitle}>
								Update money
							</AppText.Heading>
							<AppText.Caption color="muted">
								Income, savings, expenses
							</AppText.Caption>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.quickActionCard}
							onPress={handleDashboard}
							activeOpacity={0.7}
						>
							<View
								style={[
									styles.quickActionIcon,
									{ backgroundColor: palette.primarySubtle },
								]}
							>
								<Ionicons
									name="grid-outline"
									size={24}
									color={palette.primary}
								/>
							</View>
							<AppText.Heading style={styles.quickActionTitle}>
								Dashboard
							</AppText.Heading>
							<AppText.Caption color="muted">View transactions</AppText.Caption>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.quickActionCard}
							onPress={handleExportData}
							activeOpacity={0.7}
						>
							<View
								style={[
									styles.quickActionIcon,
									{ backgroundColor: palette.primarySoft },
								]}
							>
								<Ionicons
									name="cloud-upload-outline"
									size={24}
									color={palette.primary}
								/>
							</View>
							<AppText.Heading style={styles.quickActionTitle}>
								Export data
							</AppText.Heading>
							<AppText.Caption color="muted">Backup profile</AppText.Caption>
						</TouchableOpacity>
					</View>
				</View>

				{/* Logout & Delete Account */}
				<View style={styles.logoutContainer}>
					<AppButton
						label="Logout"
						variant="secondary"
						icon="log-out-outline"
						iconPosition="left"
						onPress={handleLogout}
						fullWidth
					/>
					<TouchableOpacity
						style={styles.deleteAccountButton}
						onPress={() =>
							Alert.alert(
								'Delete account',
								'Account deletion is not available yet. Contact support if you need help.',
								[{ text: 'OK' }]
							)
						}
						activeOpacity={0.8}
					>
						<Text style={styles.deleteAccountText}>Delete account</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

/* ---------------------------- Main export ---------------------------- */

export default function ProfileScreen() {
	const { user } = useAuth();
	return (
		<ErrorBoundary>{!user ? <SignInView /> : <ProfileContent />}</ErrorBoundary>
	);
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	headerLeft: { width: 40 },
	headerTitle: { flex: 1, textAlign: 'center' },
	headerRight: {
		width: 40,
		alignItems: 'flex-end',
	},
	content: {
		paddingHorizontal: space.lg,
		paddingTop: space.lg,
	},
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.lg,
		gap: space.lg,
	},
	signInPrompt: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	profileCard: {
		marginBottom: 0,
	},
	profileSummary: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: space.md,
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		...type.titleMd,
		color: palette.primaryTextOn,
	},
	profileInfo: {
		flex: 1,
		justifyContent: 'center',
	},
	profileEmail: {
		marginTop: 2,
	},
	completionText: {
		marginTop: 4,
	},
	editButton: {
		alignSelf: 'center',
	},
	completionCard: {
		marginBottom: 0,
	},
	completionTitle: {
		marginBottom: space.sm,
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
		backgroundColor: palette.track,
		overflow: 'hidden',
		marginBottom: space.md,
	},
	progressFill: {
		height: '100%',
		backgroundColor: palette.primary,
		borderRadius: 4,
	},
	completionButtons: {
		flexDirection: 'row',
		gap: space.sm,
	},
	completionSecondary: {
		flex: 1,
	},
	completionPrimary: {
		flex: 1,
	},
	section: {
		marginTop: 0,
	},
	sectionTitle: {
		marginBottom: space.xs,
	},
	logoutContainer: {
		marginTop: space.lg,
		gap: space.sm,
	},
	deleteAccountButton: {
		paddingVertical: space.sm,
		alignItems: 'center',
	},
	deleteAccountText: {
		...type.small,
		color: palette.danger,
		fontWeight: '600',
	},
	quickActions: {
		flexDirection: 'row',
		gap: space.sm,
	},
	quickActionCard: {
		flex: 1,
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		padding: space.md,
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
	},
	quickActionIcon: {
		width: 48,
		height: 48,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: space.sm,
	},
	quickActionTitle: {
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 2,
	},
});
