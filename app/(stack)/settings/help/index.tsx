import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface FAQItem {
	id: number;
	question: string;
	answer: string;
}

export default function HelpScreen() {
	const router = useRouter();
	const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

	const faqData: FAQItem[] = [
		{
			id: 1,
			question: 'How do I add a new transaction?',
			answer:
				'Tap the "+" button on the main screen or go to the Transactions tab and tap "Add Transaction". Fill in the amount and description, then save.',
		},
		{
			id: 2,
			question: 'How can I set up fixed expenses?',
			answer:
				'Go to Settings > Fixed Expenses. Tap "Add Fixed Expense" and enter the details of your recurring expenses like rent, utilities, or subscriptions.',
		},
		{
			id: 3,
			question: 'How do I change my monthly income?',
			answer:
				'Go to Settings > Account > Financial Information. Tap on "Monthly Income" to update your income amount.',
		},
		{
			id: 4,
			question: 'Can I export my transaction data?',
			answer:
				'Yes! Go to Settings > Account > Account Management > Export Data. You can download your data in CSV format.',
		},
		{
			id: 5,
			question: 'How do I reset my password?',
			answer:
				'Go to Settings > Privacy & Security > Change Password. Follow the prompts to create a new password.',
		},
		{
			id: 6,
			question: 'Is my financial data secure?',
			answer:
				'Yes, we use bank-level encryption to protect your data. Your information is never shared with third parties without your consent.',
		},
	];

	const supportInfo = {
		email: 'support@brie.finance',
		website: 'https://brie.finance/support',
		phone: '+1 (555) 123-4567',
		hours: 'Monday - Friday, 9 AM - 6 PM EST',
	};

	const handleEmailSupport = () => {
		Linking.openURL(
			`mailto:${supportInfo.email}?subject=Support Request`
		).catch((err) => console.error('An error occurred', err));
	};

	const handleOpenWebsite = () => {
		Linking.openURL(supportInfo.website).catch((err) =>
			console.error('An error occurred', err)
		);
	};

	const handleCallSupport = () => {
		Linking.openURL(`tel:${supportInfo.phone}`).catch((err) =>
			console.error('An error occurred', err)
		);
	};

	const toggleFAQ = (id: number) => {
		setExpandedFAQ(expandedFAQ === id ? null : id);
	};

	return (
		<ScrollView
			style={styles.scrollView}
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.scrollContent}
			contentInsetAdjustmentBehavior="automatic"
		>
			{/* Quick Actions */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Quick Actions</Text>
				<View style={styles.quickActionsContainer}>
					<TouchableOpacity
						style={styles.quickActionCard}
						onPress={handleEmailSupport}
					>
						<Ionicons name="mail-outline" size={32} color="#0095FF" />
						<Text style={styles.quickActionText}>Email Support</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickActionCard}
						onPress={handleOpenWebsite}
					>
						<Ionicons name="globe-outline" size={32} color="#0095FF" />
						<Text style={styles.quickActionText}>Visit Website</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickActionCard}
						onPress={handleCallSupport}
					>
						<Ionicons name="call-outline" size={32} color="#0095FF" />
						<Text style={styles.quickActionText}>Call Support</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Contact Information */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Contact Information</Text>
				<View style={styles.settingsContainer}>
					<View style={styles.settingItem}>
						<Ionicons name="mail-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Email</Text>
							<Text style={styles.settingValue}>{supportInfo.email}</Text>
						</View>
					</View>

					<View style={styles.settingItem}>
						<Ionicons name="call-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Phone</Text>
							<Text style={styles.settingValue}>{supportInfo.phone}</Text>
						</View>
					</View>

					<View style={styles.settingItem}>
						<Ionicons name="time-outline" size={24} color="#555" />
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>Support Hours</Text>
							<Text style={styles.settingValue}>{supportInfo.hours}</Text>
						</View>
					</View>
				</View>
			</View>

			{/* FAQ Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
				<View style={styles.settingsContainer}>
					{faqData.map((faq) => (
						<TouchableOpacity
							key={faq.id}
							style={styles.faqItem}
							onPress={() => toggleFAQ(faq.id)}
						>
							<View style={styles.faqHeader}>
								<Text style={styles.faqQuestion}>{faq.question}</Text>
								<Ionicons
									name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#BEBEBE"
								/>
							</View>
							{expandedFAQ === faq.id && (
								<Text style={styles.faqAnswer}>{faq.answer}</Text>
							)}
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Troubleshooting */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Troubleshooting</Text>
				<View style={styles.settingsContainer}>
					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="refresh-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Reset App Data</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="sync-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Sync Data</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="bug-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Report a Bug</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Feedback */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Feedback</Text>
				<View style={styles.settingsContainer}>
					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="star-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Rate the App</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.settingItem}>
						<Ionicons name="chatbubble-outline" size={24} color="#555" />
						<Text style={styles.settingText}>Send Feedback</Text>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
					</TouchableOpacity>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#efefef',
	},
	stickyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
		// marginTop: 50,
		zIndex: 1000,
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingBottom: 20,
	},
	backButton: {
		width: 50,
		alignItems: 'flex-start',
	},
	headerText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 50,
		alignItems: 'flex-end',
	},
	section: {
		marginTop: 24,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
		paddingHorizontal: 4,
	},
	quickActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	quickActionCard: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
	},
	quickActionText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
		marginTop: 8,
		textAlign: 'center',
	},
	settingsContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	settingContent: {
		flex: 1,
		marginLeft: 12,
	},
	settingText: {
		fontSize: 16,
		color: '#333',
		marginBottom: 2,
	},
	settingValue: {
		fontSize: 14,
		color: '#666',
	},
	faqItem: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	faqHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	faqQuestion: {
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginRight: 12,
	},
	faqAnswer: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#efefef',
	},
});
