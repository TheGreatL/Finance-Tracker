import type { SQLiteDatabase } from 'expo-sqlite';
import type { TransactionRecord, AccountPocket, LoanRecord, SubscriptionRecord } from '../types/database';
import { getAllActivePockets } from './accountService';
import { getRecentTransactions } from './transactionService';
import { getActiveLoans } from './loanService';
import { getAllSubscriptions, normalizeToMonthlyAmount } from './subscriptionService';

export interface MonthlyFlow {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
}

export interface CategoryBreakdown {
    category: string;
    total: number;
    percentage: number;
    count: number;
}

export interface AssetDistribution {
    total: number;
    bankTotal: number;
    bankPercentage: number;
    ewalletTotal: number;
    ewalletPercentage: number;
    cashTotal: number;
    cashPercentage: number;
}

export interface SubscriptionAnalyticsItem {
    id: string;
    serviceName: string;
    serviceCode: string;
    amount: number;
    normalizedMonthly: number;
    frequency: string;
    category: string;
    nextBillingDate: string;
    pocketLabel: string;
}

export interface SubscriptionsAnalytics {
    monthlyTotal: number;
    yearlyProjected: number;
    activeCount: number;
    pausedCount: number;
    subscriptions: SubscriptionAnalyticsItem[];
}

export interface LoanAnalyticsItem {
    id: string;
    title: string;
    institutionName: string;
    totalAmount: number;
    remainingBalance: number;
    repaidAmount: number;
    progressPercentage: number;
    monthlyPayment: number;
    dueDate: string;
    interestRate?: number | null;
}

export interface LoansAnalytics {
    totalOutstandingDebt: number;
    totalOriginalAmount: number;
    totalRepaidSoFar: number;
    repaymentPercentage: number;
    monthlyPaymentTotal: number;
    activeCount: number;
    nextDueLoan: {
        title: string;
        institutionName: string;
        monthlyPayment: number;
        dueDate: string;
        remainingBalance: number;
    } | null;
    loans: LoanAnalyticsItem[];
}

export interface FixedCommitmentsSummary {
    monthlyTotal: number;
    monthlySubscriptions: number;
    monthlyLoanPayments: number;
}

export interface AnalyticsSummary {
    monthlyFlow: MonthlyFlow;
    categoryBreakdown: CategoryBreakdown[];
    assetDistribution: AssetDistribution;
    subscriptionsAnalytics: SubscriptionsAnalytics;
    loansAnalytics: LoansAnalytics;
    fixedCommitments: FixedCommitmentsSummary;
    totalLoansDebt: number; // Backwards-compatible
}

export function calculateMonthlyFlow(transactions: TransactionRecord[]): MonthlyFlow {
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense
    };
}

export function calculateCategoryBreakdown(transactions: TransactionRecord[]): CategoryBreakdown[] {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    if (totalExpense === 0) return [];

    const map = new Map<string, { total: number; count: number }>();
    for (const t of expenses) {
        const cat = t.category || 'General';
        const existing = map.get(cat) || { total: 0, count: 0 };
        map.set(cat, {
            total: existing.total + t.amount,
            count: existing.count + 1
        });
    }

    const result: CategoryBreakdown[] = [];
    for (const [category, data] of map.entries()) {
        result.push({
            category,
            total: data.total,
            percentage: Math.round((data.total / totalExpense) * 100),
            count: data.count
        });
    }

    return result.sort((a, b) => b.total - a.total);
}

export function calculateAssetDistribution(pockets: (AccountPocket & { institution_type?: string })[]): AssetDistribution {
    const total = pockets.reduce((sum, p) => sum + p.current_balance, 0);
    if (total === 0) {
        return {
            total: 0,
            bankTotal: 0,
            bankPercentage: 0,
            ewalletTotal: 0,
            ewalletPercentage: 0,
            cashTotal: 0,
            cashPercentage: 0
        };
    }

    let bankTotal = 0;
    let ewalletTotal = 0;
    let cashTotal = 0;

    for (const p of pockets) {
        const type = p.institution_type || 'bank';
        if (type === 'ewallet') {
            ewalletTotal += p.current_balance;
        } else if (type === 'cash') {
            cashTotal += p.current_balance;
        } else {
            bankTotal += p.current_balance;
        }
    }

    return {
        total,
        bankTotal,
        bankPercentage: Math.round((bankTotal / total) * 100),
        ewalletTotal,
        ewalletPercentage: Math.round((ewalletTotal / total) * 100),
        cashTotal,
        cashPercentage: Math.round((cashTotal / total) * 100)
    };
}

export function calculateSubscriptionsAnalytics(
    subscriptions: (SubscriptionRecord & { pocket_name?: string; institution_name?: string })[]
): SubscriptionsAnalytics {
    const active = subscriptions.filter((s) => s.status === 'active');
    const paused = subscriptions.filter((s) => s.status === 'paused');

    const monthlyTotal = Math.round(active.reduce((sum, s) => sum + normalizeToMonthlyAmount(s.amount, s.frequency), 0) * 100) / 100;

    const yearlyProjected = Math.round(monthlyTotal * 12 * 100) / 100;

    const items: SubscriptionAnalyticsItem[] = active.map((s) => {
        const norm = normalizeToMonthlyAmount(s.amount, s.frequency);
        const pocketLabel = s.institution_name ? `${s.institution_name} • ${s.pocket_name || 'Wallet'}` : s.pocket_name || 'Account';

        return {
            id: s.id,
            serviceName: s.service_name,
            serviceCode: s.service_code || 'custom',
            amount: s.amount,
            normalizedMonthly: norm,
            frequency: s.frequency,
            category: s.category,
            nextBillingDate: s.next_billing_date,
            pocketLabel
        };
    });

    items.sort((a, b) => b.normalizedMonthly - a.normalizedMonthly);

    return {
        monthlyTotal,
        yearlyProjected,
        activeCount: active.length,
        pausedCount: paused.length,
        subscriptions: items
    };
}

export function calculateLoansAnalytics(loans: (LoanRecord & { institution_name?: string })[]): LoansAnalytics {
    const active = loans.filter((l) => l.status === 'active');

    const totalOutstandingDebt = Math.round(active.reduce((sum, l) => sum + l.remaining_balance, 0) * 100) / 100;

    const totalOriginalAmount = Math.round(active.reduce((sum, l) => sum + l.total_amount, 0) * 100) / 100;

    const totalRepaidSoFar = Math.max(0, Math.round((totalOriginalAmount - totalOutstandingDebt) * 100) / 100);

    const repaymentPercentage = totalOriginalAmount > 0 ? Math.min(100, Math.round((totalRepaidSoFar / totalOriginalAmount) * 100)) : 0;

    const monthlyPaymentTotal = Math.round(active.reduce((sum, l) => sum + l.monthly_payment, 0) * 100) / 100;

    const sortedByDue = [...active].sort((a, b) => a.due_date.localeCompare(b.due_date));
    const nextDue = sortedByDue.length > 0 ? sortedByDue[0] : null;

    const loanItems: LoanAnalyticsItem[] = active.map((l) => {
        const repaid = Math.max(0, l.total_amount - l.remaining_balance);
        const progress = l.total_amount > 0 ? Math.min(100, Math.round((repaid / l.total_amount) * 100)) : 0;

        return {
            id: l.id,
            title: l.title,
            institutionName: l.institution_name || 'Lender',
            totalAmount: l.total_amount,
            remainingBalance: l.remaining_balance,
            repaidAmount: repaid,
            progressPercentage: progress,
            monthlyPayment: l.monthly_payment,
            dueDate: l.due_date,
            interestRate: l.interest_rate
        };
    });

    return {
        totalOutstandingDebt,
        totalOriginalAmount,
        totalRepaidSoFar,
        repaymentPercentage,
        monthlyPaymentTotal,
        activeCount: active.length,
        nextDueLoan: nextDue
            ? {
                  title: nextDue.title,
                  institutionName: nextDue.institution_name || 'Lender',
                  monthlyPayment: nextDue.monthly_payment,
                  dueDate: nextDue.due_date,
                  remainingBalance: nextDue.remaining_balance
              }
            : null,
        loans: loanItems
    };
}

export async function getAnalyticsSummary(db: SQLiteDatabase): Promise<AnalyticsSummary> {
    const [pockets, transactions, loans, subscriptions] = await Promise.all([
        getAllActivePockets(db),
        getRecentTransactions(db, 200),
        getActiveLoans(db).catch(() => []),
        getAllSubscriptions(db).catch(() => [])
    ]);

    const monthlyFlow = calculateMonthlyFlow(transactions);
    const categoryBreakdown = calculateCategoryBreakdown(transactions);
    const assetDistribution = calculateAssetDistribution(pockets);
    const subscriptionsAnalytics = calculateSubscriptionsAnalytics(subscriptions);
    const loansAnalytics = calculateLoansAnalytics(loans);

    const fixedCommitments: FixedCommitmentsSummary = {
        monthlyTotal: Math.round((subscriptionsAnalytics.monthlyTotal + loansAnalytics.monthlyPaymentTotal) * 100) / 100,
        monthlySubscriptions: subscriptionsAnalytics.monthlyTotal,
        monthlyLoanPayments: loansAnalytics.monthlyPaymentTotal
    };

    return {
        monthlyFlow,
        categoryBreakdown,
        assetDistribution,
        subscriptionsAnalytics,
        loansAnalytics,
        fixedCommitments,
        totalLoansDebt: loansAnalytics.totalOutstandingDebt
    };
}
