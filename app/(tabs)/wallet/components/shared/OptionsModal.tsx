import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import CustomSlidingModal from './CustomSlidingModal';

type Option = {
	id: string;
	text: string;
	icon: keyof typeof Ionicons.glyphMap;
	iconColor: string;
	textColor?: string;
	onPress: () => void;
};

type OptionsModalProps = {
	isVisible: boolean;
	onClose: () => void;
	title: string;
	icon: keyof typeof Ionicons.glyphMap;
	options: Option[];
};

const OptionsModal: React.FC<OptionsModalProps> = ({
	isVisible,
	onClose,
	title,
	icon,
	options,
}) => {
	return (
		<CustomSlidingModal
			isVisible={isVisible}
			onClose={onClose}
			title={title}
			icon={icon}
		>
			<View style={styles.content}>
				{options.map((option) => (
					<RectButton
						key={option.id}
						style={styles.optionButton}
						onPress={option.onPress}
					>
						<View style={styles.optionContent}>
							<Ionicons name={option.icon} size={20} color={option.iconColor} />
							<Text
								style={[
									styles.optionText,
									option.textColor && { color: option.textColor },
								]}
							>
								{option.text}
							</Text>
						</View>
					</RectButton>
				))}
			</View>
		</CustomSlidingModal>
	);
};

const styles = StyleSheet.create({
	content: {
		alignItems: 'center',
	},
	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},
	optionContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	optionText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		marginLeft: 12,
	},
});

export default OptionsModal;
