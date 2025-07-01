import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useProfile } from '../context/profileContext';

interface ProfileDisplayProps {
	showDetails?: boolean;
}

const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
	showDetails = false,
}) => {
	const { profile, loading, error } = useProfile();

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="small" color="#007ACC" />
				<Text style={styles.loadingText}>Loading profile...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.container}>
				<Text style={styles.errorText}>Error: {error}</Text>
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={styles.container}>
				<Text style={styles.noProfileText}>No profile found</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.name}>
					{profile.firstName} {profile.lastName}
				</Text>
				<Text style={styles.ageRange}>{profile.ageRange}</Text>
			</View>

			{showDetails && (
				<View style={styles.details}>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Monthly Income:</Text>
						<Text style={styles.detailValue}>
							${profile.monthlyIncome.toLocaleString()}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Financial Goal:</Text>
						<Text style={styles.detailValue}>{profile.financialGoal}</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Savings:</Text>
						<Text style={styles.detailValue}>
							${profile.savings.toLocaleString()}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Debt:</Text>
						<Text style={styles.detailValue}>
							${profile.debt.toLocaleString()}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Risk Tolerance:</Text>
						<Text style={styles.detailValue}>
							{profile.riskProfile.tolerance}
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Experience:</Text>
						<Text style={styles.detailValue}>
							{profile.riskProfile.experience}
						</Text>
					</View>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		marginVertical: 8,
	},
	header: {
		marginBottom: 12,
	},
	name: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 4,
	},
	ageRange: {
		fontSize: 14,
		color: '#666',
	},
	details: {
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
		paddingTop: 12,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	detailLabel: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
	},
	detailValue: {
		fontSize: 14,
		color: '#333',
		fontWeight: '600',
	},
	loadingText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#666',
	},
	errorText: {
		fontSize: 14,
		color: '#dc2626',
		textAlign: 'center',
	},
	noProfileText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},
});

export default ProfileDisplay;
