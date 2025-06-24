import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
	return (
		<View style={styles.container}>
			{/* This tells Expo Router to label the header */}
			<Stack.Screen options={{ title: 'Privacy Policy' }} />

			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<Text style={styles.smallMuted}>Effective Date: 06/19/2025</Text>

				<Section title="1. Information We Collect">
					<Bullet>
						Personal Information (name, e-mail, optional profile details)
					</Bullet>
					<Bullet>Financial Data (income, expenses, budgets, notes)</Bullet>
					<Bullet>Usage Data (feature interactions, preferences)</Bullet>
					<Bullet>AI Input Data (prompts & responses sent to ChatGPT)</Bullet>
				</Section>

				<Section title="2. How We Use Your Information">
					<Paragraph>
						We track spending, generate AI insights, and improve app
						performance. Data is <Text style={styles.bold}>never sold</Text>.
					</Paragraph>
				</Section>

				<Section title="3. How AI Is Used">
					<Paragraph>
						Your prompts are sent securely to OpenAI’s API, processed
						<Text style={styles.bold}> transiently</Text>, and are{' '}
						<Text style={styles.bold}>not</Text> stored by the model for
						training.
					</Paragraph>
				</Section>

				<Section title="4. Data Security">
					<Paragraph>
						Data is encrypted in transit &amp; at rest, protected by secure
						access controls, and audited regularly.
					</Paragraph>
				</Section>

				<Section title="5. Data Sharing &amp; Third Parties">
					<Paragraph>
						Shared only with vetted providers (OpenAI for suggestions, cloud
						database for storage). No advertising partners.
					</Paragraph>
				</Section>

				<Section title="6. Your Rights">
					<Paragraph>
						Export, correct, or delete your data at any time. Opt-out of AI
						suggestions in Settings.
					</Paragraph>
				</Section>

				<Section title="7. Data Retention">
					<Paragraph>
						Data is retained while your account is active. Deleting your account
						wipes data within 30 days.
					</Paragraph>
				</Section>

				<Section title="8. Children’s Privacy">
					<Paragraph>Service not intended for users under 13.</Paragraph>
				</Section>

				<Section title="9. Updates">
					<Paragraph>
						We’ll notify you in-app of material changes and update the
						“Effective Date.”
					</Paragraph>
				</Section>

				<Section title="10. Contact">
					<Paragraph>
						Email us at <Text style={styles.link}>brie@gmail.com</Text>
					</Paragraph>
				</Section>
			</ScrollView>
		</View>
	);
}

/* ---------- Re-usable helpers ---------- */

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
	return <Text style={styles.bullet}>• {children}</Text>;
}

const styles = StyleSheet.create({
	container: { padding: 24, gap: 16, backgroundColor: '#fff' },
	scrollContainer: { backgroundColor: '#fff' },
	h1: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
	h2: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
	p: { fontSize: 16, lineHeight: 22 },
	bullet: { fontSize: 16, lineHeight: 22, marginLeft: 12 },
	smallMuted: { fontSize: 14, color: '#666' },
	bold: { fontWeight: '600' },
	link: { color: '#007AFF' },
	section: { gap: 6 },
});
