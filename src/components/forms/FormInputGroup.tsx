import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FormInputGroupProps {
	label: string;
	subtext?: string;
	children: React.ReactNode;
}

export const FormInputGroup: React.FC<FormInputGroupProps> = ({
	label,
	subtext,
	children,
}) => {
	return (
		<View style={styles.inputGroup}>
			<Text style={styles.label}>{label}</Text>
			{subtext && <Text style={styles.subtext}>{subtext}</Text>}
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	inputGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 8,
	},
	subtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
});
