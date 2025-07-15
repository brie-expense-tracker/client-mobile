import React from 'react';
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SummaryCardsProps {
	data: {
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
	};
	onCardPress?: (cardType: string) => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, onCardPress }) => {
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

	const cards = [
		{
			id: 'income',
			title: 'Income',
			value: `$${data.totalIncome.toFixed(0)}`,
			icon: 'trending-up',
			color: '#4CAF50',
			backgroundColor: '#4CAF50' + '15',
		},
		{
			id: 'expenses',
			title: 'Expenses',
			value: `$${data.totalExpenses.toFixed(0)}`,
			icon: 'trending-down',
			color: '#FF6B6B',
			backgroundColor: '#FF6B6B' + '15',
		},
		{
			id: 'savings',
			title: 'Net Savings',
			value: `$${data.netSavings.toFixed(0)}`,
			icon: 'wallet',
			color: '#2E78B7',
			backgroundColor: '#2E78B7' + '15',
		},
		{
			id: 'budget',
			title: 'Budget Used',
			value: `${data.budgetUtilization.percentage.toFixed(0)}%`,
			subtitle: `$${data.budgetUtilization.used.toFixed(
				0
			)} / $${data.budgetUtilization.total.toFixed(0)}`,
			icon: 'pie-chart',
			color: data.budgetUtilization.percentage > 90 ? '#F44336' : '#FF9800',
			backgroundColor:
				(data.budgetUtilization.percentage > 90 ? '#F44336' : '#FF9800') + '15',
		},
		{
			id: 'goal',
			title: 'Goal Progress',
			value: `${data.goalProgress.percentage.toFixed(0)}%`,
			subtitle: data.goalProgress.name,
			icon: 'flag',
			color: '#9C27B0',
			backgroundColor: '#9C27B0' + '15',
		},
		{
			id: 'health',
			title: 'Health Score',
			value: `${data.financialHealthScore.toFixed(0)}%`,
			icon: getHealthScoreIcon(data.financialHealthScore),
			color: getHealthScoreColor(data.financialHealthScore),
			backgroundColor: getHealthScoreColor(data.financialHealthScore) + '15',
		},
	];

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.container}
		>
			{cards.map((card) => (
				<TouchableOpacity
					key={card.id}
					style={[styles.card, { backgroundColor: card.backgroundColor }]}
					onPress={() => onCardPress?.(card.id)}
				>
					<View style={styles.cardHeader}>
						<Ionicons name={card.icon as any} size={20} color={card.color} />
						<Text style={[styles.cardTitle, { color: card.color }]}>
							{card.title}
						</Text>
					</View>
					<Text style={[styles.cardValue, { color: card.color }]}>
						{card.value}
					</Text>
					{card.subtitle && (
						<Text style={[styles.cardSubtitle, { color: card.color }]}>
							{card.subtitle}
						</Text>
					)}
				</TouchableOpacity>
			))}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	card: {
		width: 140,
		padding: 16,
		borderRadius: 12,
		marginRight: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	cardTitle: {
		marginLeft: 8,
		fontSize: 12,
		fontWeight: '600',
	},
	cardValue: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 10,
		fontWeight: '400',
		opacity: 0.8,
	},
});

export default SummaryCards;
