// Lightweight i18n (Spanish) without waking a model
// Detects Spanish via super-cheap markers and switches to Spanish regex aliases

export type Lang = 'en' | 'es';

export function detectLang(text: string): Lang {
	const t = text.toLowerCase();
	// quick Spanish markers
	const esHits = [
		/\b(cómo|como)\b/,
		/\bcuánto\b/,
		/\bcuantos?\b/,
		/\bmes(es)?\b/,
		/\bdías?\b/,
		/\bpor ciento\b/,
		/\bsiguiente\b/,
		/\bmarcar\b/,
		/\bpagar\b/,
		/\bmeta\b/,
		/\bpresupuesto\b/,
		/\bgasto(s)?\b/,
	].filter((rx) => rx.test(t)).length;
	return esHits >= 2 ? 'es' : 'en';
}

// simple phrase table for app-nav copy
export const copy = {
	en: {
		openRecurring: 'Open Recurring Expenses',
		markAsPaid: 'Bills are automatically inputted when due.',
		createBudget: 'Create Budget',
		openGoals: 'Open Goals',
		emergencyFund: 'Emergency Fund',
		fiftyThirtyTwenty: '50/30/20 Rule',
	},
	es: {
		openRecurring: 'Abrir Gastos Recurrentes',
		markAsPaid: 'Las facturas se ingresan automáticamente cuando vencen.',
		createBudget: 'Crear Presupuesto',
		openGoals: 'Abrir Metas',
		emergencyFund: 'Fondo de Emergencia',
		fiftyThirtyTwenty: 'Regla 50/30/20',
	},
} as const;
