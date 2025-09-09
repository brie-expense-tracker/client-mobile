import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
	const appInfo = {
		name: 'Brie',
		version: '0.0.1-alpha.N',
		build: '2024.1.0',
		description:
			'Your personal finance companion for smarter money management.',
		company: 'Brie Finance Inc.',
		website: 'https://brie.finance',
		email: 'support@brie.finance',
	};

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			contentInsetAdjustmentBehavior="automatic"
		>
			{/* App Info Section */}
			<View style={styles.heroSection}>
				<View style={styles.appInfoSection}>
					<Image
						source={require('../../../../src/assets/images/brie-logos.png')}
						style={styles.appIcon}
						contentFit="contain"
					/>
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
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingBottom: 20,
	},
	heroSection: {
		paddingHorizontal: 16,
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
		alignItems: 'center',
	},

	appIcon: {
		width: 120,
		height: 70,
		borderRadius: 16,
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
