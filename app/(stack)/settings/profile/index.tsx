import React, { useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
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

	useEffect(() => {
		fetchProfile();
	}, []);

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
});
