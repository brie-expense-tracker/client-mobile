import React, { PropsWithChildren } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	useColorScheme,
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

type SlidingModalProps = PropsWithChildren<{
	isVisible: boolean;
	onClose: () => void;
	title?: string;
	icon?: keyof typeof Ionicons.glyphMap;
	maxHeightPct?: number; // 0..1, default 0.6
	showHeader?: boolean; // default true
	onAfterClose?: () => void; // runs after hide animation
}>;

export default function SlidingModal({
	isVisible,
	onClose,
	title = 'Details',
	icon = 'information-circle-outline',
	children,
	maxHeightPct = 0.6,
	showHeader = true,
	onAfterClose,
}: SlidingModalProps) {
	// Force light mode for consistent styling
	const isDark = false;

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			onSwipeComplete={onClose}
			swipeDirection="down"
			propagateSwipe
			style={styles.modal}
			backdropOpacity={0.4}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			animationInTiming={260}
			animationOutTiming={220}
			backdropTransitionInTiming={180}
			backdropTransitionOutTiming={140}
			useNativeDriver={false}
			useNativeDriverForBackdrop={false}
			hideModalContentWhileAnimating
			statusBarTranslucent
			onModalHide={onAfterClose}
			accessibilityViewIsModal
		>
			<View
				style={[
					styles.container,
					{
						maxHeight: `${Math.round(maxHeightPct * 100)}%`,
						backgroundColor: isDark ? '#121212' : '#FFFFFF',
					},
				]}
			>
				<View style={styles.dragHandle} />

				{showHeader && (
					<View style={styles.header}>
						<View
							style={[
								styles.iconWrapper,
								{ backgroundColor: isDark ? '#2A2A2A' : '#E7F5FF' },
							]}
						>
							<Ionicons name={icon} size={20} color="#0095FF" />
						</View>
						<Text
							style={[styles.title, { color: isDark ? '#FFF' : '#0F172A' }]}
						>
							{title}
						</Text>
						<TouchableOpacity
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="Close modal"
							accessibilityHint="Closes this panel"
						>
							<Ionicons
								name="close"
								size={24}
								color={isDark ? '#D1D5DB' : '#64748B'}
							/>
						</TouchableOpacity>
					</View>
				)}

				<View style={styles.content}>{children}</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modal: {
		justifyContent: 'flex-end',
		margin: 0,
		alignItems: 'stretch',
	},
	container: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 8,
		paddingHorizontal: 24,
		paddingBottom: 48,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden', // avoids shadow pop during slideOutDown
	},
	dragHandle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		backgroundColor: '#E5E9EF',
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
	title: { flex: 1, fontSize: 18, fontWeight: '600' },
	content: { flex: 1 },
});
