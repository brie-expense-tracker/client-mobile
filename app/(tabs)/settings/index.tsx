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
import { isDevMode } from '../../../src/config/environment';
import { palette, radius, space, type } from '../../../src/ui/theme';
import { useProfile } from '../../../src/context/profileContext';
import { useNotification } from '../../../src/context/notificationContext';
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
	const handleSignInToSync = () => {
		router.push('/(auth)/login?from=settings');
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
	const { unreadCount } = useNotification();

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

	// Go to profile review hub (Review your details) or direct edit
	const handleEditName = () => router.push('/(onboarding)/edit');
	const handleEditFinancial = () => router.push('/(onboarding)/edit');
	const handleEditExpenses = () => router.push('/(onboarding)/edit');

	// DEV only: full onboarding flow for testing
	const handleOpenOnboarding = () => router.push('/(onboarding)/profileSetup');

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
	const expensesTotal =
		(expenses.housing ?? 0) + (expenses.loans ?? 0) + (expenses.subscriptions ?? 0);
	const expensesLabel =
		expensesTotal > 0 ? `${currency(expensesTotal)}/mo` : 'Not set';
	// Defensive: keep for stale bundle / hot reload; Money row was removed from UI
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

				{/* Notifications — opened from Profile instead of Dashboard */}
				<View style={styles.section}>
					<AppText.Label color="subtle" style={styles.sectionTitle}>
						NOTIFICATIONS
					</AppText.Label>
					<AppCard padding={0} borderRadius={radius.lg}>
						<AppRow
							icon="notifications-outline"
							label="Notifications"
							right={
								unreadCount > 0 ? (
									<View style={styles.notificationBadge}>
										<Text style={styles.notificationBadgeText}>
											{unreadCount > 99 ? '99+' : unreadCount}
										</Text>
									</View>
								) : undefined
							}
							bordered={false}
							onPress={() => router.push('/settings/notifications')}
						/>
					</AppCard>
				</View>

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
							icon="mail-outline"
							label="Email"
							right={
								<AppText.Body numberOfLines={1}>
									{email || 'Not set'}
								</AppText.Body>
							}
						/>
						<AppRow
							icon="wallet-outline"
							label="Expenses"
							right={<AppText.Body>{expensesLabel}</AppText.Body>}
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
								[{ text: 'OK' }],
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
		alignItems: 'center',
		justifyContent: 'flex-start',
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
		color: palette.textOnPrimary,
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
	section: {
		marginTop: 0,
	},
	sectionTitle: {
		marginBottom: space.xs,
	},
	notificationBadge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: palette.danger,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	notificationBadgeText: {
		color: palette.primaryTextOn,
		...type.labelXs,
		fontWeight: '700',
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
});
