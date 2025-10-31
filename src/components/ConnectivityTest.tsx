import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Share,
	Platform,
} from 'react-native';
import { useConnectivity } from '../utils/connectivity';
import { getIdToken } from '@react-native-firebase/auth';
import { ApiService } from '../services/core/apiService';
import useAuth from '../context/AuthContext';

type StepStatus = 'pass' | 'fail' | 'skip';
type Result = {
	id: string;
	label: string;
	status: StepStatus;
	detail?: string;
	durationMs?: number;
};

export default function ConnectivityTest() {
	const [running, setRunning] = useState(false);
	const [results, setResults] = useState<Result[]>([]);
	const { isOnline, checkConnectivity } = useConnectivity();
	const { firebaseUser } = useAuth();

	const add = (r: Result) => setResults((prev) => [...prev, r]);

	const badge = (s: StepStatus) =>
		s === 'pass' ? '🟢' : s === 'fail' ? '🔴' : '🟡';

	const computed = useMemo(() => {
		const pass = results.filter((r) => r.status === 'pass').length;
		const fail = results.filter((r) => r.status === 'fail').length;
		const skip = results.filter((r) => r.status === 'skip').length;
		return { pass, fail, skip };
	}, [results]);

	// ⏱️ hard timeout wrapper for any step to avoid hangs
	const withTimeout = <T,>(p: Promise<T>, ms = 5000) =>
		Promise.race<T>([
			p,
			new Promise<T>((_, rej) =>
				setTimeout(() => rej(new Error('timeout')), ms)
			) as any,
		]);

	const runStep = async (
		id: string,
		label: string,
		fn: () => Promise<{ ok: boolean; detail?: string }>
	) => {
		const start = Date.now();
		try {
			const { ok, detail } = await withTimeout(fn());
			const durationMs = Date.now() - start;
			add({ id, label, status: ok ? 'pass' : 'fail', detail, durationMs });
			return ok;
		} catch (e: any) {
			const durationMs = Date.now() - start;
			add({
				id,
				label,
				status: 'fail',
				detail: e?.message || 'Unknown error',
				durationMs,
			});
			return false;
		}
	};

	const skipStep = (id: string, label: string, detail: string) => {
		add({ id, label, status: 'skip', detail });
	};

	const run = async () => {
		if (running) return;
		setRunning(true);
		setResults([]);

		try {
			// 0) Fresh connectivity
			const fresh = await withTimeout(checkConnectivity());
			const online = typeof fresh === 'boolean' ? fresh : isOnline;

			add({
				id: 'net.state',
				label: 'Network status',
				status: online ? 'pass' : 'fail',
				detail: online ? 'Connected' : 'Disconnected',
			});

			if (!online) {
				skipStep(
					'srv.reach',
					'Server connectivity (ping)',
					'Skipped (offline)'
				);
				skipStep('auth.state', 'Auth state', 'Skipped (offline)');
				skipStep('auth.token', 'Token validity', 'Skipped (offline)');
				skipStep('api.health', 'GET /health', 'Skipped (offline)');
				skipStep('perf.latency', 'Latency check', 'Skipped (offline)');
				return;
			}

			// 1) Server ping
			const serverOk = await runStep(
				'srv.reach',
				'Server connectivity (ping)',
				async () => {
					const ok = await ApiService.testConnection();
					return { ok, detail: ok ? 'Ping succeeded' : 'Ping failed' };
				}
			);

			// 2) Auth state (from useAuth context)
			add({
				id: 'auth.state',
				label: 'Auth state',
				status: firebaseUser ? 'pass' : 'skip',
				detail: firebaseUser
					? `Signed in (${firebaseUser.uid.slice(0, 8)}…)`
					: 'Signed out',
			});

			// 3) Token validity (only if server ok + user present)
			if (serverOk && firebaseUser) {
				await runStep('auth.token', 'Token validity', async () => {
					const token = await getIdToken(firebaseUser);
					const ok = !!token;
					return { ok, detail: ok ? 'Firebase ID token acquired' : 'No token' };
				});
			} else {
				skipStep(
					'auth.token',
					'Token validity',
					!serverOk ? 'Skipped (server down)' : 'Skipped (signed out)'
				);
			}

			// 4) Health endpoint
			await runStep('api.health', 'GET /health', async () => {
				const resp = await ApiService.get('/health');
				const ok = !!resp?.success;
				return {
					ok,
					detail: ok ? 'Service healthy' : 'Service reported unhealthy',
				};
			});

			// 5) Latency
			await runStep('perf.latency', 'Latency check', async () => {
				const t0 = Date.now();
				await ApiService.testConnection();
				const dt = Date.now() - t0;
				const grade =
					dt < 500
						? 'Excellent (<500ms)'
						: dt < 1500
						? 'Good (<1500ms)'
						: dt < 3000
						? 'Acceptable (<3s)'
						: 'Slow (>=3s)';
				return { ok: dt < 3000, detail: `${dt}ms — ${grade}` };
			});
		} catch (e: any) {
			// Catch any unexpected top-level error so UI never hangs
			add({
				id: 'runner.error',
				label: 'Unexpected error',
				status: 'fail',
				detail: e?.message || 'Unknown error',
			});
		} finally {
			setRunning(false); // ✅ always clear the spinner
		}
	};

	const exportResults = async () => {
		if (results.length === 0) return;
		const lines = [
			'=== Connectivity Test Report ===',
			`Generated: ${new Date().toLocaleString()}`,
			`Platform: ${Platform.OS} ${Platform.Version}`,
			'',
			`Summary: ✅ ${computed.pass}  🔴 ${computed.fail}  ⚠️ ${computed.skip}`,
			'',
			...results.map(
				(r) =>
					`${r.label}: ${r.status.toUpperCase()}` +
					(r.durationMs != null ? ` (${r.durationMs}ms)` : '') +
					(r.detail ? ` — ${r.detail}` : '')
			),
			'',
			'=== End Report ===',
		];
		await Share.share({
			message: lines.join('\n'),
			title: 'Connectivity Test Report',
		});
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Connectivity Test</Text>

			{/* Live network indicator from hook (FYI) */}
			<View style={styles.networkInfoContainer}>
				<Text style={styles.networkInfoTitle}>Network Status</Text>
				<Text style={styles.networkInfoText}>
					{isOnline ? '🟢 Connected' : '🔴 Disconnected'}
					{running ? '  · Checking…' : ''}
				</Text>
			</View>

			{/* Summary pill */}
			<View style={styles.summaryRow}>
				<Text style={styles.summaryPill}>✅ {computed.pass}</Text>
				<Text style={styles.summaryPill}>🔴 {computed.fail}</Text>
				<Text style={styles.summaryPill}>⚠️ {computed.skip}</Text>
			</View>

			<TouchableOpacity
				style={[styles.testButton, running && styles.testButtonDisabled]}
				onPress={run}
				disabled={running}
				accessibilityLabel="Run connectivity test"
				accessibilityHint="Runs reachability, auth, health, and latency checks"
				accessibilityRole="button"
			>
				{running ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="white" />
						<Text style={styles.buttonText}>Testing…</Text>
					</View>
				) : (
					<Text style={styles.buttonText}>Run Connectivity Test</Text>
				)}
			</TouchableOpacity>

			<View style={styles.buttonRow}>
				<TouchableOpacity
					style={styles.clearButton}
					onPress={() => {
						setResults([]);
					}}
					accessibilityLabel="Clear test results"
					accessibilityRole="button"
				>
					<Text style={styles.clearButtonText}>Clear Results</Text>
				</TouchableOpacity>

				{results.length > 0 && (
					<TouchableOpacity
						style={styles.exportButton}
						onPress={exportResults}
						accessibilityLabel="Export test results"
						accessibilityRole="button"
					>
						<Text style={styles.exportButtonText}>Export Results</Text>
					</TouchableOpacity>
				)}
			</View>

			<ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator>
				<Text style={styles.resultsTitle}>Steps</Text>
				{results.length === 0 ? (
					<Text style={styles.noResultsText}>
						No results yet. Run a test to begin.
					</Text>
				) : (
					results.map((r) => (
						<View key={r.id} style={styles.resultRow}>
							<Text style={styles.resultBadge}>{badge(r.status)}</Text>
							<View style={{ flex: 1 }}>
								<Text style={styles.resultLabel}>{r.label}</Text>
								{!!r.detail && (
									<Text style={styles.resultDetail}>{r.detail}</Text>
								)}
							</View>
							{!!r.durationMs && (
								<Text style={styles.resultTime}>{r.durationMs}ms</Text>
							)}
						</View>
					))
				)}
			</ScrollView>
		</View>
	);
}

/* ---------- styles (kept close to yours; added a few chips/rows) ---------- */
const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 16,
		textAlign: 'center',
		color: '#333',
	},

	networkInfoContainer: {
		backgroundColor: '#e3f2fd',
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#2196f3',
	},
	networkInfoTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1976d2',
		marginBottom: 4,
	},
	networkInfoText: { fontSize: 12, color: '#424242' },

	summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
	summaryPill: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 6,
		fontSize: 12,
		color: '#111827',
	},

	testButton: {
		backgroundColor: '#007AFF',
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
	},
	testButtonDisabled: { backgroundColor: '#a0a0a0' },
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	buttonText: {
		color: 'white',
		textAlign: 'center',
		fontWeight: '600',
		fontSize: 16,
	},

	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		gap: 12,
	},
	clearButton: {
		backgroundColor: '#6c757d',
		padding: 12,
		borderRadius: 6,
		flex: 1,
	},
	clearButtonText: {
		color: 'white',
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '500',
	},
	exportButton: {
		backgroundColor: '#28a745',
		padding: 12,
		borderRadius: 6,
		flex: 1,
	},
	exportButtonText: {
		color: 'white',
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '500',
	},

	resultsContainer: {
		backgroundColor: 'white',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6',
		flex: 1,
		maxHeight: 320,
	},
	resultsTitle: {
		fontWeight: '700',
		marginBottom: 8,
		color: '#333',
		fontSize: 16,
	},
	noResultsText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		fontStyle: 'italic',
		marginTop: 12,
	},

	resultRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#eee',
	},
	resultBadge: { fontSize: 16, width: 22, textAlign: 'center' },
	resultLabel: { fontSize: 14, color: '#111827', fontWeight: '600' },
	resultDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
	resultTime: { fontSize: 12, color: '#6b7280', marginLeft: 8 },
});
