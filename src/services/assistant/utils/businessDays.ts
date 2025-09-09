// Business day calculations for financial planning
// Keeps it local (no holidays) and upgrades the "weekdays" answer

export function businessDaysBetween(start: Date, end: Date): number {
	if (end < start) return 0;
	let days = 0;
	const cur = new Date(start);
	cur.setHours(0, 0, 0, 0);
	while (cur <= end) {
		const d = cur.getDay(); // 0 Sun ... 6 Sat
		if (d !== 0 && d !== 6) days++;
		cur.setDate(cur.getDate() + 1);
	}
	return days;
}

export function formatBusinessDays(days: number): string {
	if (days === 0) return 'today';
	if (days === 1) return '1 business day';
	return `${days} business days`;
}
