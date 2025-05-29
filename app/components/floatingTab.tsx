// CustomTabBar.tsx
import React from 'react';
import {
	View,
	TouchableOpacity,
	StyleSheet,
	Text,
	Dimensions,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Rect, Circle, Defs, Mask } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const CUT_OUT_RADIUS = 35;

export default function CustomTabBar({
	state,
	descriptors,
	navigation,
}: BottomTabBarProps) {
	const insets = useSafeAreaInsets();

	// SVG mask: a full rect minus a circle in center
	const mask = (
		<Svg width={width} height={TAB_BAR_HEIGHT + insets.bottom}>
			<Defs>
				<Mask id="hole">
					{/* everything opaque (white) */}
					<Rect width="100%" height="100%" fill="white" />
					{/* punch a hole (black circle) */}
					<Circle cx={width / 2} cy={0} r={CUT_OUT_RADIUS} fill="black" />
				</Mask>
			</Defs>
			{/* apply the mask */}
			<Rect width="100%" height="100%" fill="white" mask="url(#hole)" />
		</Svg>
	);

	return (
		<MaskedView
			style={[styles.container, { height: TAB_BAR_HEIGHT + insets.bottom }]}
			maskElement={mask}
		>
			{/* Background of tab bar */}
			<View
				style={[styles.background, { height: TAB_BAR_HEIGHT + insets.bottom }]}
			>
				{state.routes.map((route, idx) => {
					const isFocused = state.index === idx;
					const label =
						descriptors[route.key].options.tabBarLabel ?? route.name;

					return (
						<TouchableOpacity
							key={route.key}
							onPress={() => navigation.navigate(route.name)}
							style={styles.tabButton}
						>
							<Text style={{ color: isFocused ? '#007aff' : '#222' }}>
								{label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* Center FAB overlaps the hole */}
			<View pointerEvents="box-none" style={styles.fabWrapper}>
				<TouchableOpacity
					style={styles.fab}
					onPress={() => navigation.navigate('NewItem')}
				>
					<Text style={styles.fabIcon}>＋</Text>
				</TouchableOpacity>
			</View>
		</MaskedView>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 0,
		width: '100%',
	},
	background: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: 'white',
	},
	tabButton: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 10,
	},
	fabWrapper: {
		position: 'absolute',
		bottom: TAB_BAR_HEIGHT / 2, // center vertically over the hole
		left: 0,
		right: 0,
		alignItems: 'center',
	},
	fab: {
		width: CUT_OUT_RADIUS * 2,
		height: CUT_OUT_RADIUS * 2,
		borderRadius: CUT_OUT_RADIUS,
		backgroundColor: '#ff3b30',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 5,
	},
	fabIcon: {
		color: 'white',
		fontSize: 32,
		marginBottom: 4,
	},
});
