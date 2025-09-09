import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeeklyReflection } from '../../../../src/services';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface WeeklyReflectionCardProps {
	reflection: WeeklyReflection | null;
	onSave: (data: any) => Promise<void>;
	saving: boolean;
	children: React.ReactNode;
}

export function WeeklyReflectionCard({
	reflection,
	onSave,
	saving,
	children,
}: WeeklyReflectionCardProps) {
	// Early return if reflection is null or undefined
	if (!reflection) {
		return null;
	}

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const getWeekDescription = () => {
		const startDate = formatDate(reflection.weekStartDate);
		const endDate = formatDate(reflection.weekEndDate);
		return `Week of ${startDate} - ${endDate}`;
	};

	const getCompletionStatus = () => {
		if (reflection.completed) {
			return 'Completed';
		}

		const completedFields = [
			reflection.moodRating,
			reflection.winOfTheWeek,
			reflection.reflectionNotes,
		].filter(Boolean).length;

		return `${completedFields}/3 fields completed`;
	};

	return (
		<View style={styles.card}>
			<View style={styles.cardHeader}>
				<View style={styles.headerContent}>
					<Text style={[styles.weekDescription, dynamicTextStyle]}>
						{getWeekDescription()}
					</Text>
					<Text style={[styles.completionStatus, dynamicTextStyle]}>
						{getCompletionStatus()}
					</Text>
				</View>
				<View style={styles.statusIndicator}>
					<View
						style={[
							styles.statusDot,
							{
								backgroundColor: reflection.completed ? '#4CAF50' : '#FFC107',
							},
						]}
					/>
				</View>
			</View>

			<View style={styles.cardContent}>{children}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 20,
	},
	headerContent: {
		flex: 1,
	},
	weekDescription: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	completionStatus: {
		fontSize: 14,
		color: '#666',
	},
	statusIndicator: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	cardContent: {
		gap: 20,
	},
});

export default WeeklyReflectionCard;
