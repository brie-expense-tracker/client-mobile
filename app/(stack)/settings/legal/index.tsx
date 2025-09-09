import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

export default function LegalDocumentsScreen() {
	const router = useRouter();

	const legalDocuments = [
		{
			id: 'terms',
			title: 'Terms of Service',
			description: 'Our terms and conditions for using Brie',
			icon: 'document-text-outline',
			route: '/(stack)/settings/legal/terms',
		},
		{
			id: 'privacy',
			title: 'Privacy Policy',
			description: 'How we collect, use, and protect your data',
			icon: 'shield-checkmark-outline',
			route: '/(stack)/settings/legal/privacyPolicy',
		},
		{
			id: 'license',
			title: 'License Agreement',
			description: 'Software license and usage terms',
			icon: 'document-outline',
			route: '/(stack)/settings/legal/licenseAgreement',
		},
		{
			id: 'cookies',
			title: 'Cookie Policy',
			description: 'How we use cookies and similar technologies',
			icon: 'cafe-outline',
			route: '/(stack)/settings/legal/cookiePolicy',
		},
		{
			id: 'disclaimer',
			title: 'Disclaimer',
			description: 'Important disclaimers and limitations',
			icon: 'warning-outline',
			route: '/(stack)/settings/legal/disclaimer',
		},
		{
			id: 'dataRightsCompliance',
			title: 'Data Rights & Compliance',
			description: 'Your rights under GDPR and data protection',
			icon: 'shield-outline',
			route: '/(stack)/settings/legal/dataRightsCompliance',
		},
	];

	const handleOpenDocument = (document: any) => {
		router.push(document.route);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<Stack.Screen options={{ title: 'Legal Documents' }} />
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
			>
				{/* Header Section */}
				<View style={styles.headerSection}>
					<Text style={styles.headerTitle}>Legal Documents</Text>
					<Text style={styles.headerDescription}>
						Review our terms, policies, and legal information to understand how
						we protect and use your data.
					</Text>
				</View>

				{/* Legal Documents List */}
				<View style={styles.settingsContainer}>
					{legalDocuments.map((document) => (
						<TouchableOpacity
							key={document.id}
							style={styles.settingItem}
							onPress={() => handleOpenDocument(document)}
							accessibilityRole="button"
							accessibilityLabel={`${document.title}. ${document.description}`}
							accessibilityHint="Tap to view this legal document"
						>
							<Ionicons
								name={document.icon as keyof typeof Ionicons.glyphMap}
								size={24}
								color="#555"
								accessibilityHidden={true}
							/>
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>{document.title}</Text>
								<Text style={styles.settingDescription}>
									{document.description}
								</Text>
							</View>
							<Ionicons
								name="chevron-forward"
								size={18}
								color="#BEBEBE"
								accessibilityHidden={true}
							/>
						</TouchableOpacity>
					))}
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>Last updated: December 2024</Text>
					<Text style={styles.footerText}>
						© 2024 Brie Finance Inc. All rights reserved.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingBottom: 40,
	},
	headerSection: {
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 10,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	headerDescription: {
		fontSize: 16,
		color: '#666',
		lineHeight: 22,
	},
	settingsContainer: {
		backgroundColor: '#fff',
		marginHorizontal: 20,
		marginTop: 20,
		borderRadius: 12,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		minHeight: 64,
	},
	settingContent: {
		flex: 1,
		marginLeft: 12,
	},
	settingText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 2,
	},
	settingDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 18,
	},
	footer: {
		marginTop: 40,
		paddingHorizontal: 20,
		alignItems: 'center',
	},
	footerText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
		marginBottom: 4,
	},
});
