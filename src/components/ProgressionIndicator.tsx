import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgression } from '../context/progressionContext';

interface ProgressionIndicatorProps {
	showDetails?: boolean;
	onPress?: () => void;
}

const ProgressionIndicator: React.FC<ProgressionIndicatorProps> = ({
	showDetails = false,
	onPress,
}) => {
	const {
		progressionStatus,
		currentStage,
		xp,
		completedActions,
		loading,
		isInTutorialStage,
		isInLevel2Stage,
		isInDynamicStage,
	} = useProgression();

	if (loading) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading progress...</Text>
				</View>
			</View>
		);
	}

	const getStageInfo = () => {
		const isCompleted = progressPercentage >= 100;

		switch (currentStage) {
			case 'tutorial':
				return {
					name: 'Tutorial Zone',
					icon: 'school',
					colors: ['#4CAF50', '#45a049'],
					description: isCompleted ? 'Tutorial completed!' : 'Learn the basics',
				};
			case 'level2':
				return {
					name: 'Level 2',
					icon: 'sparkles',
					colors: ['#2196F3', '#1976D2'],
					description: isCompleted ? 'Level 2 completed!' : 'Smart Actions',
				};
			case 'dynamic':
				return {
					name: 'Dynamic',
					icon: 'trending-up',
					colors: ['#9C27B0', '#7B1FA2'],
					description: 'Advanced AI',
				};
			default:
				return {
					name: 'Tutorial',
					icon: 'school',
					colors: ['#4CAF50', '#45a049'],
					description: 'Get started',
				};
		}
	};

	const stageInfo = getStageInfo();

	const getProgressPercentage = () => {
		// If no progression data, return 0
		if (!progressionStatus?.progression) return 0;

		const progression = progressionStatus.progression;

		// Tutorial stage progress calculation
		if (currentStage === 'tutorial') {
			// If tutorial is already completed, show 100%
			if (progression.tutorialCompleted) {
				return 100;
			}

			// Calculate progress based on tutorial steps completed
			const tutorialSteps = progression.tutorialSteps || {};
			const completedSteps =
				Object.values(tutorialSteps).filter(Boolean).length;
			const totalSteps = 4; // 4 smart actions required for tutorial

			return (completedSteps / totalSteps) * 100;
		}

		// Level 2 stage progress calculation
		if (currentStage === 'level2') {
			// If 2+ level2 actions completed, show 100%
			if (progression.level2ActionsCompleted >= 2) {
				return 100;
			}

			// Calculate progress based on level2 actions completed
			const completedActions = progression.level2ActionsCompleted || 0;
			const requiredActions = 2; // 2 level2 actions required

			return (completedActions / requiredActions) * 100;
		}

		// Dynamic stage - always 100% (final stage)
		if (currentStage === 'dynamic') {
			return 100;
		}

		// Fallback: use nextStageRequirements if available
		if (progressionStatus?.nextStageRequirements?.requirements) {
			const requirements = progressionStatus.nextStageRequirements.requirements;
			if (requirements.length === 0) return 100;

			// For now, assume 0% completion since we can't determine completion from strings
			return 0;
		}

		return 0;
	};

	const progressPercentage = getProgressPercentage();

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.indicator}
				onPress={onPress}
				disabled={!onPress}
			>
				<LinearGradient
					colors={stageInfo.colors as [string, string]}
					style={styles.gradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<View style={styles.content}>
						<View style={styles.leftSection}>
							<View style={styles.iconContainer}>
								<Ionicons name={stageInfo.icon as any} size={20} color="#fff" />
							</View>
							<View style={styles.textSection}>
								<Text style={styles.stageName}>{stageInfo.name}</Text>
								<Text style={styles.description}>{stageInfo.description}</Text>
							</View>
						</View>
						<View style={styles.rightSection}>
							<Text style={styles.xpText}>{xp} XP</Text>
							<Text style={styles.actionsText}>{completedActions} actions</Text>
						</View>
					</View>
				</LinearGradient>
			</TouchableOpacity>

			{/* Progress Bar */}
			<View style={styles.progressContainer}>
				<View style={styles.progressBar}>
					<View
						style={[styles.progressFill, { width: `${progressPercentage}%` }]}
					/>
				</View>
				<Text style={styles.progressText}>
					{progressPercentage >= 100
						? `${
								currentStage === 'tutorial'
									? 'Tutorial'
									: currentStage === 'level2'
									? 'Level 2'
									: 'Dynamic'
						  } completed!`
						: `${Math.round(progressPercentage)}% to next stage`}
				</Text>
			</View>

			{/* Next Stage Info */}
			{progressPercentage >= 100 &&
				progressionStatus?.nextStageRequirements?.stage && (
					<View style={styles.nextStageContainer}>
						<Text style={styles.nextStageText}>
							Next:{' '}
							{progressionStatus.nextStageRequirements.stage === 'level2'
								? 'Level 2 - Advanced Smart Actions'
								: progressionStatus.nextStageRequirements.stage === 'dynamic'
								? 'Dynamic Progression'
								: 'Unknown Stage'}
						</Text>
					</View>
				)}

			{/* Stage Requirements */}
			{progressionStatus?.nextStageRequirements && (
				<View style={styles.requirementsContainer}>
					<Text style={styles.requirementsTitle}>Next Stage Requirements:</Text>
					{progressionStatus.nextStageRequirements.requirements.map(
						(requirement: string, index: number) => (
							<View key={index} style={styles.requirementItem}>
								<Ionicons name="ellipse-outline" size={16} color="#666" />
								<Text style={styles.requirementText}>{requirement}</Text>
							</View>
						)
					)}
				</View>
			)}

			{/* Tutorial Steps Debug (only show in tutorial stage) */}
			{currentStage === 'tutorial' &&
				progressionStatus?.progression?.tutorialSteps && (
					<View style={styles.requirementsContainer}>
						<Text style={styles.requirementsTitle}>Tutorial Progress:</Text>
						{Object.entries(progressionStatus.progression.tutorialSteps).map(
							([step, completed]) => (
								<View key={step} style={styles.requirementItem}>
									<Ionicons
										name={completed ? 'checkmark-circle' : 'ellipse-outline'}
										size={16}
										color={completed ? '#4CAF50' : '#666'}
									/>
									<Text
										style={[
											styles.requirementText,
											completed && styles.requirementCompleted,
										]}
									>
										{step
											.replace(/([A-Z])/g, ' $1')
											.replace(/^./, (str) => str.toUpperCase())}
									</Text>
								</View>
							)
						)}
					</View>
				)}

			{/* Level 2 Progress Debug (only show in level2 stage) */}
			{currentStage === 'level2' && (
				<View style={styles.requirementsContainer}>
					<Text style={styles.requirementsTitle}>Level 2 Progress:</Text>
					<View style={styles.requirementItem}>
						<Ionicons
							name={
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
								1
									? 'checkmark-circle'
									: 'ellipse-outline'
							}
							size={16}
							color={
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
								1
									? '#4CAF50'
									: '#666'
							}
						/>
						<Text
							style={[
								styles.requirementText,
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
									1 && styles.requirementCompleted,
							]}
						>
							First Level 2 Action (
							{progressionStatus?.progression?.level2ActionsCompleted || 0}/1)
						</Text>
					</View>
					<View style={styles.requirementItem}>
						<Ionicons
							name={
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
								2
									? 'checkmark-circle'
									: 'ellipse-outline'
							}
							size={16}
							color={
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
								2
									? '#4CAF50'
									: '#666'
							}
						/>
						<Text
							style={[
								styles.requirementText,
								(progressionStatus?.progression?.level2ActionsCompleted || 0) >=
									2 && styles.requirementCompleted,
							]}
						>
							Second Level 2 Action (
							{progressionStatus?.progression?.level2ActionsCompleted || 0}/2)
						</Text>
					</View>
				</View>
			)}

			{/* Achievements */}
			{progressionStatus?.progression?.achievements &&
				progressionStatus.progression.achievements.length > 0 && (
					<View style={styles.achievementsContainer}>
						<Text style={styles.achievementsTitle}>Recent Achievements:</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							{progressionStatus.progression.achievements
								.slice(-3) // Show last 3 achievements
								.map((achievement, index) => (
									<View key={index} style={styles.achievementItem}>
										<Ionicons name="trophy" size={16} color="#FFD700" />
										<Text style={styles.achievementName}>
											{achievement.name}
										</Text>
									</View>
								))}
						</ScrollView>
					</View>
				)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	loadingContainer: {
		padding: 16,
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 14,
		color: '#666',
	},
	indicator: {
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 8,
	},
	gradient: {
		padding: 16,
	},
	content: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	textSection: {
		flex: 1,
	},
	stageName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
		marginBottom: 2,
	},
	description: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.8)',
	},
	rightSection: {
		alignItems: 'flex-end',
	},
	xpText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
		marginBottom: 2,
	},
	actionsText: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.8)',
	},
	progressContainer: {
		marginBottom: 12,
	},
	progressBar: {
		height: 4,
		backgroundColor: '#E0E0E0',
		borderRadius: 2,
		marginBottom: 4,
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#4CAF50',
		borderRadius: 2,
	},
	progressText: {
		fontSize: 12,
		color: '#666',
		textAlign: 'center',
	},
	nextStageContainer: {
		marginBottom: 12,
		padding: 8,
		backgroundColor: '#f0f8ff',
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: '#2196F3',
	},
	nextStageText: {
		fontSize: 12,
		color: '#2196F3',
		fontWeight: '500',
		textAlign: 'center',
	},
	requirementsContainer: {
		marginBottom: 12,
	},
	requirementsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	requirementItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	requirementText: {
		fontSize: 12,
		color: '#666',
		marginLeft: 8,
	},
	requirementCompleted: {
		color: '#4CAF50',
		textDecorationLine: 'line-through',
	},
	achievementsContainer: {
		marginBottom: 8,
	},
	achievementsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	achievementItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginRight: 8,
	},
	achievementName: {
		fontSize: 12,
		color: '#333',
		marginLeft: 4,
	},
});

export default ProgressionIndicator;
