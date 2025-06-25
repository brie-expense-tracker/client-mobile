import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function DisclaimerScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Disclaimer' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Important Disclaimers & Limitations</Text>
				<Text style={styles.muted}>Last Updated: June 24, 2025</Text>

				<Section title="1. Not Financial Advice">
					<Paragraph>
						Brie Finance is an <Text style={styles.bold}>educational</Text> and
						<Text style={styles.bold}> informational</Text> tool only. The
						AI‑generated insights provided by ChatGPT should{' '}
						<Text style={styles.bold}>not</Text> be construed as financial,
						investment, tax, or legal advice. Always consult a qualified
						professional before making financial decisions.
					</Paragraph>
				</Section>

				<Section title="2. No Investment Services or Banking">
					<Paragraph>
						Brie Finance is <Text style={styles.bold}>not</Text> a bank,
						broker‑dealer, or investment advisor and does not hold custody of
						your funds. All banking or investing actions you take happen outside
						the App and are solely your responsibility.
					</Paragraph>
				</Section>

				<Section title="3. AI and Data Accuracy">
					<Paragraph>
						Our AI suggestions rely on the data you enter and third‑party APIs.
						We cannot guarantee that this data is complete, current, or
						error‑free. Results may vary and past performance does not guarantee
						future outcomes.
					</Paragraph>
				</Section>

				<Section title="4. Limitation of Liability">
					<Paragraph>
						To the fullest extent permitted by law, Brie Finance and its
						affiliates will
						<Text style={styles.bold}> not</Text> be liable for any direct,
						indirect, incidental, or consequential damages arising out of your
						use of the App or reliance on AI suggestions.
					</Paragraph>
				</Section>

				<Section title="5. Third‑Party Content & Links">
					<Paragraph>
						The App may reference or link to third‑party content. Brie Finance
						does not endorse or take responsibility for any third‑party
						products, services, or information.
					</Paragraph>
				</Section>

				<Section title="6. User Responsibility">
					<Paragraph>
						You are solely responsible for verifying the accuracy of your inputs
						and for the decisions you make based on the App’s output. Use Brie
						Finance at your own risk.
					</Paragraph>
				</Section>

				<Section title="7. Updates to This Disclaimer">
					<Paragraph>
						We may modify this Disclaimer to reflect changes in law or App
						features. Continued use after updates signifies acceptance of the
						revised terms.
					</Paragraph>
				</Section>

				<Section title="8. Contact Us">
					<Paragraph>
						Questions? Email us at{' '}
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

/* --------------------- Styles --------------------- */
const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { paddingHorizontal: 24, paddingBottom: 48 },
	h1: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8 },
	h2: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 6 },
	p: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
	muted: { color: '#666', fontSize: 12, marginBottom: 16 },
	bold: { fontWeight: '700' },
	section: { marginBottom: 4 },
});
