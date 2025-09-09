/**
 * IntentMissingInfoCard Component
 * Displays targeted data collection form for missing information
 */

import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
} from 'react-native';

interface MissingSlot {
	id: string;
	label: string;
	description: string;
	required: boolean;
	priority: 'high' | 'medium' | 'low';
	examples: string[];
	placeholder: string;
	inputType: 'text' | 'number' | 'date' | 'select';
	options?: string[];
}

interface IntentMissingInfoCardProps {
	intent: string;
	missing: MissingSlot[];
	prefilled?: Record<string, any>;
	onSubmit: (data: Record<string, any>) => void;
	onCancel: () => void;
}

export default function IntentMissingInfoCard({
	intent,
	missing,
	prefilled = {},
	onSubmit,
	onCancel,
}: IntentMissingInfoCardProps) {
	const [formData, setFormData] = useState<Record<string, any>>(prefilled);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleInputChange = (fieldId: string, value: string | number) => {
		setFormData((prev) => ({
			...prev,
			[fieldId]: value,
		}));

		// Clear error when user starts typing
		if (errors[fieldId]) {
			setErrors((prev) => ({
				...prev,
				[fieldId]: '',
			}));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		missing.forEach((slot) => {
			if (slot.required && (!formData[slot.id] || formData[slot.id] === '')) {
				newErrors[slot.id] = `${slot.label} is required`;
			}

			// Validate number inputs
			if (slot.inputType === 'number' && formData[slot.id]) {
				const num = Number(formData[slot.id]);
				if (isNaN(num) || num <= 0) {
					newErrors[slot.id] = 'Please enter a valid positive number';
				}
			}
		});

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = () => {
		if (validateForm()) {
			onSubmit(formData);
		} else {
			Alert.alert(
				'Validation Error',
				'Please fill in all required fields correctly.'
			);
		}
	};

	const renderInput = (slot: MissingSlot) => {
		const value = formData[slot.id] || '';
		const error = errors[slot.id];

		switch (slot.inputType) {
			case 'number':
				return (
					<TextInput
						style={[styles.input, error && styles.inputError]}
						value={value.toString()}
						onChangeText={(text) => handleInputChange(slot.id, text)}
						placeholder={slot.placeholder}
						keyboardType="numeric"
						placeholderTextColor="#9ca3af"
					/>
				);

			case 'date':
				return (
					<TextInput
						style={[styles.input, error && styles.inputError]}
						value={value.toString()}
						onChangeText={(text) => handleInputChange(slot.id, text)}
						placeholder={slot.placeholder}
						placeholderTextColor="#9ca3af"
					/>
				);

			default:
				return (
					<TextInput
						style={[styles.input, error && styles.inputError]}
						value={value.toString()}
						onChangeText={(text) => handleInputChange(slot.id, text)}
						placeholder={slot.placeholder}
						placeholderTextColor="#9ca3af"
						multiline={slot.id.includes('description')}
						numberOfLines={slot.id.includes('description') ? 3 : 1}
					/>
				);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Missing Information</Text>
				<Text style={styles.subtitle}>
					I need a bit more information to help you with {intent}
				</Text>
			</View>

			<ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
				{missing.map((slot) => (
					<View key={slot.id} style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>
							{slot.label}
							{slot.required && <Text style={styles.required}> *</Text>}
						</Text>

						<Text style={styles.fieldDescription}>{slot.description}</Text>

						{renderInput(slot)}

						{errors[slot.id] && (
							<Text style={styles.errorText}>{errors[slot.id]}</Text>
						)}

						{slot.examples.length > 0 && (
							<Text style={styles.examples}>
								Examples: {slot.examples.join(', ')}
							</Text>
						)}
					</View>
				))}
			</ScrollView>

			<View style={styles.actions}>
				<TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
					<Text style={styles.cancelButtonText}>Cancel</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
					<Text style={styles.submitButtonText}>Continue</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		margin: 16,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		maxHeight: '80%',
	},
	header: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#6b7280',
	},
	form: {
		maxHeight: 400,
		padding: 20,
	},
	fieldContainer: {
		marginBottom: 20,
	},
	fieldLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 4,
	},
	required: {
		color: '#ef4444',
	},
	fieldDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: '#ffffff',
	},
	inputError: {
		borderColor: '#ef4444',
	},
	errorText: {
		color: '#ef4444',
		fontSize: 12,
		marginTop: 4,
	},
	examples: {
		fontSize: 12,
		color: '#9ca3af',
		fontStyle: 'italic',
		marginTop: 4,
	},
	actions: {
		flexDirection: 'row',
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		justifyContent: 'space-between',
	},
	cancelButton: {
		flex: 1,
		padding: 12,
		marginRight: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#d1d5db',
		alignItems: 'center',
	},
	cancelButtonText: {
		color: '#374151',
		fontSize: 16,
		fontWeight: '500',
	},
	submitButton: {
		flex: 1,
		padding: 12,
		marginLeft: 8,
		borderRadius: 8,
		backgroundColor: '#3b82f6',
		alignItems: 'center',
	},
	submitButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});
