import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
	const router = useRouter();

	const appInfo = {
		name: 'Brie',
		version: '1.0.0',
		build: '2024.1.0',
		description:
			'Your personal finance companion for smarter money management.',
		company: 'Brie Finance Inc.',
		website: 'https://brie.finance',
		email: 'support@brie.finance',
	};

	const handleOpenLink = (url: string) => {
		Linking.openURL(url).catch((err) =>
			console.error('An error occurred', err)
		);
	};

	const handleEmailSupport = () => {
		Linking.openURL(`mailto:${appInfo.email}`).catch((err) =>
			console.error('An error occurred', err)
		);
	};

	return (
		<View style={styles.mainContainer}>
			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.headerContainer}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="arrow-back" size={24} color="#333" />
					</TouchableOpacity>
					<Text style={styles.headerText}>About</Text>
					<View style={styles.placeholder} />
				</View>

				{/* App Info Section */}
				<View style={styles.section}>
					<View style={styles.appInfoSection}>
						<View style={styles.appIconContainer}>
							<Image
								source={require('../../../../assets/images/brie-logos.png')}
								style={styles.appIcon}
								contentFit="cover"
							/>
						</View>
						<Text style={styles.appName}>{appInfo.name}</Text>
						<Text style={styles.appVersion}>Version {appInfo.version}</Text>
						<Text style={styles.appDescription}>{appInfo.description}</Text>
					</View>
				</View>

				{/* App Details */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>App Information</Text>
					<View style={styles.settingsContainer}>
						<View style={styles.settingItem}>
							<Ionicons
								name="information-circle-outline"
								size={24}
								color="#555"
							/>
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Version</Text>
								<Text style={styles.settingValue}>{appInfo.version}</Text>
							</View>
						</View>

						<View style={styles.settingItem}>
							<Ionicons name="build-outline" size={24} color="#555" />
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Build</Text>
								<Text style={styles.settingValue}>{appInfo.build}</Text>
							</View>
						</View>

						<View style={styles.settingItem}>
							<Ionicons name="business-outline" size={24} color="#555" />
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Developer</Text>
								<Text style={styles.settingValue}>{appInfo.company}</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Legal */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Legal</Text>
					<View style={styles.settingsContainer}>
						<TouchableOpacity style={styles.settingItem}>
							<Ionicons name="document-text-outline" size={24} color="#555" />
							<Text style={styles.settingText}>Terms of Service</Text>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>

						<TouchableOpacity style={styles.settingItem}>
							<Ionicons
								name="shield-checkmark-outline"
								size={24}
								color="#555"
							/>
							<Text style={styles.settingText}>Privacy Policy</Text>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>

						<TouchableOpacity style={styles.settingItem}>
							<Ionicons name="document-outline" size={24} color="#555" />
							<Text style={styles.settingText}>License Agreement</Text>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Contact */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Contact</Text>
					<View style={styles.settingsContainer}>
						<TouchableOpacity
							style={styles.settingItem}
							onPress={() => handleOpenLink(appInfo.website)}
						>
							<Ionicons name="globe-outline" size={24} color="#555" />
							<Text style={styles.settingText}>Website</Text>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.settingItem}
							onPress={handleEmailSupport}
						>
							<Ionicons name="mail-outline" size={24} color="#555" />
							<Text style={styles.settingText}>Email Support</Text>
							<Ionicons name="chevron-forward" size={18} color="#BEBEBE" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Credits */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Credits</Text>
					<View style={styles.settingsContainer}>
						<View style={styles.settingItem}>
							<Ionicons name="people-outline" size={24} color="#555" />
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Development Team</Text>
								<Text style={styles.settingValue}>Brie Finance Team</Text>
							</View>
						</View>

						<View style={styles.settingItem}>
							<Ionicons name="heart-outline" size={24} color="#555" />
							<View style={styles.settingContent}>
								<Text style={styles.settingText}>Made with</Text>
								<Text style={styles.settingValue}>React Native & Expo</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>
						© 2024 {appInfo.company}. All rights reserved.
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#f7f7f7',
	},
	scrollView: {
		flex: 1,
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
		marginTop: 50,
	},
	backButton: {
		padding: 4,
	},
	headerText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 32,
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
	appInfoSection: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
	},
	appIconContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		height: 120,
		width: '100%',
	},
	appIcon: {
		borderRadius: 16,
		marginBottom: 16,
		width: '100%',
		height: '100%',
	},
	appName: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	appVersion: {
		fontSize: 16,
		color: '#666',
		marginBottom: 16,
	},
	appDescription: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
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
	footer: {
		padding: 24,
		alignItems: 'center',
	},
	footerText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
});
