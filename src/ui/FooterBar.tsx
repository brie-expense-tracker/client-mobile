import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type FooterBarProps = PropsWithChildren & {
	style?: ViewStyle;
};

/**
 * A reusable bottom footer that sits flush above the tab bar.
 * - Automatically handles iOS safe area (home indicator)
 * - Works with Expo Router tabs (subtracts safe area from tab bar height)
 * - Absolutely positioned, so add spacer to your content
 *
 * @example
 * ```tsx
 * import { FooterBar } from '../../src/ui';
 * import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
 *
 * function MyScreen() {
 *   const tabBarHeight = useBottomTabBarHeight();
 *
 *   return (
 *     <>
 *       <KeyboardAvoidingView
 *         behavior="padding"
 *         keyboardVerticalOffset={tabBarHeight}
 *       >
 *         <ScrollView>
 *           {/* Your content *\/}
 *           {/* Spacer so footer doesn't hide content *\/}
 *           <View style={{ height: 140 }} />
 *         </ScrollView>
 *       </KeyboardAvoidingView>
 *
 *       <FooterBar>
 *         <TextInput placeholder="Type here..." />
 *         <TouchableOpacity><Text>Send</Text></TouchableOpacity>
 *       </FooterBar>
 *     </>
 *   );
 * }
 * ```
 */
export function FooterBar({ style, children }: FooterBarProps) {
	// No need for safe area or tab bar height calculations
	// FooterBar now flows naturally at the bottom

	return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
});
