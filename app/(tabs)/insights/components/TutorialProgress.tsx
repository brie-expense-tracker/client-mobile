import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTutorialProgress } from '../../../../src/hooks/useTutorialProgress';
import { useTransactionModal } from '../../../../src/context/transactionModalContext';

interface TutorialProgressProps {
	onTutorialCompleted?: () => void;
}

const TutorialProgress: React.FC<TutorialProgressProps> = ({
	onTutorialCompleted,
}) => {
	const [processingStep, setProcessingStep] = useState<string | null>(null);
	const { showTransactionModal } = useTransactionModal();

	// Use the custom hook for all tutorial progress logic
	const {
		tutorialSteps,
		completionStats,
		progressPercentage,
		loading,
		refreshing,
		isTutorialCompleted,
		getStepStatus,
		checkProgression,
	} = useTutorialProgress();

	// Debug logging for loading state
	console.log('📱 TutorialProgress: Loading state:', {
		loading,
		refreshing,
		isTutorialCompleted,
		stepsCount: tutorialSteps.length,
		completionStats,
	});

	// Debug logging for tutorial completion check
	console.log('📱 TutorialProgress: Tutorial completion check:', {
		isTutorialCompleted,
		completionStats,
		allStepsCompleted: completionStats.completed === completionStats.total,
	});

	// Add navigation actions to tutorial steps
	const stepsWithActions = tutorialSteps.map((step) => ({
		...step,
		action: () => {
			switch (step.id) {
				case 'firstTutorialAction':
					showTransactionModal();
					break;
				case 'secondTutorialAction':
					router.push('/(tabs)/budgets?openModal=true&tab=budgets');
					break;
				case 'thirdTutorialAction':
					router.push('/(tabs)/budgets/goals?openModal=true&tab=goals');
					break;
				case 'fourthTutorialAction':
					router.push('/(stack)/settings/aiInsights');
					break;
				default:
					break;
			}
		},
	}));

	const handleStepPress = async (stepId: string, action: () => void) => {
		// Set processing state
		setProcessingStep(stepId);

		// Execute the action
		action();

		// Check progression after a short delay to allow for action completion
		setTimeout(async () => {
			try {
				// Check progression (server now automatically updates when actions are completed)
				await checkProgression();

				// Check if this specific step was completed
				const stepStatus = getStepStatus(stepId);
				if (stepStatus === 'completed') {
					// Show immediate feedback for step completion
					setTimeout(() => {
						Alert.alert(
							'✅ Step Completed!',
							`Great job! You've completed "${
								stepsWithActions.find((s) => s.id === stepId)?.title
							}".`,
							[{ text: 'Continue' }]
						);
					}, 100);

					// Check if this was the final step that completed the tutorial
					// Use the same logic as getStepStatus to check if tutorial is now complete
					const stepStatuses = tutorialSteps.map((step) => ({
						id: step.id,
						status: getStepStatus(step.id),
					}));
					const allStepsCompleted = stepStatuses.every(
						(step) => step.status === 'completed'
					);

					console.log('🔍 Tutorial completion check:', {
						stepStatuses,
						allStepsCompleted,
						isTutorialCompleted: isTutorialCompleted,
					});

					if (allStepsCompleted) {
						// Show tutorial completion alert immediately
						setTimeout(() => {
							Alert.alert(
								'🎉 Tutorial Completed!',
								"Congratulations! You've completed the tutorial and unlocked weekly updates. You'll now receive personalized financial insights and recommendations.",
								[
									{
										text: 'Show My Insights!',
										onPress: async () => {
											try {
												// Force progression update first
												console.log(
													'🔄 Updating progression before calling completion callback...'
												);
												await checkProgression();

												// Call the completion callback to trigger insight generation in parent
												console.log(
													'📱 TutorialProgress: Calling completion callback'
												);
												onTutorialCompleted?.();
											} catch (error) {
												console.error('Error updating progression:', error);
												// Still proceed even if progression update fails
												onTutorialCompleted?.();
											}
										},
									},
								]
							);
						}, 500); // Small delay to ensure step completion alert is shown first
					}
				}
			} catch (error) {
				console.error(
					'Error checking progression after step completion:',
					error
				);
			} finally {
				setProcessingStep(null);
			}
		}, 2000);
	};

	// Global refresh function - now only needed for manual refresh
	const handleGlobalRefresh = async () => {
		try {
			console.log('📱 TutorialProgress: Manual global refresh requested');
			await checkProgression();
		} catch (error) {
			console.error('Error during global refresh:', error);
			// Only show error alert if refresh fails
			Alert.alert(
				'Refresh Error',
				'Failed to refresh tutorial progress. Please try again.'
			);
		}
	};

	// Targeted refresh function for pull-to-refresh (only refreshes tutorial data)
	const handleScrollableRefresh = async () => {
		try {
			console.log('📱 TutorialProgress: Pull-to-refresh requested');
			// Only refresh progression and profile data, not transactions
			await checkProgression();
			// Don't refresh transactions to avoid triggering parent screen refresh
		} catch (error) {
			console.error('Error during scrollable refresh:', error);
		}
	};

	if (loading) {
		console.log('📱 TutorialProgress: Showing loading state');
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#2E78B7" />
				<Text style={styles.loadingText}>Loading tutorial progress...</Text>
			</View>
		);
	}

	// Show completed state if tutorial is completed or all steps are completed
	if (
		isTutorialCompleted ||
		completionStats.completed === completionStats.total
	) {
		return (
			<View style={styles.completedContainer}>
				<View style={styles.completedIcon}>
					<Ionicons name="checkmark-circle" size={64} color="#66BB6A" />
				</View>
				<Text style={styles.completedTitle}>Tutorial Completed! 🎉</Text>
				<Text style={styles.completedDescription}>
					You&apos;ve successfully completed all tutorial steps. Weekly updates
					are now enabled and you&apos;ll receive personalized financial
					insights.
				</Text>
				<TouchableOpacity
					style={styles.refreshCompletedButton}
					onPress={async () => {
						try {
							console.log(
								'📱 TutorialProgress: Manual insight generation requested'
							);
							// Call the completion callback to trigger insight generation in parent
							await checkProgression();
							onTutorialCompleted?.();
						} catch (error) {
							console.error('Error during manual insight generation:', error);
							// Still proceed even if there's an error
							onTutorialCompleted?.();
						}
					}}
				>
					<Text style={styles.refreshCompletedButtonText}>
						Generate My Insights
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.scrollContent}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleScrollableRefresh}
					colors={['#2E78B7']}
					tintColor="#2E78B7"
				/>
			}
		>
			<View style={styles.header}>
				<Text style={styles.title}>Complete the Tutorial</Text>
				<Text style={styles.subtitle}>
					Follow these steps to unlock weekly updates and personalized insights
				</Text>
			</View>

			{/* Progress Summary Section */}
			<View style={styles.progressSummary}>
				<View style={styles.summaryHeader}>
					<Text style={styles.summaryTitle}>Progress Summary</Text>
					<TouchableOpacity
						onPress={handleGlobalRefresh}
						disabled={refreshing}
						style={styles.refreshButton}
					>
						{refreshing ? (
							<ActivityIndicator size="small" color="#2E78B7" />
						) : (
							<Ionicons name="refresh" size={16} color="#2E78B7" />
						)}
					</TouchableOpacity>
				</View>
				<View style={styles.progressBar}>
					<View
						style={[styles.progressFill, { width: `${progressPercentage}%` }]}
					/>
				</View>

				<View style={styles.statsRow}>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>{completionStats.completed}</Text>
						<Text style={styles.statLabel}>Completed</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>{completionStats.pending}</Text>
						<Text style={styles.statLabel}>Pending</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>{completionStats.percentage}%</Text>
						<Text style={styles.statLabel}>Progress</Text>
					</View>
				</View>
			</View>

			<View style={styles.stepsContainer}>
				{stepsWithActions.map((step, index) => {
					const status = getStepStatus(step.id);
					const isCompleted = status === 'completed';
					const isProcessing = processingStep === step.id;

					return (
						<TouchableOpacity
							key={step.id}
							style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}
							onPress={() => handleStepPress(step.id, step.action)}
							disabled={isCompleted || isProcessing}
						>
							{/* Processing Banner */}
							{isProcessing && (
								<View style={styles.processingBanner}>
									<ActivityIndicator size="small" color="#2E78B7" />
									<Text style={styles.processingBannerText}>Processing...</Text>
								</View>
							)}

							{/* Completion Banner */}
							{isCompleted && (
								<View style={styles.completionBanner}>
									<Text style={styles.completionBannerText}>
										Step Completed
									</Text>
								</View>
							)}

							<View style={styles.stepHeader}>
								<View
									style={[
										styles.stepIcon,
										isCompleted && styles.stepIconCompleted,
									]}
								>
									{isCompleted ? (
										<Ionicons name="checkmark" size={20} color="#fff" />
									) : (
										<Ionicons
											name={step.icon as any}
											size={20}
											color="#2E78B7"
										/>
									)}
								</View>
								<View style={styles.stepInfo}>
									<Text
										style={[
											styles.stepTitle,
											isCompleted && styles.stepTitleCompleted,
										]}
									>
										{step.title}
									</Text>
									<Text
										style={[
											styles.stepDescription,
											isCompleted && styles.stepDescriptionCompleted,
										]}
									>
										{step.description}
									</Text>
								</View>
								{isCompleted ? (
									<></>
								) : isProcessing ? (
									<ActivityIndicator size="small" color="#2E78B7" />
								) : (
									<Ionicons name="chevron-forward" size={20} color="#666" />
								)}
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollContent: {
		flexGrow: 1,
	},
	loadingText: {
		textAlign: 'center',
		fontSize: 16,
		color: '#666',
		marginTop: 40,
	},
	completedContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: '#fff',
	},
	completedIcon: {
		marginBottom: 24,
	},
	completedTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
		textAlign: 'center',
	},
	completedDescription: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
	},
	transitionText: {
		fontSize: 14,
		color: '#2E78B7',
		textAlign: 'center',
		fontStyle: 'italic',
		marginTop: 16,
	},
	refreshCompletedButton: {
		backgroundColor: '#2E78B7',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 8,
	},
	refreshCompletedButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	header: {
		padding: 24,
		paddingBottom: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		lineHeight: 22,
	},
	progressSummary: {
		paddingHorizontal: 24,
		paddingBottom: 24,
	},
	summaryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	summaryTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	refreshButton: {
		padding: 8,
	},
	progressBar: {
		height: 8,
		backgroundColor: '#f0f0f0',
		borderRadius: 4,
		marginBottom: 8,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#2E78B7',
		borderRadius: 4,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 8,
	},
	statItem: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 18,
		fontWeight: '700',
		color: '#333',
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	profileNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e3f2fd',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginHorizontal: 24,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#2E78B7',
	},
	profileNoticeText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#2E78B7',
		flex: 1,
	},
	stepsContainer: {
		flex: 1,
		paddingHorizontal: 24,
	},
	stepCard: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	stepCardCompleted: {
		backgroundColor: '#f0f9ff',
		borderColor: '#2E78B7',
	},
	stepHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	stepIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#e3f2fd',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	stepIconCompleted: {
		backgroundColor: '#66BB6A',
	},
	stepInfo: {
		flex: 1,
	},
	stepTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	stepTitleCompleted: {
		color: '#2E78B7',
	},
	stepDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	stepDescriptionCompleted: {
		color: '#2E78B7',
	},
	processingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e0f2f7',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#b6e3ff',
	},
	processingBannerText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#2E78B7',
		fontWeight: '600',
	},
	completionBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e8f5e9',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#a5d6a7',
	},
	completionBannerText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#4CAF50',
		fontWeight: '600',
	},
});

export default TutorialProgress;
