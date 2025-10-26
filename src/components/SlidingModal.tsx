import React, { PropsWithChildren, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	Platform,
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

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function SlidingModalBase({
	isVisible,
	onClose,
	title = 'Details',
	icon = 'information-circle-outline',
	children,
	maxHeightPct = 0.6,
	showHeader = true,
	onAfterClose,
}: SlidingModalProps) {
	// lock maxHeight to a NUMBER so layout doesn't churn during animation
	const maxHeight = Math.round(
		SCREEN_H * Math.min(Math.max(maxHeightPct, 0.3), 0.95)
	);

	// avoid re-creating style objects during the open/close animation
	const containerStyle = useMemo(
		() => [styles.container, { maxHeight }],
		[maxHeight]
	);

	return (
		<Modal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			onSwipeComplete={onClose}
			swipeDirection="down"
			propagateSwipe
			style={styles.modal}
			backdropOpacity={0.35}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			animationInTiming={220}
			animationOutTiming={200}
			backdropTransitionInTiming={120}
			backdropTransitionOutTiming={100}
			// keep work on the native thread
			useNativeDriver={false}
			useNativeDriverForBackdrop={false}
			// prevent a measure pass during animation on some Android devices
			deviceWidth={SCREEN_W}
			deviceHeight={SCREEN_H}
			// improves perf on Android for big views
			hardwareAccelerated
			// reduce flashes while animating
			hideModalContentWhileAnimating
			statusBarTranslucent
			onModalHide={onAfterClose}
			accessibilityViewIsModal
		>
			<View style={containerStyle}>
				<View style={styles.dragHandle} />

				{showHeader && (
					<View style={styles.header}>
						<View style={styles.iconWrapper}>
							<Ionicons name={icon} size={20} color="#0095FF" />
						</View>
						<Text style={styles.title}>{title}</Text>
						<TouchableOpacity
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="Close modal"
							accessibilityHint="Closes this panel"
						>
							<Ionicons name="close" size={24} color="#64748B" />
						</TouchableOpacity>
					</View>
				)}

				{/* These flags push rendering to the GPU when possible */}
				<View
					style={styles.content}
					renderToHardwareTextureAndroid
					{...(Platform.OS === 'ios' ? { shouldRasterizeIOS: true } : {})}
				>
					{children}
				</View>
			</View>
		</Modal>
	);
}

export default React.memo(SlidingModalBase);

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
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
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
		marginBottom: 16,
	},
	iconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		backgroundColor: '#E7F5FF',
	},
	title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#0F172A' },
	content: { flex: 1 },
});
