/**
 * Runs once when user is authenticated: migrates local transactions to the backend
 * (from "Use without account" flow) and refetches the transaction list so the UI updates.
 */
import React, { useContext } from 'react';
import { Alert } from 'react-native';
import useAuth from '../context/AuthContext';
import { TransactionContext } from '../context/transactionContext';
import { useMigrateLocalTransactions } from '../hooks/useMigrateLocalTransactions';

export function LocalMigrationRunner() {
	const { user, firebaseUser } = useAuth();
	const { refreshTransactions } = useContext(TransactionContext);
	const isAuthenticated = !!(firebaseUser && user);

	useMigrateLocalTransactions(isAuthenticated, {
		onMigrated: (migratedCount) => {
			refreshTransactions();
			if (migratedCount > 0) {
				Alert.alert(
					'Data backed up',
					`${migratedCount} transaction${migratedCount === 1 ? '' : 's'} from this device ${migratedCount === 1 ? 'has' : 'have'} been saved to your account.`
				);
			}
		},
	});

	return null;
}
