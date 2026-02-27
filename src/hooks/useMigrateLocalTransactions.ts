/**
 * When the user is authenticated, run local-to-cloud migration once
 * so data from "Use without account" is not lost after sign-in.
 */
import { useEffect, useRef } from 'react';
import {
	migrateLocalTransactionsToBackend,
	hasLocalTransactionsToMigrate,
} from '../storage/migrateLocalTransactions';
import { createLogger } from '../utils/sublogger';

const migrationLog = createLogger('useMigrateLocalTransactions');

export type UseMigrateLocalTransactionsOptions = {
	onMigrated?: (migratedCount: number) => void;
};

export function useMigrateLocalTransactions(
	isAuthenticated: boolean,
	options?: UseMigrateLocalTransactionsOptions
) {
	const { onMigrated } = options ?? {};
	const didRun = useRef(false);

	useEffect(() => {
		if (!isAuthenticated || didRun.current) return;

		let cancelled = false;
		didRun.current = true;

		(async () => {
			try {
				const hasLocal = await hasLocalTransactionsToMigrate();
				if (!hasLocal || cancelled) return;

				migrationLog.info('Migrating local transactions to backend...');
				const result = await migrateLocalTransactionsToBackend();

				if (cancelled) return;
				if (result.success && result.migratedCount > 0) {
					migrationLog.info(
						`Migrated ${result.migratedCount} local transaction(s) to cloud.`
					);
					onMigrated?.(result.migratedCount);
				} else if (!result.success && result.error) {
					migrationLog.warn('Migration failed (will retry next session):', result.error);
					didRun.current = false; // allow retry
				}
			} catch (e) {
				if (!cancelled) {
					migrationLog.warn('Migration error:', e);
					didRun.current = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, onMigrated]);
}
