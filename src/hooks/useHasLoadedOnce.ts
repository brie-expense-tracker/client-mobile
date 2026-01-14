import { useEffect, useState } from 'react';

/**
 * Hook to track if data has loaded successfully at least once.
 * Prevents skeletons from showing again after first successful load.
 *
 * @param isSuccess - Whether the current query/operation is successful
 * @returns true if data has loaded successfully at least once
 *
 * @example
 * ```ts
 * const q = useQuery(...);
 * const hasLoadedOnce = useHasLoadedOnce(q.isSuccess);
 *
 * const showSkeleton = q.isLoading && !hasLoadedOnce;
 * const showOverlay = q.isFetching && hasLoadedOnce;
 * ```
 */
export function useHasLoadedOnce(isSuccess: boolean): boolean {
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

	useEffect(() => {
		if (isSuccess) {
			setHasLoadedOnce(true);
		}
	}, [isSuccess]);

	return hasLoadedOnce;
}
