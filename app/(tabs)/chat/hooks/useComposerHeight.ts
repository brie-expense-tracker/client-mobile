import { useState, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useComposerHeight(
	initial = 56
): [number, (e: LayoutChangeEvent) => void] {
	const [h, setH] = useState(initial);
	const onLayout = useCallback(
		(e: LayoutChangeEvent) => {
			const next = e.nativeEvent.layout.height;
			if (next && Math.abs(next - h) > 1) setH(next);
		},
		[h]
	);
	return [h, onLayout];
}
