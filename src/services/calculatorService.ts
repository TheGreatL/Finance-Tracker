import { getDatabase } from '../database/db';
import { Account, Loan, RecurringRule, SavingsGoal } from '../types/database';
import { getDashboardSummary } from './ledgerService';

export interface SafeToSpendBreakdown {
  liquidCash: number;
  upcomingBills: number;
  upcomingLoanPayments: number;
  savingsCommitments: number;
  safeToSpend: number;
  dailyDiscretionaryBudget: number; // remaining days in month
}

export async function calculateSafeToSpend(): Promise<SafeToSpendBreakdown> {
  const db = await getDatabase();
  const summary = await getDashboardSummary();

  const activeBills = await db.getAllAsync<RecurringRule>(
    "SELECT * FROM recurring_rules WHERE type = 'expense' AND is_active = 1"
  );
  const upcomingBills = activeBills.reduce((sum, b) => sum + b.amount, 0);

  const activeLoans = await db.getAllAsync<Loan>(
    "SELECT * FROM loans WHERE type = 'payable' AND status = 'active'"
  );
  const upcomingLoanPayments = activeLoans.reduce((sum, l) => sum + (l.installment_amount || 0), 0);

  const activeGoals = await db.getAllAsync<SavingsGoal>(
    "SELECT * FROM savings_goals WHERE status = 'active'"
  );
  // Estimate monthly allocation for goals (e.g. 10% of remaining target or total target / 12)
  const savingsCommitments = activeGoals.reduce((sum, g) => {
    const remaining = Math.max(0, g.target_amount - g.current_amount);
    return sum + (remaining > 0 ? Math.min(remaining, g.target_amount * 0.05) : 0);
  }, 0);

  const liquidCash = summary.liquidCash;
  const safeToSpend = Math.max(0, liquidCash - upcomingBills - upcomingLoanPayments - savingsCommitments);

  // Calculate days remaining in current month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - today.getDate());
  const dailyDiscretionaryBudget = Math.round(safeToSpend / daysRemaining);

  return {
    liquidCash,
    upcomingBills,
    upcomingLoanPayments,
    savingsCommitments,
    safeToSpend,
    dailyDiscretionaryBudget,
  };
}

export interface SavingsProjectionResult {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  monthlySavings: number;
  monthsToReach: number;
  targetAchievedDate: string;
}

export function projectSavings(
  targetAmount: number,
  currentAmount: number,
  monthlySavings: number
): SavingsProjectionResult {
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  if (monthlySavings <= 0) {
    return {
      targetAmount,
      currentAmount,
      remainingAmount,
      monthlySavings: 0,
      monthsToReach: Infinity,
      targetAchievedDate: 'Never (zero monthly savings)',
    };
  }

  const monthsToReach = Math.ceil(remainingAmount / monthlySavings);
  const finishDate = new Date();
  finishDate.setMonth(finishDate.getMonth() + monthsToReach);

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    monthlySavings,
    monthsToReach,
    targetAchievedDate: finishDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
  };
}

export interface DebtPayoffResult {
  principal: number;
  interestRate: number;
  monthlyPayment: number;
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffDate: string;
}

export function calculateDebtPayoff(
  principal: number,
  annualInterestRate: number,
  monthlyPayment: number
): DebtPayoffResult {
  if (principal <= 0 || monthlyPayment <= 0) {
    return {
      principal,
      interestRate: annualInterestRate,
      monthlyPayment,
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      totalPaid: principal,
      payoffDate: 'Today',
    };
  }

  const monthlyRate = (annualInterestRate / 100) / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;

  // If interest is greater than or equal to payment, debt is never paid off
  if (monthlyRate > 0 && balance * monthlyRate >= monthlyPayment) {
    return {
      principal,
      interestRate: annualInterestRate,
      monthlyPayment,
      monthsToPayoff: Infinity,
      totalInterestPaid: Infinity,
      totalPaid: Infinity,
      payoffDate: 'Never (monthly payment is less than monthly interest)',
    };
  }

  while (balance > 0 && months < 600) { // cap at 50 years to prevent infinite loop
    months++;
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    principal,
    interestRate: annualInterestRate,
    monthlyPayment,
    monthsToPayoff: months,
    totalInterestPaid: Math.round(totalInterest),
    totalPaid: Math.round(principal + totalInterest),
    payoffDate: payoffDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
  };
}

export interface CreditCardUtilization {
  cardId: string;
  name: string;
  balance: number;
  limit: number;
  utilizationRate: number; // 0 to 100
  isHighRisk: boolean; // >= 30%
}

export interface CreditUtilizationSummary {
  cards: CreditCardUtilization[];
  totalBalance: number;
  totalLimit: number;
  aggregateUtilizationRate: number;
  hasHighUtilization: boolean;
}

export async function getCreditCardUtilization(): Promise<CreditUtilizationSummary> {
  const db = await getDatabase();
  const cards = await db.getAllAsync<Account>(
    "SELECT * FROM accounts WHERE type = 'credit_card' AND is_archived = 0"
  );

  let totalBalance = 0;
  let totalLimit = 0;

  const cardList: CreditCardUtilization[] = cards.map(c => {
    const balance = Math.max(0, c.current_balance);
    const limit = c.credit_limit || 0;
    const rate = limit > 0 ? Math.round((balance / limit) * 100) : 0;
    totalBalance += balance;
    totalLimit += limit;

    return {
      cardId: c.id,
      name: c.name,
      balance,
      limit,
      utilizationRate: rate,
      isHighRisk: rate >= 30,
    };
  });

  const aggregateRate = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

  return {
    cards: cardList,
    totalBalance,
    totalLimit,
    aggregateUtilizationRate: aggregateRate,
    hasHighUtilization: aggregateRate >= 30 || cardList.some(c => c.isHighRisk),
  };
}

