import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ColorSchemeName,
	useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type CustomSlidingModalProps = {
	isVisible: boolean;
	onClose: () => void;
	title?: string;
	icon?: keyof typeof Ionicons.glyphMap;
	children: React.ReactNode;
};

const CustomSlidingModal: React.FC<CustomSlidingModalProps> = ({
	isVisible,
	onClose,
	title = 'Details',
	icon = 'information-circle-outline',
	children,
}) => {
	const colorScheme: ColorSchemeName = useColorScheme();
	const isDark = colorScheme === 'dark';

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={onClose}
			style={styles.modal}
			backdropOpacity={0.4}
			useNativeDriver
		>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View
					style={[
						styles.container,
						{
							backgroundColor: isDark ? '#121212' : '#fff',
						},
					]}
				>
					<View>
						<View style={styles.dragHandle} />

						{/* Header */}
						<View style={styles.header}>
							<View
								style={[
									styles.iconWrapper,
									{ backgroundColor: isDark ? '#333' : '#e0f7fa' },
								]}
							>
								<Ionicons name={icon} size={20} color="#00a2ff" />
							</View>
							<Text
								style={[styles.title, { color: isDark ? '#fff' : '#212121' }]}
							>
								{title}
							</Text>
							<TouchableOpacity onPress={onClose}>
								<Ionicons
									name="close"
									size={24}
									color={isDark ? '#ccc' : '#757575'}
								/>
							</TouchableOpacity>
						</View>
					</View>

					{/* Content */}
					<View style={styles.content}>{children}</View>
				</View>
			</GestureHandlerRootView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modal: {
		justifyContent: 'flex-end',
		margin: 0,
		alignItems: 'stretch', // Ensure modal stretches to full width
	},
	container: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 8,
		paddingHorizontal: 24,
		paddingBottom: 48,
		maxHeight: '60%', // Changed from height: '85%' to maxHeight for better sizing
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
	},
	dragHandle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		backgroundColor: '#ccc',
		alignSelf: 'center',
		marginBottom: 8,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	iconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	title: {
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
	},
	content: {
		flex: 1, // Take up remaining space after header
	},
});

export default CustomSlidingModal;
