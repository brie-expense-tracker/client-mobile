import React from 'react';
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

	const handleOpenExternalLink = (url: string) => {
		Linking.openURL(url).catch((err) =>
			console.error('An error occurred', err)
		);
	};

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="automatic"
		>
			{/* Legal Documents List */}
			<View style={styles.settingsContainer}>
				{legalDocuments.map((document) => (
					<TouchableOpacity
						key={document.id}
						style={styles.settingItem}
						onPress={() => handleOpenDocument(document)}
					>
						<Ionicons
							name={document.icon as keyof typeof Ionicons.glyphMap}
							size={24}
							color="#555"
						/>
						<View style={styles.settingContent}>
							<Text style={styles.settingText}>{document.title}</Text>
							<Text style={styles.settingDescription}>
								{document.description}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
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
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingBottom: 40,
	},
	settingsContainer: {
		backgroundColor: '#fff',
		marginHorizontal: 20,
		borderRadius: 12,
		overflow: 'hidden',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
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
