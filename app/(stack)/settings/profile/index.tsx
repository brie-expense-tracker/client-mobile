import React, { useEffect, useCallback, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';
import useAuth from '../../../../src/context/AuthContext';
import Setting from '../components/settingItem';
import AIProfileInsights from './components/AIProfileInsights';

export default function AccountScreen() {
	const router = useRouter();
	const { profile, loading, error, fetchProfile } = useProfile();
	const { user } = useAuth();
	const [profileCompletion, setProfileCompletion] = useState(0);

	const handleFetchProfile = useCallback(() => {
		fetchProfile();
	}, [fetchProfile]);

	// Calculate profile completion percentage
	const calculateProfileCompletion = useCallback((profileData: any) => {
		if (!profileData) return 0;

		const fields = [
			profileData.firstName,
			profileData.lastName,
			profileData.monthlyIncome,
			profileData.savings,
			profileData.debt,
			profileData.expenses?.housing,
			profileData.expenses?.transportation,
			profileData.expenses?.food,
			profileData.financialGoal,
		];

		const filledFields = fields.filter(
			(field) => field !== undefined && field !== null && field !== ''
		).length;
		return Math.round((filledFields / fields.length) * 100);
	}, []);

	useEffect(() => {
		handleFetchProfile();
	}, [handleFetchProfile]);

	useEffect(() => {
		if (profile) {
			setProfileCompletion(calculateProfileCompletion(profile));
		}
	}, [profile, calculateProfileCompletion]);

	const handleAIAction = (action: string) => {
		switch (action) {
			case 'optimize_income':
				router.push('/(stack)/settings/profile/editFinancial');
				break;
			case 'reduce_expenses':
				router.push('/(stack)/settings/profile/editExpenses');
				break;
			case 'set_savings_goal':
				router.push('/(tabs)/budgets?tab=goals');
				break;
			case 'create_budget':
				router.push('/(tabs)/budgets?tab=budgets');
				break;
			case 'debt_strategy':
				router.push('/(stack)/settings/profile/editFinancial');
				break;
			case 'financial_planning':
				router.push('/(tabs)/assistant');
				break;
		}
	};

	const handleExportProfile = async () => {
		try {
			const profileData = {
				exportDate: new Date().toISOString(),
				profile: {
					firstName: profile?.firstName,
					lastName: profile?.lastName,
					monthlyIncome: profile?.monthlyIncome,
					savings: profile?.savings,
					debt: profile?.debt,
					expenses: profile?.expenses,
					financialGoal: profile?.financialGoal,
				},
			};

			const jsonString = JSON.stringify(profileData, null, 2);

			await Share.share({
				message: jsonString,
				title: 'Profile Export',
			});
		} catch (err) {
			console.error('Export error:', err);
			Alert.alert('Error', 'Failed to export profile data');
		}
	};

	const handleBackupProfile = async () => {
		Alert.alert(
			'Backup Profile',
			'This will create a backup of your profile data. Continue?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Backup', onPress: handleExportProfile },
			]
		);
	};

	const getFinancialHealthScore = () => {
		if (!profile) return 0;

		let score = 0;
		const income = profile.monthlyIncome || 0;
		const savings = profile.savings || 0;
		const debt = profile.debt || 0;

		// Emergency fund score (0-40 points)
		if (savings >= income * 6) score += 40;
		else if (savings >= income * 3) score += 30;
		else if (savings >= income * 1) score += 20;
		else if (savings > 0) score += 10;

		// Debt-to-income ratio (0-30 points)
		if (income > 0) {
			const debtRatio = debt / income;
			if (debtRatio <= 0.2) score += 30;
			else if (debtRatio <= 0.4) score += 20;
			else if (debtRatio <= 0.6) score += 10;
		}

		// Profile completeness (0-30 points)
		score += Math.round((profileCompletion / 100) * 30);

		return Math.min(score, 100);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0095FF" />
				<Text style={styles.loadingText}>
					{profile ? 'Loading profile...' : 'Setting up your profile...'}
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
				<Text style={styles.errorText}>Failed to load profile</Text>
				<Text style={styles.errorSubtext}>{error}</Text>
				<TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="person-outline" size={48} color="#999" />
				<Text style={styles.errorText}>No profile found</Text>
				<TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
					<Text style={styles.retryButtonText}>Refresh</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Profile Overview */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Profile Overview</Text>
				<View style={styles.overviewContainer}>
					<View style={styles.metricCard}>
						<View style={styles.metricHeader}>
							<Ionicons
								name="checkmark-circle-outline"
								size={20}
								color="#10b981"
							/>
							<Text style={styles.metricTitle}>Profile Completion</Text>
						</View>
						<Text style={styles.metricValue}>{profileCompletion}%</Text>
						<View style={styles.progressBar}>
							<View
								style={[
									styles.progressFill,
									{ width: `${profileCompletion}%` },
								]}
							/>
						</View>
					</View>

					<View style={styles.metricCard}>
						<View style={styles.metricHeader}>
							<Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
							<Text style={styles.metricTitle}>Financial Health</Text>
						</View>
						<Text style={styles.metricValue}>
							{getFinancialHealthScore()}/100
						</Text>
						<Text style={styles.metricSubtext}>
							{getFinancialHealthScore() >= 80
								? 'Excellent'
								: getFinancialHealthScore() >= 60
								? 'Good'
								: getFinancialHealthScore() >= 40
								? 'Fair'
								: 'Needs Improvement'}
						</Text>
					</View>
				</View>
			</View>

			{/* Account Details */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account Details</Text>
				<View style={styles.settingsContainer}>
					<Setting
						icon="person-outline"
						label="Name"
						value={
							profile.firstName || profile.lastName
								? `${profile.firstName} ${profile.lastName}`
								: 'Not set'
						}
						onPress={() => router.push('/(stack)/settings/profile/editName')}
					/>

					<Setting
						icon="mail-outline"
						label="Email"
						value={user?.email || 'Not set'}
					/>
				</View>
			</View>

			{/* Financial Information */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Financial Information</Text>
				<View style={styles.settingsContainer}>
					<Setting
						icon="cash-outline"
						label="Monthly Income"
						value={`$${profile.monthlyIncome?.toLocaleString() || '0'}`}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>

					<Setting
						icon="trending-up-outline"
						label="Total Savings"
						value={`$${profile.savings?.toLocaleString() || '0'}`}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>

					<Setting
						icon="trending-down-outline"
						label="Total Debt"
						value={`$${profile.debt?.toLocaleString() || '0'}`}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					/>

					{profile.expenses && (
						<Setting
							icon="card-outline"
							label="Expenses"
							value={`Housing: $${
								profile.expenses.housing?.toLocaleString() || '0'
							}`}
							onPress={() =>
								router.push('/(stack)/settings/profile/editExpenses')
							}
						/>
					)}
				</View>
			</View>

			{/* AI-Powered Profile Insights */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>AI Insights & Recommendations</Text>
				<View style={styles.aiInsightsContainer}>
					<AIProfileInsights profile={profile} onAction={handleAIAction} />
				</View>
			</View>

			{/* Quick Actions */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Quick Actions</Text>
				<View style={styles.quickActionsContainer}>
					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() =>
							router.push('/(stack)/settings/profile/editFinancial')
						}
					>
						<Ionicons name="cash-outline" size={24} color="#10b981" />
						<Text style={styles.quickActionText}>Update Financial Info</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() =>
							router.push('/(stack)/settings/profile/editExpenses')
						}
					>
						<Ionicons name="card-outline" size={24} color="#f59e0b" />
						<Text style={styles.quickActionText}>Edit Expenses</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={() => router.push('/(tabs)/budgets?tab=goals')}
					>
						<Ionicons name="flag-outline" size={24} color="#3b82f6" />
						<Text style={styles.quickActionText}>Set Goals</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickActionButton}
						onPress={handleBackupProfile}
					>
						<Ionicons name="cloud-upload-outline" size={24} color="#8b5cf6" />
						<Text style={styles.quickActionText}>Backup Profile</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Account Management */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account Management</Text>
				<View style={styles.settingsContainer}>
					<Setting
						icon="trash-outline"
						label="Delete Account"
						onPress={() =>
							router.push('/(stack)/settings/profile/deleteAccount')
						}
					/>
				</View>
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
		paddingBottom: 20,
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
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		paddingHorizontal: 4,
		marginTop: 16,
	},

	settingsContainer: {
		backgroundColor: '#fff',
		overflow: 'hidden',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingHorizontal: 32,
	},
	errorText: {
		marginTop: 16,
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		textAlign: 'center',
	},
	errorSubtext: {
		marginTop: 8,
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},
	retryButton: {
		marginTop: 24,
		backgroundColor: '#0095FF',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	aiInsightsContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginTop: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	overviewContainer: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
	},
	metricCard: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	metricHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	metricTitle: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		marginLeft: 6,
	},
	metricValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	metricSubtext: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	progressBar: {
		height: 6,
		backgroundColor: '#e5e7eb',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#10b981',
		borderRadius: 3,
	},
	quickActionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 16,
	},
	quickActionButton: {
		flex: 1,
		minWidth: '45%',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	quickActionText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
		marginTop: 8,
		textAlign: 'center',
	},
});
