import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	ScrollView,
	TextInput,
	Alert,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { TransactionContext } from '../../../src/context/transactionContext';
import {
	transactionToExportable,
	transactionsToCsv,
	sortByDateDesc,
	filterExportByRange,
	stampForFilename,
	type ExportableTransaction,
} from '../../../src/lib/transactions-export';
import { palette, radius, space, type } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton, AppReveal } from '../../../src/ui/primitives';

export default function ExportScreen() {
	const insets = useSafeAreaInsets();
	const { transactions, isLoading, hasLoaded, refetch } =
		useContext(TransactionContext);
	const [fromYmd, setFromYmd] = useState('');
	const [toYmd, setToYmd] = useState('');
	const [sharing, setSharing] = useState(false);

	const rows = useMemo<ExportableTransaction[]>(() => {
		const mapped = transactions.map(transactionToExportable);
		return sortByDateDesc(mapped);
	}, [transactions]);

	const filtered = useMemo(
		() => filterExportByRange(rows, fromYmd, toYmd),
		[rows, fromYmd, toYmd],
	);

	const busy = !hasLoaded && isLoading;

	const shareFile = useCallback(
		async (filename: string, mimeType: string, body: string) => {
			setSharing(true);
			try {
				const base = FileSystem.cacheDirectory;
				if (!base) {
					Alert.alert('Export', 'File storage is not available on this device.');
					return;
				}
				const path = `${base}${filename}`;
				await FileSystem.writeAsStringAsync(path, body, {
					encoding: FileSystem.EncodingType.UTF8,
				});
				const canShare = await Sharing.isAvailableAsync();
				if (!canShare) {
					Alert.alert(
						'Export',
						'Sharing is not available. Copy the data from a desktop browser export instead.',
					);
					return;
				}
				await Sharing.shareAsync(path, {
					mimeType,
					dialogTitle: 'Export Brie data',
				});
			} catch (e) {
				Alert.alert(
					'Export',
					e instanceof Error ? e.message : 'Could not share this export.',
				);
			} finally {
				setSharing(false);
			}
		},
		[],
	);

	const onCsv = useCallback(() => {
		if (filtered.length === 0) return;
		const csv = transactionsToCsv(filtered);
		void shareFile(
			`brie-export-${stampForFilename()}.csv`,
			'text/csv;charset=utf-8',
			csv,
		);
	}, [filtered, shareFile]);

	const onJson = useCallback(() => {
		if (filtered.length === 0) return;
		const json = JSON.stringify(filtered, null, 2) + '\n';
		void shareFile(
			`brie-export-${stampForFilename()}.json`,
			'application/json;charset=utf-8',
			json,
		);
	}, [filtered, shareFile]);

	const statusLine = busy
		? 'Loading transactions…'
		: rows.length === 0
			? 'No transactions to export yet.'
			: `Ready: ${filtered.length} transaction${filtered.length === 1 ? '' : 's'}${fromYmd || toYmd ? ' in range' : ''}.`;

	return (
		<View style={styles.root}>
			<ScrollView
				contentContainerStyle={[
					styles.scroll,
					{ paddingBottom: insets.bottom + space.xxl },
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<AppReveal delayMs={30} distance={8}>
					<AppText.Caption color="muted" style={styles.kicker}>
						Download
					</AppText.Caption>
					<AppText.Body color="muted" style={styles.intro}>
						CSV opens cleanly in Excel and Sheets; JSON is the raw list from your
						workspace. On mobile, exports open the system share sheet.
					</AppText.Body>
				</AppReveal>

				<AppReveal delayMs={80}>
					<View style={styles.refreshRow}>
						<AppButton
							label="Refresh"
							variant="ghost"
							size="sm"
							disabled={busy}
							onPress={() => void refetch()}
						/>
					</View>
				</AppReveal>

				<AppReveal delayMs={130}>
					<AppCard padding={space.lg}>
						<View style={styles.dateGrid}>
							<View style={styles.dateField}>
								<AppText.Label color="muted" style={styles.dateLabel}>
									From
								</AppText.Label>
								<TextInput
									style={styles.dateInput}
									value={fromYmd}
									onChangeText={setFromYmd}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={palette.textSubtle}
									editable={!busy}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>
							<View style={styles.dateField}>
								<AppText.Label color="muted" style={styles.dateLabel}>
									To
								</AppText.Label>
								<TextInput
									style={styles.dateInput}
									value={toYmd}
									onChangeText={setToYmd}
									placeholder="YYYY-MM-DD"
									placeholderTextColor={palette.textSubtle}
									editable={!busy}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>
						</View>

						<AppText.Caption color="muted" style={styles.status}>
							{statusLine}
						</AppText.Caption>

						<View style={styles.actions}>
							<AppButton
								label="Share CSV"
								variant="primary"
								disabled={busy || filtered.length === 0 || sharing}
								loading={sharing}
								onPress={onCsv}
								fullWidth
							/>
							<AppButton
								label="Share JSON"
								variant="secondary"
								disabled={busy || filtered.length === 0 || sharing}
								onPress={onJson}
								fullWidth
							/>
						</View>
					</AppCard>
				</AppReveal>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	scroll: {
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		gap: space.md,
	},
	kicker: {
		...type.labelSm,
		color: palette.textMuted,
		marginBottom: space.xs,
	},
	intro: {
		lineHeight: 22,
		marginBottom: space.sm,
	},
	refreshRow: {
		alignSelf: 'flex-end',
	},
	dateGrid: {
		flexDirection: 'row',
		gap: space.md,
		marginBottom: space.md,
	},
	dateField: {
		flex: 1,
		minWidth: 0,
	},
	dateLabel: {
		marginBottom: space.xs,
	},
	dateInput: {
		borderRadius: radius.xl2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		backgroundColor: palette.input,
		paddingHorizontal: space.md,
		paddingVertical: Platform.OS === 'ios' ? 12 : 10,
		fontSize: 16,
		color: palette.text,
	},
	status: {
		marginBottom: space.lg,
		lineHeight: 18,
	},
	actions: {
		gap: space.sm,
	},
});
