import React from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, space } from '../theme';

// Layout rhythm constants
const SCREEN_PX = space.lg;     // 16 - horizontal padding
const SCREEN_PT = space.lg;     // 16 - top padding
const SCREEN_PB = space.xl;     // 24 - additional bottom breathing room
const SECTION_GAP = space.lg;    // 16 - vertical gap between sections

type AppScreenProps = {
	children: React.ReactNode;
	/** SafeAreaView edges. Default: ['top'] */
	edges?: ('top' | 'bottom' | 'left' | 'right')[];
	/** Enable scrolling. Default: true */
	scrollable?: boolean;
	/** Custom content container style */
	contentContainerStyle?: ViewStyle;
	/** Custom container style */
	style?: ViewStyle;
	/** Horizontal padding. Default: SCREEN_PX (space.lg) */
	paddingHorizontal?: number;
	/** Top padding. Default: SCREEN_PT (space.lg) */
	paddingTop?: number;
	/** Bottom padding (additional, before safe area). Default: SCREEN_PB (space.xl) */
	paddingBottom?: number;
	/** Vertical gap between sections. Default: SECTION_GAP (space.lg) */
	gap?: number;
	/** Background color. Default: palette.surfaceAlt */
	backgroundColor?: string;
};

/**
 * AppScreen - Standardized screen container with SafeAreaView and optional ScrollView
 * 
 * Owns layout rhythm:
 * - Consistent horizontal padding
 * - Consistent top padding
 * - Safe-area aware bottom padding
 * - Vertical gap between sections (via gap wrapper)
 * 
 * @example
 * <AppScreen>
 *   <AppCard>Content</AppCard>
 *   <AppCard>More content</AppCard>
 * </AppScreen>
 */
export const AppScreen: React.FC<AppScreenProps> = ({
	children,
	edges = ['top'],
	scrollable = true,
	contentContainerStyle,
	style,
	paddingHorizontal = SCREEN_PX,
	paddingTop = SCREEN_PT,
	paddingBottom = SCREEN_PB,
	gap = SECTION_GAP,
	backgroundColor = palette.surfaceAlt,
}) => {
	const insets = useSafeAreaInsets();
	
	const containerStyle = [
		styles.container,
		{ backgroundColor },
		style,
	];

	const contentStyle = [
		styles.content,
		{
			paddingHorizontal,
			paddingTop,
			paddingBottom: insets.bottom + paddingBottom,
		},
		contentContainerStyle,
	];

	const gapWrapperStyle = {
		gap,
	};

	if (!scrollable) {
		return (
			<SafeAreaView style={containerStyle} edges={edges}>
				<View style={contentStyle}>
					<View style={gapWrapperStyle}>{children}</View>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={containerStyle} edges={edges}>
			<ScrollView
				contentContainerStyle={contentStyle}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
			>
				<View style={gapWrapperStyle}>{children}</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
	},
});
