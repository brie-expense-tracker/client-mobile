import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function CookiePolicyScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Cookie Policy' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Cookie Policy</Text>
				<Text style={styles.muted}>Last Updated: June 24, 2025</Text>

				<Section title="1. Do We Use Cookies in the Mobile App?">
					<Paragraph>
						While traditional browser cookies are not used within Brie Finance,
						we do employ similar technologies such as Secure Local Storage,
						AsyncStorage, Firebase Session Tokens, Expo SecureStore, and
						analytics SDKs. These technologies help the app remember your
						preferences, authentication status, and performance data.
					</Paragraph>
				</Section>

				<Section title="2. What We Use Them For">
					<Bullet>Keep you signed in between sessions</Bullet>
					<Bullet>
						Store your AI‑generated financial suggestions securely
					</Bullet>
					<Bullet>
						Remember default settings (e.g., goal sort order, theme)
					</Bullet>
					<Bullet>
						Measure app usage, crash reports, and feature engagement
					</Bullet>
					<Bullet>Provide localized experiences</Bullet>
					<Paragraph>
						Brie Finance does <Text style={styles.bold}>not</Text> use
						third‑party advertising cookies.
					</Paragraph>
				</Section>

				<Section title="3. Third‑Party SDKs and Services">
					<Paragraph>
						We integrate with trusted services that may store identifiers or
						session data according to their own privacy policies, including
						Firebase Authentication, Firebase Analytics, the OpenAI ChatGPT API,
						and Expo SecureStore.
					</Paragraph>
				</Section>

				<Section title="4. Your Choices">
					<Bullet>Sign out to clear authentication tokens</Bullet>
					<Bullet>Clear app data in your device settings</Bullet>
					<Bullet>
						Disable analytics tracking in the Settings menu (coming soon)
					</Bullet>
					<Paragraph>
						Uninstalling and reinstalling the app will reset local storage and
						remove persistent tokens.
					</Paragraph>
				</Section>

				<Section title="5. Changes to This Policy">
					<Paragraph>
						We may update this Cookie Policy to reflect changes in technology or
						regulation. We will notify users via in‑app messages or update logs
						when significant changes occur.
					</Paragraph>
				</Section>

				<Section title="6. Contact Us">
					<Paragraph>
						If you have any questions or concerns about our use of cookie‑like
						technologies, please contact us at{' '}
						<Text style={styles.bold}>support@briefinance.com</Text>.
					</Paragraph>
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

/* ---------------- Helper Components ---------------- */
const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<View style={styles.section}>
		<Text style={styles.h2}>{title}</Text>
		{children}
	</View>
);

const Paragraph = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.p}>{children}</Text>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.bullet}>
		{'\u2022'} {children}
	</Text>
);

/* --------------------- Styles --------------------- */
const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: {
		paddingHorizontal: 24,
		paddingBottom: 48,
	},
	h1: {
		fontSize: 24,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 8,
	},
	h2: {
		fontSize: 18,
		fontWeight: '600',
		marginTop: 24,
		marginBottom: 6,
	},
	p: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
	bullet: { fontSize: 14, lineHeight: 20, marginLeft: 12, marginBottom: 4 },
	muted: { color: '#666', fontSize: 12, marginBottom: 16 },
	bold: { fontWeight: '700' },
	section: { marginBottom: 4 },
});
