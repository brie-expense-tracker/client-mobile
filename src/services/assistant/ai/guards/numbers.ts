// ai/guards/numbers.ts - Numeric guardrails validator

import { FactPack } from '../../factPack';
import { WriterOutput, GuardReport, GuardFailure } from '../types';

export function guardNumbers(out: WriterOutput, fp: FactPack): GuardReport {
	const known = new Map<number, string[]>(); // value -> [fact_ids]

	// Build map of all known numeric values from FactPack
	for (const b of fp.budgets || []) {
		add(known, round2(b.spent || 0), b.id);
		add(known, round2(b.limit || 0), b.id);
		add(known, round2(b.remaining || 0), b.id);
	}

	for (const a of fp.balances || []) {
		add(known, round2(a.current || 0), a.accountId);
		add(known, round2(a.total || 0), a.accountId);
		add(known, round2(a.spent || 0), a.accountId);
	}

	for (const g of fp.goals || []) {
		add(known, round2(g.targetAmount || 0), g.id);
		add(known, round2(g.currentAmount || 0), g.id);
		add(known, round2(g.remaining || 0), g.id);
	}

	for (const r of fp.recurring || []) {
		add(known, round2(r.amount || 0), r.id);
	}

	for (const t of fp.recentTransactions || []) {
		add(known, round2(t.amount || 0), t.id);
	}

	const failures: GuardFailure[] = [];

	// Validate all numeric mentions in the writer output
	for (const m of out.numeric_mentions) {
		if (m.value < 0) {
			failures.push('unknown_amount'); // disallow negatives in display
			continue;
		}

		const hits = known.get(round2(m.value)) ?? [];
		if (hits.length === 0) {
			failures.push('unknown_amount');
		}

		if (m.fact_id && !hits.includes(m.fact_id)) {
			failures.push('references_missing_fact');
		}
	}

	return {
		ok: failures.length === 0,
		failures,
		details: {
			knownValues: Array.from(known.keys()).slice(0, 10), // First 10 for debugging
			mentionedValues: out.numeric_mentions.map((m) => m.value),
		},
	};
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function add(map: Map<number, string[]>, v: number, id: string) {
	const arr = map.get(v) ?? [];
	arr.push(id);
	map.set(v, arr);
}
