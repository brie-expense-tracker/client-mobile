import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function TermsOfServiceScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			{/* If you’re using expo-router v3+, this gives the screen a title in the header */}
			<Stack.Screen options={{ title: 'Terms of Service' }} />

			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Brie Finance — Terms of Service</Text>
				<Text style={styles.muted}>Effective Date: (insert date)</Text>

				{/* 1. About */}
				<Section title="1. About Brie Finance">
					<Paragraph>
						Brie Finance (“<Text style={styles.bold}>we</Text>,” “
						<Text style={styles.bold}>our</Text>,” or “
						<Text style={styles.bold}>Brie</Text>”) is a mobile application that
						helps you track spending, set budgets, and receive AI-generated
						insights created with OpenAI’s GPT model (“ChatGPT”). We store your
						financial data in an encrypted MongoDB database and process it—after
						removing direct identifiers—to generate personalized suggestions.
					</Paragraph>
				</Section>

				{/* 2. Acceptance */}
				<Section title="2. Acceptance of Terms">
					<Paragraph>
						By downloading, installing, or using Brie Finance you agree to be
						bound by these Terms and our Privacy Policy. If you do not accept
						the Terms, do not use the Service.
					</Paragraph>
				</Section>

				{/* 3. Eligibility & Accounts */}
				<Section title="3. Accounts & Eligibility">
					<Paragraph>
						You may create an account with an email/password or a supported
						third-party provider (currently Google). Users under 13 must obtain
						verifiable parental consent pursuant to the Children’s Online
						Privacy Protection Act (COPPA). You are responsible for maintaining
						the confidentiality of your credentials and for activity that occurs
						under your account.
					</Paragraph>
				</Section>

				{/* 4. AI-Generated Suggestions */}
				<Section title="4. AI-Generated Suggestions">
					<Paragraph>
						Suggestions and insights are produced by ChatGPT based on your
						anonymized transaction data and stated goals. These outputs are for
						informational purposes only and do not constitute financial, legal,
						or tax advice. Always consult a qualified professional before making
						financial decisions.
					</Paragraph>
				</Section>

				{/* 5. Data Use & Privacy */}
				<Section title="5. Data Use & Privacy">
					<Paragraph>
						We collect and store your expense, budget, and goal data to operate
						the Service. Before any data is sent to OpenAI’s API, direct
						personal identifiers are removed or replaced with hash values. Full
						details are available in our Privacy Policy.
					</Paragraph>
				</Section>

				{/* 6. Payments */}
				<Section title="6. Fees & Payments">
					<Paragraph>
						Brie Finance is currently provided free of charge. We may introduce
						premium features in the future; if so, we will update these Terms
						and give advance notice before any charges apply.
					</Paragraph>
				</Section>

				{/* 7. Prohibited Conduct */}
				<Section title="7. Prohibited Conduct">
					<Paragraph>When using the Service, you agree not to:</Paragraph>
					<Bullet>Break any applicable law or regulation;</Bullet>
					<Bullet>
						Upload malicious code, attempt unauthorized access, or reverse
						engineer the app or its APIs;
					</Bullet>
					<Bullet>
						Misrepresent your identity or use the Service for fraudulent
						purposes.
					</Bullet>
				</Section>

				{/* 8. Suspension / Termination */}
				<Section title="8. Suspension & Termination">
					<Paragraph>
						We may suspend or terminate your access without notice if you breach
						these Terms, misuse the Service, or create risk for other users.
					</Paragraph>
				</Section>

				{/* 9. Disclaimers */}
				<Section title="9. Disclaimers">
					<Paragraph>
						The Service is provided “as is” and “as available” without
						warranties of any kind. We do not warrant the accuracy or
						completeness of AI-generated content.
					</Paragraph>
				</Section>

				{/* 10. Limitation of Liability */}
				<Section title="10. Limitation of Liability">
					<Paragraph>
						To the maximum extent permitted by law, Brie Finance and its
						affiliates will not be liable for any indirect, incidental,
						consequential, or punitive damages arising from your use of, or
						inability to use, the Service.
					</Paragraph>
				</Section>

				{/* 11. Changes */}
				<Section title="11. Changes to Terms">
					<Paragraph>
						We may update these Terms at any time. Material changes will be
						communicated via the app or email. Continued use after changes means
						you accept the new Terms.
					</Paragraph>
				</Section>

				{/* 12. Governing Law */}
				<Section title="12. Governing Law & Venue">
					<Paragraph>
						These Terms and any dispute arising hereunder are governed by the
						laws of the State of California, without regard to its conflict of
						law provisions. You consent to exclusive jurisdiction in the state
						and federal courts of San Diego County, California.
					</Paragraph>
				</Section>

				{/* 13. Contact */}
				<Section title="13. Contact Us">
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
