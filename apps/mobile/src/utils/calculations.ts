export interface BaseTransaction {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
}

export interface NetBalanceSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

/**
 * Calculates net balance, total income, and total expense from a list of transactions.
 * Internal transfers are excluded from income and expense aggregates.
 */
export function calculateNetBalance(transactions: readonly BaseTransaction[]): NetBalanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  }

  const totalBalance = totalIncome - totalExpense;

  return {
    totalBalance,
    totalIncome,
    totalExpense,
  };
}

