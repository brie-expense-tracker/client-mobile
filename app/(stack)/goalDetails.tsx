import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useGoal } from '../../src/context/goalContext';
import { Goal } from '../../src/context/goalContext';
import LinearProgressBar from '../(tabs)/wallet/components/LinearProgressBar';
import { normalizeIconName } from '../../src/constants/uiConstants';

const GoalSummaryScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const goalId = params.id as string;
	const { goals, isLoading, hasLoaded } = useGoal();
	const [goal, setGoal] = useState<Goal | null>(null);

	// Load goal data when component mounts or goals change
	useEffect(() => {
		if (goalId && goals.length > 0) {
			const foundGoal = goals.find((g) => g.id === goalId);

			if (foundGoal) {
				setGoal(foundGoal);
			}
		}
	}, [goalId, goals]);

	// Show loading state while goals are being fetched
	if (isLoading && !hasLoaded) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Goal Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading goals...</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Show error state if goals failed to load
	if (hasLoaded && goals.length === 0) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Goal Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>No goals found</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Show loading state if goal is not found yet
	if (!goal && hasLoaded && goals.length > 0) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Goal Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Goal not found</Text>
					<Text style={styles.loadingSubtext}>
						The requested goal could not be loaded
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!goal) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Goal Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading goal...</Text>
				</View>
			</SafeAreaView>
		);
	}

	const progressPercent =
		goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
	const daysLeft = () => {
		const end = new Date(goal.deadline).setHours(0, 0, 0, 0);
		const now = new Date().setHours(0, 0, 0, 0);
		const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
		return days;
	};

	const getGoalStatus = () => {
		if (goal.current >= goal.target) return 'completed';
		const dl = daysLeft();
		if (dl < 0) return 'overdue';
		return 'active';
	};

	const status = getGoalStatus();
	const daysRemaining = daysLeft();

	return (
		<SafeAreaView style={styles.container}>
			{/* Custom Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#222" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Goal Details</Text>
				<View style={styles.placeholderButton} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Goal Overview */}
				<View style={styles.overviewCard}>
					<View style={styles.goalHeader}>
						<View
							style={[
								styles.iconBubble,
								{ backgroundColor: (goal.color ?? '#18181b') + '12' },
							]}
						>
							{goal.icon &&
							goal.icon.length > 0 &&
							!goal.icon.match(
								/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
							) ? (
								<Ionicons
									name={goal.icon as keyof typeof Ionicons.glyphMap}
									size={24}
									color={goal.color ?? '#18181b'}
								/>
							) : (
								<Ionicons
									name={normalizeIconName(goal.icon || 'flag-outline')}
									size={20}
									color={goal.color || '#007AFF'}
								/>
							)}
						</View>
						<View style={styles.goalInfo}>
							<Text style={styles.goalName}>{goal.name}</Text>
							<Text style={styles.goalPeriod}>
								{goal.categories && goal.categories.length > 0
									? goal.categories.join(', ')
									: 'Personal Goal'}
							</Text>
						</View>
					</View>

					{/* Progress Section */}
					<View style={styles.progressSection}>
						<LinearProgressBar
							percent={progressPercent}
							height={8}
							color={goal.color ?? '#18181b'}
							trackColor="#f3f4f6"
							animated={true}
							leftLabel={`$${goal.current.toFixed(0)} / $${goal.target.toFixed(
								0
							)}`}
							rightLabel={`${progressPercent.toFixed(0)}%`}
						/>
					</View>

					{/* Amounts Row */}
					<View style={styles.amountsRow}>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Current</Text>
							<Text style={styles.amountValue}>${goal.current.toFixed(0)}</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Target</Text>
							<Text style={styles.amountValue}>${goal.target.toFixed(0)}</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Remaining</Text>
							<Text style={styles.amountValue}>
								${(goal.target - goal.current).toFixed(0)}
							</Text>
						</View>
					</View>

					{/* Status and Deadline */}
					<View style={styles.statusSection}>
						<View style={styles.statusRow}>
							<Text style={styles.statusLabel}>Status:</Text>
							<View
								style={[
									styles.statusPill,
									{
										backgroundColor:
											status === 'completed'
												? '#10b981'
												: status === 'overdue'
												? '#ef4444'
												: '#3b82f6',
									},
								]}
							>
								<Text style={styles.statusText}>
									{status === 'completed'
										? 'Completed'
										: status === 'overdue'
										? 'Overdue'
										: 'Active'}
								</Text>
							</View>
						</View>
						<Text style={styles.deadlineText}>
							{status === 'completed'
								? 'Goal completed!'
								: status === 'overdue'
								? `${Math.abs(daysRemaining)} days overdue`
								: `${daysRemaining} days remaining`}
						</Text>
					</View>
				</View>

				{/* Analysis Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Analysis</Text>
					<View style={styles.analysisCard}>
						<View style={styles.analysisItem}>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<Text style={styles.analysisText}>
								{status === 'completed'
									? 'Congratulations! You achieved your goal.'
									: `You're ${progressPercent.toFixed(
											0
									  )}% of the way to your target.`}
							</Text>
						</View>
						<View style={styles.analysisItem}>
							<Ionicons name="calendar" size={20} color="#3b82f6" />
							<Text style={styles.analysisText}>
								{status === 'completed'
									? 'Goal completed successfully!'
									: status === 'overdue'
									? 'Consider extending your deadline or adjusting your target.'
									: `Keep up the good work! You have ${daysRemaining} days left.`}
							</Text>
						</View>
					</View>
				</View>

				{/* Recent History */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Recent History</Text>
					<View style={styles.historyCard}>
						<View style={styles.historyItem}>
							<View style={styles.historyIcon}>
								<Ionicons name="time" size={16} color="#6b7280" />
							</View>
							<View style={styles.historyContent}>
								<Text style={styles.historyTitle}>Goal Created</Text>
								<Text style={styles.historyAmount}>
									{goal.createdAt
										? new Date(goal.createdAt).toLocaleDateString()
										: 'Unknown'}
								</Text>
							</View>
						</View>
						<View style={styles.historyItem}>
							<View style={styles.historyIcon}>
								<Ionicons name="flag" size={16} color="#6b7280" />
							</View>
							<View style={styles.historyContent}>
								<Text style={styles.historyTitle}>Target Deadline</Text>
								<Text style={styles.historyAmount}>
									{new Date(goal.deadline).toLocaleDateString()}
								</Text>
							</View>
						</View>
						<View style={styles.historyItem}>
							<View style={styles.historyIcon}>
								<Ionicons name="trending-up" size={16} color="#6b7280" />
							</View>
							<View style={styles.historyContent}>
								<Text style={styles.historyTitle}>Current Progress</Text>
								<Text style={styles.historyAmount}>
									${goal.current.toFixed(0)} of ${goal.target.toFixed(0)}
								</Text>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		width: 40,
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	placeholderButton: {
		width: 40,
	},
	content: {
		flex: 1,
	},
	overviewCard: {
		margin: 16,
		padding: 20,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	goalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	iconBubble: {
		width: 48,
		height: 48,
		borderRadius: 12,
		marginRight: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	goalInfo: {
		flex: 1,
	},
	goalName: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 4,
	},
	goalPeriod: {
		fontSize: 14,
		color: '#6b7280',
	},
	progressSection: {
		marginBottom: 20,
	},

	amountsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	amountItem: {
		alignItems: 'center',
		flex: 1,
	},
	amountLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	amountValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
	},
	statusSection: {
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		paddingTop: 20,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	statusLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginRight: 12,
	},
	statusPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	statusText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#ffffff',
	},
	deadlineText: {
		fontSize: 14,
		color: '#6b7280',
	},
	section: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 12,
	},
	analysisCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	analysisItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	analysisText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 12,
		flex: 1,
	},
	historyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	historyIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	historyContent: {
		flex: 1,
	},
	historyTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 2,
	},
	historyAmount: {
		fontSize: 12,
		color: '#6b7280',
	},

	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
	},
	loadingSubtext: {
		fontSize: 14,
		color: '#9ca3af',
		marginTop: 4,
	},
});

export default GoalSummaryScreen;
