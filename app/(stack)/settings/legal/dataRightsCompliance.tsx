import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function DataRightsComplianceScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Data Rights & Compliance' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Data Rights & Compliance</Text>
				<Text style={styles.muted}>Last Updated: June 24, 2025</Text>

				{/* ---------- 1. CCPA / CPRA (California) ---------- */}
				<Section title="1. CCPA/CPRA Rights (California, USA)">
					<Bullet number={1}>Right to Know</Bullet>
					<Paragraph>
						California residents have the right to request information about the
						categories and specific pieces of personal data collected, used,
						disclosed, or sold.
					</Paragraph>

					<Bullet number={2}>Right to Delete</Bullet>
					<Paragraph>
						You have the right to request deletion of personal data we&apos;ve
						collected from you, subject to certain exceptions such as completing
						a transaction or complying with a legal obligation.
					</Paragraph>

					<Bullet number={3}>Right to Correct</Bullet>
					<Paragraph>
						You may request correction of inaccurate personal data we maintain
						about you.
					</Paragraph>

					<Bullet number={4}>Right to Opt Out of Sale/Share</Bullet>
					<Paragraph>
						California residents can opt out of the sale or sharing of their
						personal data with third parties.
					</Paragraph>

					<Bullet number={5}>Right to Non-Discrimination</Bullet>
					<Paragraph>
						We will not discriminate against you for exercising any of your
						CCPA/CPRA rights, such as by denying services or charging different
						prices.
					</Paragraph>
				</Section>

				{/* ---------- 2. GDPR Safeguards ---------- */}
				<Section title="2. GDPR Safeguards & Oversight">
					<Paragraph>
						<Text style={styles.bold}>Data Protection Officer (DPO):</Text>{' '}
						Contact us at <Text style={styles.bold}>dpo@briefinance.com</Text>.
					</Paragraph>
					<Paragraph>
						<Text style={styles.bold}>International Transfers:</Text> We rely on
						Standard Contractual Clauses approved by the European Commission to
						transfer personal data securely.
					</Paragraph>
				</Section>

				{/* ---------- 3. GDPR Rights ---------- */}
				<Section title="3. GDPR Rights (European Union)">
					<Bullet number={1}>Right to Access (Art. 15)</Bullet>
					<Paragraph>
						You have the right to request confirmation as to whether or not your
						personal data is being processed, and access to that data—including
						the processing purposes and data categories involved.
					</Paragraph>

					<Bullet number={2}>Right to Rectification (Art. 16)</Bullet>
					<Paragraph>
						Request correction of inaccurate or incomplete personal data so it
						remains accurate and up-to-date.
					</Paragraph>

					<Bullet number={3}>
						Right to Erasure / &quot;Right to Be Forgotten&quot; (Art. 17)
					</Bullet>
					<Paragraph>
						Ask for deletion of personal data that is no longer necessary, where
						consent is withdrawn, or where processing is unlawful.
					</Paragraph>

					<Bullet number={4}>Right to Restrict Processing (Art. 18)</Bullet>
					<Paragraph>
						You may request restriction of processing while disputes over data
						accuracy or lawful use are resolved.
					</Paragraph>

					<Bullet number={5}>Right to Data Portability (Art. 20)</Bullet>
					<Paragraph>
						Receive your data in a structured, commonly used, machine-readable
						format and transmit it to another controller where technically
						feasible.
					</Paragraph>

					<Bullet number={6}>Right to Object (Art. 21)</Bullet>
					<Paragraph>
						Object to processing based on legitimate interests or for direct
						marketing purposes.
					</Paragraph>

					<Bullet number={7}>
						Rights in Automated Decision-Making (Art. 22)
					</Bullet>
					<Paragraph>
						Not be subject to decisions based solely on automated processing,
						including profiling, unless required for a contract or based on
						explicit consent.
					</Paragraph>

					<Bullet number={8}>Right to Withdraw Consent</Bullet>
					<Paragraph>
						Withdraw consent at any time without affecting processing that
						occurred prior to withdrawal.
					</Paragraph>

					<Paragraph>
						EEA residents may also lodge a complaint with their local
						Supervisory Authority.
					</Paragraph>
				</Section>

				{/* ---------- 4. Exercising Your Rights ---------- */}
				<Section title="4. Exercising Your Rights">
					<Paragraph>
						Send requests to{' '}
						<Text style={styles.bold}>privacy@briefinance.com</Text>. We may
						need to verify your identity. Responses arrive within 30 days (GDPR)
						or 45 days (CCPA/CPRA).
					</Paragraph>
					<Paragraph>
						You can also appoint an authorized agent with written permission.
					</Paragraph>
				</Section>

				{/* ---------- 5. Cross-Border Transfers ---------- */}
				<Section title="5. Cross-Border Transfers">
					<Paragraph>
						Brie Finance is headquartered in California, USA. All data is
						processed using industry-standard security measures, and we assess
						adequacy for each transfer destination.
					</Paragraph>
				</Section>

				{/* ---------- 6. Contact ---------- */}
				<Section title="6. Contact">
					<Paragraph>
						Questions? Email{' '}
						<Text style={styles.bold}>privacy@briefinance.com</Text> or contact
						our DPO at <Text style={styles.bold}>dpo@briefinance.com</Text>.
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

const Bullet = ({
	children,
	number,
}: {
	children: React.ReactNode;
	number: number;
}) => (
	<Text style={styles.bullet}>
		{number}. {children}
	</Text>
);

/* --------------------- Styles --------------------- */
const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { paddingHorizontal: 24, paddingBottom: 48 },
	h1: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8 },
	h2: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 6 },
	p: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
	bullet: { fontSize: 14, lineHeight: 20, marginLeft: 12, marginBottom: 4 },
	muted: { color: '#666', fontSize: 12, marginBottom: 16 },
	bold: { fontWeight: '700' },
	section: { marginBottom: 4 },
});
