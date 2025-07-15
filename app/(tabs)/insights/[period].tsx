// app/(tabs)/insights/[period].tsx

import React, { useEffect, useState } from 'react';
import {
	SafeAreaView,
	Text,
	ActivityIndicator,
	StyleSheet,
	ScrollView,
	Alert,
	View,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import HistoricalComparison from '../../../src/components/HistoricalComparison';

export default function InsightDetail() {
	const router = useRouter();
	const { period } = useLocalSearchParams<{
		period: 'daily' | 'weekly' | 'monthly';
	}>();
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeStep, setActiveStep] = useState(0);
	const [completedActions, setCompletedActions] = useState<boolean[]>([]);

	useEffect(() => {
		async function load() {
			try {
				const res = await InsightsService.getInsights(period);
				const data =
					res.success && Array.isArray(res.data) && res.data.length > 0
						? res.data
						: ((await InsightsService.generateInsights(period))
								.data as AIInsight[]);
				setInsights(data);
			} catch (err) {
				console.warn(err);
				Alert.alert('Error', 'Could not load insights.');
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [period]);

	// Initialize completedActions when insight is available
	useEffect(() => {
		if (insights.length > 0 && insights[0]?.isActionable) {
			setCompletedActions(Array(insights[0].actionItems.length).fill(false));
		}
	}, [insights]);

	// Mark insights as read when they are viewed
	useEffect(() => {
		const markInsightsAsRead = async () => {
			if (insights.length > 0) {
				try {
					// Mark all insights as read
					const markPromises = insights
						.filter((insight) => !insight.isRead)
						.map((insight) => InsightsService.markInsightAsRead(insight._id));

					if (markPromises.length > 0) {
						await Promise.all(markPromises);

						// Update local state to mark as read
						setInsights((prevInsights) =>
							prevInsights.map((insight) => ({ ...insight, isRead: true }))
						);
					}
				} catch (error) {
					console.error('Error marking insights as read:', error);
				}
			}
		};

		// Mark as read after a short delay to ensure the screen is fully loaded
		const timer = setTimeout(markInsightsAsRead, 500);
		return () => clearTimeout(timer);
	}, [insights]);

	if (loading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
			</SafeAreaView>
		);
	}

	if (insights.length === 0) {
		return (
			<SafeAreaView style={styles.center}>
				<MaterialCommunityIcons
					name="clipboard-text-off"
					size={48}
					color="#ccc"
				/>
				<Text style={styles.emptyTitle}>No insights yet</Text>
				<Text style={styles.emptyText}>
					Add transactions to get personalized tips.
				</Text>
			</SafeAreaView>
		);
	}

	// We'll guide through the first insight step-by-step
	const insight = insights[0];

	// Calculate steps array
	const steps: ('intro' | 'details' | 'actions' | 'summary' | 'comparison')[] =
		['intro', 'details'];
	if (insight?.isActionable) steps.push('actions');
	if (insight?.metadata) steps.push('summary');
	if (insight?.metadata?.historicalComparison) steps.push('comparison');
	const totalSteps = steps.length;

	const toggleAction = (i: number) => {
		const copy = [...completedActions];
		copy[i] = !copy[i];
		setCompletedActions(copy);
	};

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const headerDate = insight.generatedAt
		? new Date(insight.generatedAt).toLocaleDateString()
		: '';

	// Progress bar width
	const progressPercent = ((activeStep + 1) / totalSteps) * 100;

	// Render current step
	const renderStep = () => {
		const step = steps[activeStep];
		switch (step) {
			case 'intro':
				return (
					<View style={styles.stepContainer}>
						<Text style={styles.stepTitle}>{insight.title}</Text>
						<Text style={styles.stepMessage}>{insight.message}</Text>
					</View>
				);
			case 'details':
				return (
					<View style={styles.stepContainer}>
						<Text style={styles.sectionTitle}>Details</Text>
						<Text style={styles.bodyText}>{insight.detailedExplanation}</Text>
					</View>
				);
			case 'actions':
				return (
					<View style={styles.stepContainer}>
						<Text style={styles.sectionTitle}>{"Let's take action"}</Text>
						{insight.actionItems.map((a, i) => (
							<RectButton
								key={i}
								style={styles.checkboxRow}
								onPress={() => toggleAction(i)}
							>
								<MaterialCommunityIcons
									name={
										completedActions[i]
											? 'checkbox-marked'
											: 'checkbox-blank-outline'
									}
									size={24}
									color="#4A90E2"
								/>
								<View style={styles.checkboxContent}>
									<Text style={styles.actionTitle}>{a.title}</Text>
									<Text style={styles.bodyText}>{a.description}</Text>
								</View>
							</RectButton>
						))}
					</View>
				);
			case 'summary':
				return (
					<View style={styles.stepContainer}>
						<Text style={styles.sectionTitle}>Your Summary</Text>
						{insight.metadata ? (
							<>
								<MetadataRow
									label="Income"
									icon="arrow-down"
									value={`$${insight.metadata.totalIncome.toFixed(2)}`}
								/>
								<MetadataRow
									label="Expenses"
									icon="arrow-up"
									value={`$${insight.metadata.totalExpenses.toFixed(2)}`}
								/>
								<MetadataRow
									label="Net"
									icon={
										insight.metadata.netIncome >= 0 ? 'arrow-up' : 'arrow-down'
									}
									value={`$${insight.metadata.netIncome.toFixed(2)}`}
									valueStyle={{
										color:
											insight.metadata.netIncome >= 0 ? '#66BB6A' : '#FF6B6B',
									}}
								/>
							</>
						) : (
							<Text style={styles.bodyText}>
								No summary data available for this insight.
							</Text>
						)}
					</View>
				);
			case 'comparison':
				return (
					<View style={styles.stepContainer}>
						<Text style={styles.sectionTitle}>Historical Comparison</Text>
						{insight.metadata?.historicalComparison ? (
							<HistoricalComparison
								historicalComparison={insight.metadata.historicalComparison}
								period={period}
							/>
						) : (
							<Text style={styles.bodyText}>
								No historical comparison data available for this period.
							</Text>
						)}
					</View>
				);
		}
	};

	return (
		<View style={styles.container}>
			<LinearGradient
				colors={['#4A90E2', '#50C9CE']}
				style={styles.gradientHeader}
			>
				<Text style={styles.headerTitle}>{cap(period)} Guide</Text>
				{headerDate ? (
					<Text style={styles.headerDate}>Generated on {headerDate}</Text>
				) : null}
			</LinearGradient>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
			>
				{/* Step Content */}
				{renderStep()}
			</ScrollView>

			{/* Navigation Buttons - Fixed at bottom */}
			<View style={styles.navContainer}>
				{/* Progress Bar */}
				<View style={styles.progressBarContainer}>
					<View
						style={[styles.progressBar, { width: `${progressPercent}%` }]}
					/>
				</View>

				<View style={styles.navRow}>
					<RectButton
						onPress={() => setActiveStep((s) => Math.max(s - 1, 0))}
						enabled={activeStep !== 0}
						style={[styles.navButton, activeStep === 0 && styles.navDisabled]}
					>
						<Text style={styles.navText}>Back</Text>
					</RectButton>

					{activeStep < totalSteps - 1 ? (
						<RectButton
							onPress={() => setActiveStep((s) => s + 1)}
							style={styles.navButton}
						>
							<Text style={styles.navText}>Next</Text>
						</RectButton>
					) : (
						<RectButton
							onPress={() => {
								Alert.alert(
									'Great job!',
									"You've completed this insight guide.",
									[
										{
											text: 'OK',
											onPress: () => router.push('/insights'),
										},
									]
								);
							}}
							style={styles.navButton}
						>
							<Text style={styles.navText}>Finish</Text>
						</RectButton>
					)}
				</View>
			</View>
		</View>
	);
}

// Reusable sub-components
function MetadataRow({
	label,
	value,
	icon,
	valueStyle,
}: {
	label: string;
	value: string;
	icon: React.ComponentProps<typeof FontAwesome>['name'];
	valueStyle?: object;
}) {
	return (
		<View style={styles.metaRow}>
			<View style={styles.metaLabelRow}>
				<FontAwesome
					name={icon}
					size={14}
					color="#555"
					style={{ marginRight: 4 }}
				/>
				<Text style={styles.metaLabel}>{label}</Text>
			</View>
			<Text style={[styles.metaValue, valueStyle]}>{value}</Text>
		</View>
	);
}

// Styles
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	scrollView: { flex: 1 },
	content: { paddingBottom: 100 }, // Add extra padding to account for fixed nav buttons
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyTitle: { fontSize: 20, fontWeight: '600', color: '#999', marginTop: 12 },
	emptyText: {
		fontSize: 14,
		color: '#bbb',
		textAlign: 'center',
		marginHorizontal: 16,
	},

	gradientHeader: {
		padding: 16,
		paddingTop: 80,
		marginBottom: 16,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerTitle: { fontSize: 32, fontWeight: '700', color: '#fff' },
	headerDate: { fontSize: 14, color: '#e0eaf0', marginTop: 4 },

	progressBarContainer: {
		height: 4,
		backgroundColor: '#ddd',
		marginHorizontal: 16,
		borderRadius: 2,
		overflow: 'hidden',
		marginBottom: 16,
	},
	progressBar: { height: 4, backgroundColor: '#4A90E2' },

	stepContainer: { paddingHorizontal: 16, marginBottom: 24 },
	stepTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#222',
		marginBottom: 12,
	},
	stepMessage: { fontSize: 16, color: '#555', lineHeight: 22 },

	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	bodyText: { fontSize: 14, color: '#555', lineHeight: 20 },

	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12,
		paddingHorizontal: 16,
	},
	checkboxContent: { marginLeft: 12, flex: 1 },

	actionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#222',
		marginBottom: 4,
	},

	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	metaLabelRow: { flexDirection: 'row', alignItems: 'center' },
	metaLabel: { fontSize: 14, color: '#555' },
	metaValue: { fontSize: 14, fontWeight: '600', color: '#333' },

	navContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#ffffff',
		paddingVertical: 16,
		paddingBottom: 32, // Extra padding for safe area
	},
	navRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	navButton: {
		backgroundColor: '#4A90E2',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 24,
	},
	navDisabled: { backgroundColor: '#aacbe1' },
	navText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
