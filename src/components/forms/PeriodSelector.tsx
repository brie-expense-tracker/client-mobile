import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PeriodOption {
	value: string;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
}

interface PeriodSelectorProps {
	options: readonly PeriodOption[];
	selectedPeriod: string;
	onPeriodSelect: (period: string) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
	options,
	selectedPeriod,
	onPeriodSelect,
}) => {
	return (
		<View style={styles.periodContainer}>
			{options.map((option) => {
				const isSelected = selectedPeriod === option.value;
				return (
					<TouchableOpacity
						key={option.value}
						style={[
							styles.periodOption,
							isSelected && styles.selectedPeriodOption,
						]}
						onPress={() => onPeriodSelect(option.value)}
					>
						<View style={styles.periodOptionContent}>
							<Ionicons
								name={option.icon}
								size={20}
								color={isSelected ? '#fff' : '#007ACC'}
							/>
							<Text
								style={[
									styles.periodOptionText,
									isSelected && styles.selectedPeriodOptionText,
								]}
							>
								{option.label}
							</Text>
						</View>
					</TouchableOpacity>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	periodContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	periodOption: {
		flexGrow: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		minWidth: '47%',
	},
	selectedPeriodOption: {
		borderColor: '#007ACC',
		backgroundColor: '#007ACC',
	},
	periodOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	periodOptionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPeriodOptionText: {
		color: '#fff',
		fontWeight: '600',
	},
});
