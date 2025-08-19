import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	SafeAreaView,
	TouchableOpacity,
	Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpAndAboutScreen() {
	const router = useRouter();

	const faqItems = [
		{
			question: 'How do I create a budget?',
			answer:
				'Go to the Budgets tab and tap "Add Budget". Set your spending limit and category, then start tracking your expenses.',
		},
		{
			question: 'How does AI coaching work?',
			answer:
				'Our AI analyzes your spending patterns and provides personalized tips to help you save money and reach your financial goals.',
		},
		{
			question: 'Can I sync with my bank account?',
			answer:
				"Currently, you need to manually enter transactions. We're working on bank integration for future updates.",
		},
		{
			question: 'How do I set financial goals?',
			answer:
				'Navigate to the Goals section and tap "Add Goal". Set your target amount and timeline, then track your progress.',
		},
	];

	const handleContactSupport = () => {
		Linking.openURL('mailto:support@brie-app.com');
	};

	const handlePrivacyPolicy = () => {
		router.push('/(stack)/settings/legal');
	};

	const handleTermsOfService = () => {
		router.push('/(stack)/settings/legal');
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView}>
				{/* About Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>About Brie</Text>
					<Text style={styles.aboutText}>
						Brie is your personal financial companion, designed to help you
						build better money habits through intelligent budgeting, goal
						tracking, and AI-powered insights.
					</Text>
					<Text style={styles.versionText}>Version 1.0.0</Text>
				</View>

				{/* FAQ Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
					{faqItems.map((item, index) => (
						<View key={index} style={styles.faqItem}>
							<Text style={styles.question}>{item.question}</Text>
							<Text style={styles.answer}>{item.answer}</Text>
						</View>
					))}
				</View>

				{/* Legal Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Legal</Text>
					<TouchableOpacity
						style={styles.legalItem}
						onPress={handlePrivacyPolicy}
					>
						<Text style={styles.legalText}>Privacy Policy</Text>
						<Ionicons name="chevron-forward" size={20} color="#6b7280" />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.legalItem}
						onPress={handleTermsOfService}
					>
						<Text style={styles.legalText}>Terms of Service</Text>
						<Ionicons name="chevron-forward" size={20} color="#6b7280" />
					</TouchableOpacity>
				</View>

				{/* Contact Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Get Help</Text>
					<TouchableOpacity
						style={styles.contactButton}
						onPress={handleContactSupport}
					>
						<Ionicons name="mail-outline" size={20} color="#fff" />
						<Text style={styles.contactButtonText}>Contact Support</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollView: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 40,
	},
	section: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	aboutText: {
		fontSize: 16,
		color: '#4b5563',
		lineHeight: 24,
		marginBottom: 12,
	},
	versionText: {
		fontSize: 14,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	faqItem: {
		marginBottom: 20,
	},
	question: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	answer: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	legalItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	legalText: {
		fontSize: 16,
		color: '#333',
	},
	contactButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0095FF',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		gap: 8,
	},
	contactButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
