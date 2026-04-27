import { getItem, setItem } from '../utils/safeStorage';

const STORAGE_KEY = 'capture_recent_chips';
const MAX = 8;

export async function loadCaptureRecentChips(): Promise<string[]> {
	try {
		const raw = await getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX);
	} catch {
		return [];
	}
}

export async function pushCaptureRecentChip(line: string): Promise<void> {
	const trimmed = line.trim();
	if (!trimmed) return;
	try {
		const prev = await loadCaptureRecentChips();
		const next = [trimmed, ...prev.filter((c) => c !== trimmed)].slice(0, MAX);
		await setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// ignore storage failures
	}
}
