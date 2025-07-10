export interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
}

// Function to generate dummy transactions for the last 6 months
const generateDummyTransactions = (): Transaction[] => {
	const transactions: Transaction[] = [];
	const endDate = new Date();
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - 6);

	// Regular monthly transactions
	const regularTransactions = [
		{
			description: 'Monthly Salary',
			amount: 3200,
			type: 'income' as const,
		},
		{
			description: 'Rent',
			amount: 1200,
			type: 'expense' as const,
		},
		{
			description: 'Internet Bill',
			amount: 65,
			type: 'expense' as const,
		},
		{
			description: 'Phone Bill',
			amount: 75,
			type: 'expense' as const,
		},
		{
			description: 'Gym Membership',
			amount: 45,
			type: 'expense' as const,
		},
	];

	// Generate regular monthly transactions
	const currentDate = new Date(startDate);
	while (currentDate <= endDate) {
		// Add regular monthly transactions on the 1st of each month
		if (currentDate.getDate() === 1) {
			regularTransactions.forEach((transaction, index) => {
				transactions.push({
					id: `regular-${currentDate.toISOString()}-${index}`,
					...transaction,
					date: currentDate.toISOString().split('T')[0],
				});
			});
		}

		// Add random daily transactions
		if (Math.random() < 0.3) {
			// 30% chance of a transaction each day
			const transactionTypes = [
				{
					description: 'Coffee Shop',
					amount: 4.75,
					type: 'expense' as const,
				},
				{
					description: 'Restaurant Dinner',
					amount: 45.8,
					type: 'expense' as const,
				},
				{
					description: 'Grocery Shopping',
					amount: 85.5,
					type: 'expense' as const,
				},
				{
					description: 'Gas Station',
					amount: 45.0,
					type: 'expense' as const,
				},
				{
					description: 'Uber Ride',
					amount: 25.75,
					type: 'expense' as const,
				},
			];

			const randomTransaction =
				transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
			transactions.push({
				id: `daily-${currentDate.toISOString()}`,
				...randomTransaction,
				date: currentDate.toISOString().split('T')[0],
			});
		}

		// Add occasional income (freelance, consulting, etc.)
		if (Math.random() < 0.05) {
			// 5% chance of additional income
			const incomeTypes = [
				{
					description: 'Freelance Project',
					amount: 750,
					type: 'income' as const,
				},
				{
					description: 'Consulting Work',
					amount: 1200,
					type: 'income' as const,
				},
				{
					description: 'Investment Dividend',
					amount: 120.75,
					type: 'income' as const,
				},
			];

			const randomIncome =
				incomeTypes[Math.floor(Math.random() * incomeTypes.length)];
			transactions.push({
				id: `income-${currentDate.toISOString()}`,
				...randomIncome,
				date: currentDate.toISOString().split('T')[0],
			});
		}

		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return transactions;
};

// Replace the existing transactions array with generated data
export const transactions: Transaction[] = generateDummyTransactions();
