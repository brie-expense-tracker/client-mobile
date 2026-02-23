import React from 'react';
import { logger } from '../../../src/utils/logger';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuth from '../../../src/context/AuthContext';
import { setUseLocalMode } from '../../../src/storage/localModeStorage';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';
import { useBriePro } from '../../../src/hooks/useBriePro';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	AppRow,
} from '../../../src/ui/primitives';

/* --------------------------------- UI --------------------------------- */

type Item = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	route?: string;
	onPress?: () => void;
	description?: string;
};

function Section({ title, items }: { title: string; items: Item[] }) {
	return (
		<View style={styles.section}>
			<AppText.Label color="subtle" style={styles.sectionTitle}>
				{title}
			</AppText.Label>

			<AppCard padding={0} borderRadius={12}>
				{items.map((item, index) => (
					<AppRow
						key={item.label}
						icon={item.icon}
						label={item.label}
						description={item.description}
						onPress={item.onPress}
						bordered={index < items.length - 1}
					/>
				))}
			</AppCard>
		</View>
	);
}

/* ---------------------------- Screen ---------------------------- */

export default function SettingsScreen() {
	const router = useRouter();
	const { logout, user } = useAuth();
	const { isPro } = useBriePro();

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			logger.error('Logout error:', error);
		}
	};

	const accountItems: Item[] = [
		{
			label: 'Profile',
			icon: 'person-outline',
			onPress: () => router.push('/(stack)/settings/profile'),
		},
		{
			label: 'Subscription',
			icon: 'card-outline',
			onPress: () => router.push('/(stack)/settings/subscription'),
		},
		{
			label: 'Onboarding',
			icon: 'rocket-outline',
			onPress: () => router.push('/(onboarding)/profileSetup'),
			description: 'Revisit the onboarding flow',
		},
	];

	const notificationItems: Item[] = [
		{
			label: 'Notifications',
			icon: 'notifications-outline',
			onPress: () => router.push('/(stack)/settings/notification'),
		},
	];

	const dataItems: Item[] = [
		{
			label: 'Data Export',
			icon: 'download-outline',
			description: 'Plus',
			onPress: () => router.push('/(stack)/settings/privacyandsecurity/downloadData'),
		},
	];

	const handleSignInToSync = async () => {
		await setUseLocalMode(false);
		router.replace('/(auth)/login');
	};

	return (
		<AppScreen>
			{/* Header */}
			<View style={styles.headerSection}>
				<AppText.Title>Settings</AppText.Title>
				<AppText.Subtitle color="subtle" style={styles.headerDescription}>
					Manage your account and preferences.
				</AppText.Subtitle>
			</View>

			{/* MVP: Sign in prompt when using local-only mode */}
			{!user && (
				<View style={styles.section}>
					<AppCard onPress={handleSignInToSync}>
						<View style={styles.signInPrompt}>
							<Ionicons name="cloud-upload-outline" size={24} color={palette.primary} />
							<View style={{ flex: 1 }}>
								<AppText.Heading>Sign in to backup and sync</AppText.Heading>
								<AppText.Caption color="muted" style={{ marginTop: 4 }}>
									Create an account to save your data to the cloud and use it on other devices.
								</AppText.Caption>
							</View>
							<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
						</View>
					</AppCard>
				</View>
			)}

			{/* Sections - only show when signed in */}
			{user && (
				<>
					<Section title="Account" items={accountItems} />
					<Section title="Notifications" items={notificationItems} />
					{isPro && <Section title="Data" items={dataItems} />}
				</>
			)}

			{/* Logout - only when signed in */}
			{user && (
				<View style={styles.logoutContainer}>
					<AppButton
						label="Logout"
						variant="secondary"
						icon="log-out-outline"
						iconPosition="left"
						onPress={handleLogout}
						fullWidth
					/>
				</View>
			)}
		</AppScreen>
	);
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
	/* Header */
	headerSection: {
		paddingHorizontal: space.sm,
		paddingTop: space.lg,
		paddingBottom: space.sm,
	},
	headerDescription: {
		marginTop: space.xs,
	},

	/* Sections */
	section: {
		marginHorizontal: space.sm,
		marginTop: space.md,
	},
	sectionTitle: {
		marginBottom: space.xs,
	},

	/* Legacy card for debug block (no row dividers) */
	cardNoRows: {
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space.md,
		...shadow.card,
	},

	/* Logout */
	logoutContainer: {
		marginTop: space.lg,
		marginBottom: space.xl,
	},

	/* Debug Toggle / Labs */
	debugRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: space.sm,
		paddingTop: space.sm,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
	},
	debugLabel: {
		fontSize: 14,
		fontWeight: '500',
	},
	debugValue: {
		fontSize: 12,
		fontWeight: '400',
		fontFamily: 'monospace',
	},
	debugValueContainer: {
		flex: 1,
		marginLeft: space.sm,
	},
	toggleButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		minWidth: 64,
		alignItems: 'center',
		borderWidth: 1,
	},
	toggleText: {
		fontSize: 12,
		fontWeight: '600',
	},
	signInPrompt: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	resetButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		backgroundColor: palette.dangerSubtle,
		minWidth: 64,
		alignItems: 'center',
	},
	resetText: {
		color: palette.danger,
		fontSize: 12,
		fontWeight: '600',
	},
	debugButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		backgroundColor: palette.primarySubtle,
		minWidth: 64,
		alignItems: 'center',
	},
	debugButtonText: {
		color: palette.primary,
		fontSize: 12,
		fontWeight: '600',
	},
});
