import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
	AppScreen,
	AppText,
	AppButton,
	AppCard,
} from '../../src/ui/primitives';
import { palette, space, type } from '../../src/ui/theme';

/**
 * Web `Inbox` is the review queue for drafts. Mobile uses the same IA label;
 * confirm/review for saved entries is History (ledger). Week & Export match web
 * sidebar destinations.
 */
export default function InboxScreen() {
	const router = useRouter();

	return (
		<AppScreen edges={['top']} scrollable>
			<View style={styles.stickyHeader}>
				<View style={styles.pageHeaderTitleRow}>
					<View style={styles.pageHeaderTitleAccent} />
					<AppText.Title
						style={styles.pageHeaderTitle}
						accessibilityRole="header"
					>
						Inbox
					</AppText.Title>
				</View>
				<AppText.Body color="muted" style={styles.pageHeaderDescription}>
					Confirm drafts on web; on mobile your saved cash flow lives in
					History. Use Week for a 7-day rollup and Export when you need a file.
				</AppText.Body>
			</View>

			<AppCard
				padding={space.lg}
				bordered
				style={styles.callout}
				backgroundColor="rgba(245, 158, 11, 0.08)"
			>
				<View style={styles.calloutRow}>
					<Ionicons
						name="information-circle-outline"
						size={22}
						color={palette.warningStrong}
					/>
					<View style={styles.calloutCopy}>
						<AppText.Body style={styles.calloutTitle} color="warning">
							How this maps to web
						</AppText.Body>
						<AppText.Caption color="muted" style={styles.calloutBody}>
							Week totals assume drafts are confirmed — anything pending on web
							Inbox is excluded from category splits until you confirm there.
						</AppText.Caption>
					</View>
				</View>
			</AppCard>

			<AppButton
				label="Open history"
				variant="primary"
				icon="list-outline"
				iconPosition="left"
				fullWidth
				onPress={() => router.push('/(tabs)/dashboard/ledger')}
				style={styles.cta}
			/>
			<AppButton
				label="This week"
				variant="secondary"
				icon="calendar-outline"
				iconPosition="left"
				fullWidth
				onPress={() => router.push('/(tabs)/dashboard/week')}
				style={styles.ctaSecondary}
			/>
			<AppButton
				label="Export data"
				variant="secondary"
				icon="download-outline"
				iconPosition="left"
				fullWidth
				onPress={() => router.push('/(tabs)/settings/export')}
				style={styles.ctaSecondary}
			/>
			<AppButton
				label="Quick capture"
				variant="ghost"
				icon="flash-outline"
				iconPosition="left"
				fullWidth
				onPress={() => router.push('/(tabs)/transaction')}
			/>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	stickyHeader: {
		marginBottom: space.lg,
	},
	pageHeaderTitleRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		marginBottom: space.sm,
		gap: space.sm,
	},
	pageHeaderTitleAccent: {
		width: 4,
		alignSelf: 'stretch',
		minHeight: 26,
		borderRadius: 2,
		backgroundColor: palette.primary,
		...(Platform.OS === 'ios'
			? {
					shadowColor: palette.primary,
					shadowOffset: { width: 0, height: 0 },
					shadowOpacity: 0.45,
					shadowRadius: 9,
				}
			: { elevation: 2 }),
	},
	pageHeaderTitle: {
		flex: 1,
		paddingRight: space.xs,
	},
	pageHeaderDescription: {
		...type.bodySm,
		lineHeight: 20,
	},
	callout: {
		borderColor: 'rgba(245, 158, 11, 0.25)',
		marginBottom: space.lg,
	},
	calloutRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: space.md,
	},
	calloutCopy: {
		flex: 1,
		minWidth: 0,
	},
	calloutTitle: {
		fontWeight: '600',
		marginBottom: space.xs,
	},
	calloutBody: {
		lineHeight: 18,
	},
	cta: {
		marginBottom: space.sm,
	},
	ctaSecondary: {
		marginBottom: space.sm,
	},
});
