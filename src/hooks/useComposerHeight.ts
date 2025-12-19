import { useState, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useComposerHeight(
	initial = 56
): [number, (e: LayoutChangeEvent) => void] {
	const [h, setH] = useState(initial);

	const onLayout = useCallback((e: LayoutChangeEvent) => {
		const next = Math.round(e.nativeEvent.layout.height);
		if (!next) return;

		setH((prev) => (Math.abs(next - prev) > 1 ? next : prev));
	}, []);

	return [h, onLayout];
}
