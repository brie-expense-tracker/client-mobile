import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgression } from '../../../../src/context/progressionContext';
import { useProfile } from '../../../../src/context/profileContext';

interface ProgressionSystemProps {
	visible: boolean;
	onClose: () => void;
}

interface SkillPath {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	progress: number;
	maxProgress: number;
	unlocked: boolean;
	achievements: Achievement[];
}

interface Achievement {
	id: string;
	name: string;
	description: string;
	unlocked: boolean;
	unlockedAt?: string;
	category: string;
}

const ProgressionSystem: React.FC<ProgressionSystemProps> = ({
	visible,
	onClose,
}) => {
	const {
		progression,
		currentStage,
		xp,
		completedActions,
		isInTutorialStage,
		isInLevel2Stage,
		isInDynamicStage,
		isInSmartPathStage,
		isInRealtimeStage,
		getStageInfo,
	} = useProgression();
	const { profile } = useProfile();
	const [selectedPath, setSelectedPath] = useState<string | null>(null);

	// Define skill paths based on progression system
	const skillPaths: SkillPath[] = [
		{
			id: 'budgeting',
			name: 'Budget Mastery',
			description: 'Master budget creation and management',
			icon: 'wallet-outline',
			color: '#4CAF50',
			progress: 0,
			maxProgress: 100,
			unlocked: !isInTutorialStage,
			achievements: [
				{
					id: 'first_budget',
					name: 'First Budget',
					description: 'Created your first budget',
					unlocked: false,
					category: 'budgeting',
				},
				{
					id: 'budget_master',
					name: 'Budget Master',
					description: 'Consistently stayed under budget for 3 months',
					unlocked: false,
					category: 'budgeting',
				},
				{
					id: 'budgeting_master',
					name: 'Budgeting Master',
					description: 'Achieved 80% mastery in budgeting skills',
					unlocked: false,
					category: 'smartPath',
				},
			],
		},
		{
			id: 'savings',
			name: 'Savings Streak',
			description: 'Build consistent saving habits',
			icon: 'save-outline',
			color: '#2196F3',
			progress: 0,
			maxProgress: 100,
			unlocked: !isInTutorialStage,
			achievements: [
				{
					id: 'first_goal',
					name: 'First Goal',
					description: 'Set your first financial goal',
					unlocked: false,
					category: 'savings',
				},
				{
					id: 'savings_champion',
					name: 'Savings Champion',
					description: 'Saved money for 6 consecutive months',
					unlocked: false,
					category: 'savings',
				},
				{
					id: 'savings_master',
					name: 'Savings Master',
					description: 'Achieved 80% mastery in savings skills',
					unlocked: false,
					category: 'smartPath',
				},
			],
		},
		{
			id: 'spending',
			name: 'Spending Optimization',
			description: 'Optimize spending patterns and reduce expenses',
			icon: 'trending-down-outline',
			color: '#FF9800',
			progress: 0,
			maxProgress: 100,
			unlocked:
				isInLevel2Stage ||
				isInDynamicStage ||
				isInSmartPathStage ||
				isInRealtimeStage,
			achievements: [
				{
					id: 'spending_optimizer',
					name: 'Spending Optimizer',
					description: 'Reduced monthly spending by 20%',
					unlocked: false,
					category: 'spending',
				},
				{
					id: 'spending_master',
					name: 'Spending Master',
					description: 'Achieved 80% mastery in spending optimization',
					unlocked: false,
					category: 'smartPath',
				},
			],
		},
		{
			id: 'goals',
			name: 'Goal Achievement',
			description: 'Accelerate goal completion and financial milestones',
			icon: 'flag-outline',
			color: '#9C27B0',
			progress: 0,
			maxProgress: 100,
			unlocked:
				isInLevel2Stage ||
				isInDynamicStage ||
				isInSmartPathStage ||
				isInRealtimeStage,
			achievements: [
				{
					id: 'goal_achiever',
					name: 'Goal Achiever',
					description: 'Completed 50% of financial goals',
					unlocked: false,
					category: 'goals',
				},
				{
					id: 'goals_master',
					name: 'Goals Master',
					description: 'Achieved 80% mastery in goal achievement',
					unlocked: false,
					category: 'smartPath',
				},
			],
		},
		{
			id: 'investment',
			name: 'Investment Planning',
			description: 'Advanced investment strategies and portfolio management',
			icon: 'trending-up-outline',
			color: '#00BCD4',
			progress: 0,
			maxProgress: 100,
			unlocked: isInSmartPathStage || isInRealtimeStage,
			achievements: [
				{
					id: 'investment_planner',
					name: 'Investment Planner',
					description: 'Created your first investment plan',
					unlocked: false,
					category: 'investment',
				},
				{
					id: 'portfolio_master',
					name: 'Portfolio Master',
					description: 'Successfully managed a diversified portfolio',
					unlocked: false,
					category: 'investment',
				},
			],
		},
	];

	// Calculate progress for each skill path
	useEffect(() => {
		if (progression?.achievements) {
			skillPaths.forEach((path) => {
				const pathAchievements = progression.achievements.filter(
					(achievement) => achievement.category === path.id
				);
				const unlockedAchievements = pathAchievements.filter(
					(achievement) => achievement.unlockedAt
				);

				path.progress =
					(unlockedAchievements.length / path.achievements.length) * 100;

				// Update achievement status
				path.achievements.forEach((achievement) => {
					const matchingAchievement = pathAchievements.find(
						(a) => a.id === achievement.id
					);
					if (matchingAchievement) {
						achievement.unlocked = !!matchingAchievement.unlockedAt;
						achievement.unlockedAt = matchingAchievement.unlockedAt;
					}
				});
			});
		}
	}, [progression]);

	const getCurrentStageInfo = () => {
		return getStageInfo(currentStage);
	};

	const stageInfo = getCurrentStageInfo();

	const renderProgressBar = (progress: number, color: string) => {
		return (
			<View style={styles.progressBarContainer}>
				<View style={styles.progressBar}>
					<View
						style={[
							styles.progressFill,
							{
								width: `${Math.min(progress, 100)}%`,
								backgroundColor: color,
							},
						]}
					/>
				</View>
				<Text style={styles.progressText}>{Math.round(progress)}%</Text>
			</View>
		);
	};

	const renderSkillPath = (path: SkillPath) => {
		return (
			<TouchableOpacity
				key={path.id}
				style={[styles.skillPathCard, !path.unlocked && styles.skillPathLocked]}
				onPress={() => path.unlocked && setSelectedPath(path.id)}
				disabled={!path.unlocked}
			>
				<View style={styles.skillPathHeader}>
					<View
						style={[styles.skillIcon, { backgroundColor: path.color + '20' }]}
					>
						<Ionicons
							name={path.icon as any}
							size={24}
							color={path.unlocked ? path.color : '#ccc'}
						/>
					</View>
					<View style={styles.skillPathInfo}>
						<Text
							style={[
								styles.skillPathName,
								!path.unlocked && styles.skillPathNameLocked,
							]}
						>
							{path.name}
						</Text>
						<Text
							style={[
								styles.skillPathDescription,
								!path.unlocked && styles.skillPathDescriptionLocked,
							]}
						>
							{path.description}
						</Text>
					</View>
					{!path.unlocked && (
						<Ionicons name="lock-closed" size={20} color="#ccc" />
					)}
				</View>
				{path.unlocked && renderProgressBar(path.progress, path.color)}
			</TouchableOpacity>
		);
	};

	const renderAchievement = (achievement: Achievement) => {
		return (
			<View key={achievement.id} style={styles.achievementItem}>
				<Ionicons
					name={achievement.unlocked ? 'checkmark-circle' : 'ellipse-outline'}
					size={20}
					color={achievement.unlocked ? '#4CAF50' : '#ccc'}
				/>
				<View style={styles.achievementInfo}>
					<Text
						style={[
							styles.achievementName,
							achievement.unlocked && styles.achievementNameUnlocked,
						]}
					>
						{achievement.name}
					</Text>
					<Text
						style={[
							styles.achievementDescription,
							achievement.unlocked && styles.achievementDescriptionUnlocked,
						]}
					>
						{achievement.description}
					</Text>
					{achievement.unlocked && achievement.unlockedAt && (
						<Text style={styles.achievementDate}>
							Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
						</Text>
					)}
				</View>
			</View>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View style={styles.container}>
				{/* Header */}
				<LinearGradient
					colors={[stageInfo.color, stageInfo.color + '80']}
					style={styles.header}
				>
					<View style={styles.headerContent}>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color="#fff" />
						</TouchableOpacity>
						<View style={styles.headerInfo}>
							<Ionicons name={stageInfo.icon as any} size={28} color="#fff" />
							<Text style={styles.headerTitle}>{stageInfo.title}</Text>
							<Text style={styles.headerSubtitle}>{stageInfo.subtitle}</Text>
						</View>
					</View>
				</LinearGradient>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Current Stage Info */}
					<View style={styles.stageInfoCard}>
						<Text style={styles.stageDescription}>{stageInfo.description}</Text>

						{/* XP and Progress Display */}
						<View style={styles.statsContainer}>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>{xp}</Text>
								<Text style={styles.statLabel}>Total XP</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>{completedActions}</Text>
								<Text style={styles.statLabel}>Actions Completed</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>
									{progression?.achievements?.length || 0}
								</Text>
								<Text style={styles.statLabel}>Achievements</Text>
							</View>
						</View>

						{/* Next Stage Requirements */}
						{stageInfo.nextStage && (
							<View style={styles.nextStageContainer}>
								<Text style={styles.nextStageTitle}>
									Next: {stageInfo.nextStage}
								</Text>
								<View style={styles.requirementsList}>
									{stageInfo.requirements.map(
										(requirement: string, index: number) => (
											<View key={index} style={styles.requirementItem}>
												<Ionicons
													name="checkmark-circle-outline"
													size={16}
													color="#666"
												/>
												<Text style={styles.requirementText}>
													{requirement}
												</Text>
											</View>
										)
									)}
								</View>
							</View>
						)}
					</View>

					{/* Skill Paths */}
					<View style={styles.skillPathsSection}>
						<Text style={styles.sectionTitle}>Skill Paths</Text>
						<Text style={styles.sectionSubtitle}>
							Choose your focus area and track your mastery
						</Text>

						{skillPaths.map(renderSkillPath)}
					</View>

					{/* Selected Path Details */}
					{selectedPath && (
						<View style={styles.pathDetailsSection}>
							<TouchableOpacity
								onPress={() => setSelectedPath(null)}
								style={styles.backButton}
							>
								<Ionicons name="arrow-back" size={20} color="#666" />
								<Text style={styles.backButtonText}>Back to Paths</Text>
							</TouchableOpacity>

							{(() => {
								const path = skillPaths.find((p) => p.id === selectedPath);
								if (!path) return null;

								return (
									<View style={styles.pathDetails}>
										<View style={styles.pathDetailsHeader}>
											<View
												style={[
													styles.skillIcon,
													{ backgroundColor: path.color + '20' },
												]}
											>
												<Ionicons
													name={path.icon as any}
													size={24}
													color={path.color}
												/>
											</View>
											<Text style={styles.pathDetailsTitle}>{path.name}</Text>
										</View>
										<Text style={styles.pathDetailsDescription}>
											{path.description}
										</Text>

										<View style={styles.achievementsSection}>
											<Text style={styles.achievementsTitle}>Achievements</Text>
											{path.achievements.map(renderAchievement)}
										</View>
									</View>
								);
							})()}
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	header: {
		paddingTop: 60,
		paddingBottom: 20,
		paddingHorizontal: 20,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	closeButton: {
		padding: 8,
		marginRight: 12,
	},
	headerInfo: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#fff',
		marginTop: 8,
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#fff',
		opacity: 0.9,
	},
	content: {
		flex: 1,
		padding: 20,
	},
	stageInfoCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		marginBottom: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	stageDescription: {
		fontSize: 16,
		color: '#666',
		lineHeight: 24,
		marginBottom: 20,
		textAlign: 'center',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
	},
	statItem: {
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	nextStageContainer: {
		borderTopWidth: 1,
		borderTopColor: '#e9ecef',
		paddingTop: 20,
	},
	nextStageTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	requirementsList: {
		gap: 8,
	},
	requirementItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	requirementText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
	},
	skillPathsSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 16,
	},
	skillPathCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	skillPathLocked: {
		opacity: 0.6,
	},
	skillPathHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	skillIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	skillPathInfo: {
		flex: 1,
	},
	skillPathName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	skillPathNameLocked: {
		color: '#ccc',
	},
	skillPathDescription: {
		fontSize: 14,
		color: '#666',
	},
	skillPathDescriptionLocked: {
		color: '#ccc',
	},
	progressBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	progressBar: {
		flex: 1,
		height: 8,
		backgroundColor: '#e9ecef',
		borderRadius: 4,
		marginRight: 12,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 4,
	},
	progressText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
		minWidth: 35,
	},
	pathDetailsSection: {
		marginTop: 24,
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	backButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#666',
		marginLeft: 8,
	},
	pathDetails: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	pathDetailsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	pathDetailsTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginLeft: 12,
	},
	pathDetailsDescription: {
		fontSize: 16,
		color: '#666',
		lineHeight: 24,
		marginBottom: 20,
	},
	achievementsSection: {
		borderTopWidth: 1,
		borderTopColor: '#e9ecef',
		paddingTop: 20,
	},
	achievementsTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	achievementItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	achievementInfo: {
		flex: 1,
		marginLeft: 12,
	},
	achievementName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ccc',
		marginBottom: 4,
	},
	achievementNameUnlocked: {
		color: '#333',
	},
	achievementDescription: {
		fontSize: 14,
		color: '#ccc',
		lineHeight: 20,
	},
	achievementDescriptionUnlocked: {
		color: '#666',
	},
	achievementDate: {
		fontSize: 12,
		color: '#4CAF50',
		marginTop: 4,
		fontWeight: '500',
	},
});

export default ProgressionSystem;
