// ai/guards/window.ts - Time window & date inclusion validator

import { FactPack } from '../../factPack';
import { WriterOutput, GuardReport, GuardFailure } from '../types';
import { logger } from '../../../../../utils/logger';


export function guardTimeStamp(out: WriterOutput, fp: FactPack): GuardReport {
	const failures: GuardFailure[] = [];

	// Check if answer text includes time window information
	const hasTimeWindow =
		out.answer_text.includes(fp.time_window.start) ||
		out.answer_text.includes(fp.time_window.end) ||
		out.answer_text.includes(fp.time_window.period);

	if (!hasTimeWindow) {
		failures.push('out_of_window_date');
	}

	// Check for any specific dates mentioned that might be out of window
	const dateMatches = out.answer_text.match(
		/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g
	);
	if (dateMatches) {
		const factPackStart = new Date(fp.time_window.start);
		const factPackEnd = new Date(fp.time_window.end);

		for (const dateStr of dateMatches) {
			try {
				const date = new Date(dateStr);
				if (date < factPackStart || date > factPackEnd) {
					failures.push('out_of_window_date');
					break;
				}
			} catch {
				// Invalid date format, but not necessarily out of window
				logger.warn('Invalid date format in answer:', dateStr);
			}
		}
	}

	return {
		ok: failures.length === 0,
		failures,
		details: {
			timeWindow: `${fp.time_window.start} to ${fp.time_window.end}`,
			period: fp.time_window.period,
			timezone: fp.time_window.tz,
		},
	};
}
