import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen, AppText, AppButton } from '../../src/ui/primitives';
import { space } from '../../src/ui/theme';

/**
 * Web `Inbox` is the review queue for drafts. Mobile MVP routes history here;
 * aligns IA with `apps/web` sidebar without requiring the same server surface.
 */
export default function InboxScreen() {
	const router = useRouter();

	return (
		<AppScreen edges={['top']} scrollable>
			<View style={styles.block}>
				<AppText.Title style={styles.title}>Inbox</AppText.Title>
				<AppText.Body color="muted" style={styles.body}>
					On web, Inbox is where you confirm drafts. On mobile, saved cash
					entries live in History — open it to review or edit.
				</AppText.Body>
				<AppButton
					label="Open history"
					variant="primary"
					fullWidth
					onPress={() => router.push('/(tabs)/dashboard/ledger')}
					style={styles.cta}
				/>
				<AppButton
					label="Quick capture"
					variant="secondary"
					fullWidth
					onPress={() => router.push('/(tabs)/transaction')}
					style={styles.ctaSecondary}
				/>
			</View>
		</AppScreen>
	);
}

const styles = StyleSheet.create({
	block: {
		paddingTop: space.sm,
	},
	title: {
		marginBottom: space.sm,
	},
	body: {
		marginBottom: space.xl,
		lineHeight: 22,
	},
	cta: {
		marginBottom: space.sm,
	},
	ctaSecondary: {},
});
