import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Share,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface ExportReportButtonsProps {
	reportData: {
		period: string;
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: {
			used: number;
			total: number;
			percentage: number;
		};
		goalProgress: {
			name: string;
			current: number;
			target: number;
			percentage: number;
		};
		financialHealthScore: number;
		transactions: any[];
		budgets: any[];
		goals: any[];
	};
	onExport?: (type: 'pdf' | 'email') => void;
}

const ExportReportButtons: React.FC<ExportReportButtonsProps> = ({
	reportData,
	onExport,
}) => {
	const [exporting, setExporting] = useState(false);

	const generateReportText = () => {
		const {
			period,
			totalIncome,
			totalExpenses,
			netSavings,
			budgetUtilization,
			goalProgress,
			financialHealthScore,
		} = reportData;

		return `
Financial Report - ${
			period.charAt(0).toUpperCase() + period.slice(1)
		} ${new Date().getFullYear()}

SUMMARY
• Total Income: $${totalIncome.toFixed(2)}
• Total Expenses: $${totalExpenses.toFixed(2)}
• Net Savings: $${netSavings.toFixed(2)}
		• Budget Utilization: ${budgetUtilization.percentage.toFixed(1)}%
		• Goal Progress: ${goalProgress.percentage.toFixed(1)}%
• Financial Health Score: ${financialHealthScore.toFixed(0)}%

TOP TRANSACTIONS
${reportData.transactions
	.slice(0, 10)
	.map(
		(tx) =>
			`• ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)} - ${
				tx.description || 'Transaction'
			} (${new Date(tx.date).toLocaleDateString()})`
	)
	.join('\n')}

BUDGET STATUS
${reportData.budgets
	.map(
		(budget) =>
			`• ${budget.category}: $${budget.spent.toFixed(
				2
			)} / $${budget.amount.toFixed(2)} (${(
				(budget.spent / budget.amount) *
				100
			).toFixed(1)}%)`
	)
	.join('\n')}

GOAL PROGRESS
${reportData.goals
	.map(
		(goal) =>
			`• ${goal.name}: $${goal.current.toFixed(2)} / $${goal.target.toFixed(
				2
			)} (${((goal.current / goal.target) * 100).toFixed(1)}%)`
	)
	.join('\n')}

Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
		`.trim();
	};

	const exportToPDF = async () => {
		try {
			setExporting(true);

			// Generate report content
			const reportContent = generateReportText();

			// Create a simple text file (in a real app, you'd use a PDF library)
			const fileName = `financial-report-${reportData.period}-${
				new Date().toISOString().split('T')[0]
			}.txt`;
			const fileUri = `${FileSystem.documentDirectory}${fileName}`;

			await FileSystem.writeAsStringAsync(fileUri, reportContent);

			// Check if sharing is available
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(fileUri, {
					mimeType: 'text/plain',
					dialogTitle: 'Share Financial Report',
				});
			} else {
				Alert.alert('Success', 'Report saved to device');
			}

			onExport?.('pdf');
		} catch (error) {
			console.error('Export error:', error);
			Alert.alert('Error', 'Failed to export report. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const shareViaEmail = async () => {
		try {
			setExporting(true);

			const reportContent = generateReportText();
			const subject = `Financial Report - ${
				reportData.period.charAt(0).toUpperCase() + reportData.period.slice(1)
			} ${new Date().getFullYear()}`;

			await Share.share({
				message: `${subject}\n\n${reportContent}`,
				title: subject,
			});

			onExport?.('email');
		} catch (error) {
			console.error('Share error:', error);
			Alert.alert('Error', 'Failed to share report. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const getHealthScoreColor = (score: number) => {
		if (score >= 80) return '#4CAF50';
		if (score >= 60) return '#FF9800';
		return '#F44336';
	};

	const getHealthScoreIcon = (score: number) => {
		if (score >= 80) return 'checkmark-circle';
		if (score >= 60) return 'warning';
		return 'alert-circle';
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Export & Share</Text>

			{/* Quick Stats */}
			<View style={styles.quickStats}>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Health Score</Text>
					<View style={styles.statValue}>
						<Ionicons
							name={getHealthScoreIcon(reportData.financialHealthScore)}
							size={16}
							color={getHealthScoreColor(reportData.financialHealthScore)}
						/>
						<Text
							style={[
								styles.statText,
								{ color: getHealthScoreColor(reportData.financialHealthScore) },
							]}
						>
							{reportData.financialHealthScore.toFixed(0)}%
						</Text>
					</View>
				</View>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Net Savings</Text>
					<Text
						style={[
							styles.statText,
							{ color: reportData.netSavings >= 0 ? '#4CAF50' : '#FF6B6B' },
						]}
					>
						${reportData.netSavings.toFixed(0)}
					</Text>
				</View>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Transactions</Text>
					<Text style={styles.statText}>{reportData.transactions.length}</Text>
				</View>
			</View>

			{/* Export Buttons */}
			<View style={styles.exportButtons}>
				<TouchableOpacity
					style={[styles.exportButton, styles.pdfButton]}
					onPress={exportToPDF}
					disabled={exporting}
				>
					{exporting ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<>
							<Ionicons name="document-text" size={20} color="#fff" />
							<Text style={styles.exportButtonText}>Download PDF</Text>
						</>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.exportButton, styles.emailButton]}
					onPress={shareViaEmail}
					disabled={exporting}
				>
					{exporting ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<>
							<Ionicons name="mail" size={20} color="#fff" />
							<Text style={styles.exportButtonText}>Share via Email</Text>
						</>
					)}
				</TouchableOpacity>
			</View>

			{/* Report Preview */}
			<View style={styles.previewSection}>
				<Text style={styles.previewTitle}>Report Preview</Text>
				<View style={styles.previewContent}>
					<Text style={styles.previewText} numberOfLines={6}>
						{generateReportText()}
					</Text>
				</View>
				<Text style={styles.previewNote}>
					* Full report includes detailed breakdowns and charts
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
		color: '#333',
	},
	quickStats: {
		flexDirection: 'row',
		marginBottom: 20,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
		padding: 12,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		marginHorizontal: 4,
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	statValue: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	statText: {
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 4,
	},
	exportButtons: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 20,
	},
	exportButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		gap: 8,
	},
	pdfButton: {
		backgroundColor: '#2E78B7',
	},
	emailButton: {
		backgroundColor: '#4CAF50',
	},
	exportButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	previewSection: {
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		padding: 12,
	},
	previewTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	previewContent: {
		backgroundColor: '#fff',
		borderRadius: 6,
		padding: 12,
		marginBottom: 8,
	},
	previewText: {
		fontSize: 12,
		color: '#666',
		lineHeight: 16,
		fontFamily: 'monospace',
	},
	previewNote: {
		fontSize: 11,
		color: '#999',
		fontStyle: 'italic',
	},
});

export default ExportReportButtons;
