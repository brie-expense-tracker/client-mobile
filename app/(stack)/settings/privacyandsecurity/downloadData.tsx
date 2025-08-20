import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';
import { ApiService } from '../../../../src/services';

export default function DownloadDataScreen() {
	const router = useRouter();
	const { profile } = useProfile();
	const [downloading, setDownloading] = useState(false);

	const handleDownloadData = async () => {
		try {
			setDownloading(true);

			// Show confirmation dialog
			Alert.alert(
				'Download Your Data',
				'This will download all your financial data including transactions, budgets, goals, and profile information. The download may take a few moments.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Download',
						onPress: async () => {
							try {
								// Call API to generate and download data
								const response = await ApiService.get(
									'/profiles/download-data'
								);

								if (response.success) {
									Alert.alert(
										'Download Complete',
										'Your data has been prepared for download. Check your email for the download link.',
										[{ text: 'OK' }]
									);
								} else {
									throw new Error(
										response.error || 'Failed to prepare download'
									);
								}
							} catch (error) {
								console.error('Error downloading data:', error);
								Alert.alert(
									'Download Failed',
									'Unable to prepare your data for download. Please try again later.'
								);
							}
						},
					},
				]
			);
		} catch (error) {
			console.error('Error initiating download:', error);
			Alert.alert('Error', 'Failed to initiate download. Please try again.');
		} finally {
			setDownloading(false);
		}
	};

	const dataTypes = [
		{
			title: 'Profile Information',
			description: 'Personal details, financial goals, and preferences',
			icon: 'person-outline',
		},
		{
			title: 'Financial Transactions',
			description: 'All your income and expense records',
			icon: 'card-outline',
		},
		{
			title: 'Budgets & Goals',
			description: 'Budget settings, spending limits, and financial goals',
			icon: 'trophy-outline',
		},
		{
			title: 'AI Insights & Reports',
			description: 'Generated financial insights and analysis reports',
			icon: 'bulb-outline',
		},
		{
			title: 'App Settings',
			description: 'Notification preferences and app configuration',
			icon: 'settings-outline',
		},
	];

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.header}>
				<Text style={styles.title}>Download Your Data</Text>
				<Text style={styles.subtitle}>
					Get a complete copy of all your data stored in Brie
				</Text>
			</View>

			<View style={styles.infoSection}>
				<View style={styles.infoCard}>
					<Ionicons
						name="information-circle-outline"
						size={24}
						color="#007AFF"
					/>
					<Text style={styles.infoText}>
						Your data will be prepared and sent to your email address. This
						process may take a few minutes.
					</Text>
				</View>
			</View>

			<View style={styles.dataTypesSection}>
				<Text style={styles.sectionTitle}>What's Included</Text>
				{dataTypes.map((type, index) => (
					<View key={index} style={styles.dataTypeItem}>
						<Ionicons
							name={type.icon as keyof typeof Ionicons.glyphMap}
							size={20}
							color="#666"
						/>
						<View style={styles.dataTypeContent}>
							<Text style={styles.dataTypeTitle}>{type.title}</Text>
							<Text style={styles.dataTypeDescription}>{type.description}</Text>
						</View>
					</View>
				))}
			</View>

			<View style={styles.downloadSection}>
				<TouchableOpacity
					style={[
						styles.downloadButton,
						downloading && styles.downloadButtonDisabled,
					]}
					onPress={handleDownloadData}
					disabled={downloading}
				>
					{downloading ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<>
							<Ionicons name="download-outline" size={20} color="#fff" />
							<Text style={styles.downloadButtonText}>Download My Data</Text>
						</>
					)}
				</TouchableOpacity>

				<Text style={styles.downloadNote}>
					You'll receive an email with a secure download link once your data is
					ready.
				</Text>
			</View>

			<View style={styles.legalSection}>
				<Text style={styles.legalTitle}>Data Privacy</Text>
				<Text style={styles.legalText}>
					Your data is encrypted and securely processed. We never share your
					personal information with third parties.
				</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		padding: 20,
	},
	header: {
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		lineHeight: 22,
	},
	infoSection: {
		marginBottom: 24,
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f0f9ff',
		padding: 16,
		borderRadius: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#007AFF',
	},
	infoText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 14,
		color: '#333',
		lineHeight: 20,
	},
	dataTypesSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	dataTypeItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	dataTypeContent: {
		flex: 1,
		marginLeft: 12,
	},
	dataTypeTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	dataTypeDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 18,
	},
	downloadSection: {
		marginBottom: 24,
		alignItems: 'center',
	},
	downloadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#007AFF',
		paddingHorizontal: 24,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	downloadButtonDisabled: {
		backgroundColor: '#ccc',
	},
	downloadButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	downloadNote: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		lineHeight: 20,
	},
	legalSection: {
		padding: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
	},
	legalTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	legalText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
});
