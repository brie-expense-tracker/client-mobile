import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Privacy Policy' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Brie Finance – Privacy Policy</Text>
				<Text style={styles.muted}>Last Updated: June 24, 2025</Text>

				<Section title="1. What We Collect">
					<Bullet>Account info (email, login method)</Bullet>
					<Bullet>Financial data (budgets, expenses, income, goals)</Bullet>
					<Bullet>App usage data (like login timestamps)</Bullet>
				</Section>

				<Section title="2. How We Use Your Data">
					<Bullet>To generate AI-powered financial suggestions</Bullet>
					<Bullet>To improve and maintain the app</Bullet>
					<Bullet>To respond to support requests</Bullet>
				</Section>

				<Section title="3. Use of AI & Data Sharing">
					<Paragraph>
						We use ChatGPT (via OpenAI API) to provide suggestions. Before any
						data is shared, it is anonymized to remove names, emails, or direct
						identifiers.
					</Paragraph>
					<Paragraph>
						We do not share your data with advertisers or third-party marketers.
					</Paragraph>
				</Section>

				<Section title="4. Data Storage & Security">
					<Paragraph>
						Your data is stored securely in an encrypted MongoDB Atlas database.
						We follow industry-standard practices to prevent unauthorized
						access.
					</Paragraph>
				</Section>

				<Section title="5. Your Rights (CCPA)">
					<Bullet>Access your data</Bullet>
					<Bullet>Request data deletion</Bullet>
					<Bullet>Opt out of processing (may affect features)</Bullet>
					<Paragraph>
						Email us at <Text style={styles.bold}>support@briefinance.com</Text>{' '}
						to exercise your rights.
					</Paragraph>
				</Section>

				<Section title="6. Children's Privacy">
					<Paragraph>
						Brie Finance does not knowingly collect data from children under 13
						without guardian consent. We delete any such data immediately upon
						discovery.
					</Paragraph>
				</Section>

				<Section title="7. Data Retention">
					<Paragraph>
						We retain data as long as your account is active or necessary to
						deliver the service. You may request deletion at any time.
					</Paragraph>
				</Section>

				<Section title="8. Policy Updates">
					<Paragraph>
						We may update this Privacy Policy. You’ll be notified of significant
						changes via email or in-app alerts.
					</Paragraph>
				</Section>

				<Section title="9. Contact Us">
					<Paragraph>
						Questions? Reach us at{' '}
						<Text style={styles.bold}>support@briefinance.com</Text>.
					</Paragraph>
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

/* ---------- Helper Components ---------- */

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.h2}>{title}</Text>
			{children}
		</View>
	);
}

function Paragraph({ children }: { children: React.ReactNode }) {
	return <Text style={styles.p}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
	return (
		<Text style={styles.bullet}>
			{'\u2022'} {children}
		</Text>
	);
}

/* ---------- Styles ---------- */

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
