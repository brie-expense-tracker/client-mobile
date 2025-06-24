import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function LicenseAgreementScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'License Agreement' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>Brie Finance – License Agreement</Text>
				<Text style={styles.muted}>Effective Date: 23 June 2025</Text>

				<Section title="1. License Grant">
					<Paragraph>
						You are granted a limited, non-exclusive, non-transferable,
						revocable license to use Brie Finance on your device for personal,
						non-commercial use only.
					</Paragraph>
				</Section>

				<Section title="2. Restrictions">
					<Bullet>Do not copy, modify, or distribute the App.</Bullet>
					<Bullet>Do not reverse engineer or extract source code.</Bullet>
					<Bullet>
						Do not use it for commercial purposes without permission.
					</Bullet>
				</Section>

				<Section title="3. Intellectual Property">
					<Paragraph>
						All rights to the App, including design and content, belong to Brie
						Finance. This license does not give you ownership of the App.
					</Paragraph>
				</Section>

				<Section title="4. User Content">
					<Paragraph>
						You own your data. We only use it to operate and improve the App,
						including generating AI-based suggestions.
					</Paragraph>
				</Section>

				<Section title="5. AI Disclaimer">
					<Paragraph>
						Suggestions are powered by ChatGPT and are not professional advice.
						Use them at your discretion.
					</Paragraph>
				</Section>

				<Section title="6. Termination">
					<Paragraph>
						We may terminate your access if you violate these terms. You must
						stop using the App and delete it from your device.
					</Paragraph>
				</Section>

				<Section title="7. Updates">
					<Paragraph>
						We may modify the App or this Agreement. Continued use implies
						acceptance of changes.
					</Paragraph>
				</Section>

				<Section title="8. No Warranty">
					<Paragraph>
						The App is provided “as is.” We do not guarantee accuracy,
						availability, or performance.
					</Paragraph>
				</Section>

				<Section title="9. Limitation of Liability">
					<Paragraph>
						Brie Finance is not liable for any indirect or consequential damages
						related to your use of the App.
					</Paragraph>
				</Section>

				<Section title="10. Governing Law">
					<Paragraph>
						This Agreement is governed by California law. Legal disputes shall
						be resolved in San Diego County.
					</Paragraph>
				</Section>

				<Section title="11. Contact">
					<Paragraph>
						Questions? Contact us at{' '}
						<Text style={styles.bold}>support@briefinance.com</Text>.
					</Paragraph>
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

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
