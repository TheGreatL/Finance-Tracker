import type { SQLiteDatabase } from 'expo-sqlite';
import { GEMINI_API_KEY } from '../constants/config';
import { getAllActivePockets } from './accountService';
import { getActiveLoans, getLoansSummary, calculateLoanInstallmentSchedule } from './loanService';
import { getIncomeSummary, type IncomeSummary } from './salaryService';
import { getAllSubscriptions } from './subscriptionService';
import { getRecentTransactions } from './transactionService';
import {
    calculateSubscriptionsAnalytics,
    calculateCategoryBreakdown,
    calculateMonthlyFlow,
    type SubscriptionsAnalytics,
    type CategoryBreakdown
} from './analyticsService';
import type { AccountPocket, LoanRecord, SubscriptionRecord, TransactionRecord } from '../types/database';
import type { ChatStatus } from './chatEngine';

export interface GeminiAdvisorResult {
    text: string;
    status: ChatStatus;
    source: 'gemini';
}

export interface ExtraFinancialContext {
    subscriptionsSummary?: SubscriptionsAnalytics;
    spendingSummary?: {
        monthlyExpense: number;
        monthlyIncome: number;
        netSavings: number;
        topCategories: CategoryBreakdown[];
        recentTransactions: TransactionRecord[];
    };
    amortizationSchedules?: {
        loanId: string;
        title: string;
        activeInstallmentDue?: string;
        residualDue?: number;
        settledMonths: number;
        totalMonths: number;
    }[];
}

/**
 * Builds a dynamic system prompt containing the user's real-time financial snapshot.
 */
export function buildFinancialSystemContext(
    pockets: (AccountPocket & { institution_name?: string })[],
    loans: LoanRecord[],
    loansSummary: { totalLoanBalance: number; nextDueLoan: LoanRecord | null; activeCount: number },
    incomeSummary?: IncomeSummary,
    extraContext?: ExtraFinancialContext
): string {
    const walletPockets = pockets.filter((p) => p.pocket_type !== 'savings');
    const savingsPockets = pockets.filter((p) => p.pocket_type === 'savings');
    const totalSpendable = walletPockets.reduce((sum, p) => sum + p.current_balance, 0);
    const totalSavings = savingsPockets.reduce((sum, p) => sum + p.current_balance, 0);
    const totalLiquid = totalSpendable + totalSavings;

    const pocketLines = pockets
        .map(
            (p) =>
                `• ${p.institution_name || 'Bank'} - ${p.name} (${p.pocket_type === 'savings' ? 'Savings' : 'Spendable Wallet'}): ₱${p.current_balance.toLocaleString()}`
        )
        .join('\n');

    const loanLines =
        loans.length === 0
            ? 'No active loans (Debt-free)'
            : loans
                  .map((l) => {
                      const sched = extraContext?.amortizationSchedules?.find((s) => s.loanId === l.id);
                      const schedText = sched
                          ? ` • ${sched.settledMonths}/${sched.totalMonths} mos settled` +
                            (sched.residualDue !== undefined
                                ? ` • Active Due: ₱${sched.residualDue.toLocaleString()} on ${sched.activeInstallmentDue || l.due_date}`
                                : '')
                          : '';
                      return `• ${l.title} (${l.institution_name || 'Lender'}): ₱${l.remaining_balance.toLocaleString()} remaining • Monthly: ₱${l.monthly_payment.toLocaleString()} (Due: ${l.due_date})${schedText}`;
                  })
                  .join('\n');

    const nextDueText = loansSummary.nextDueLoan
        ? `₱${loansSummary.nextDueLoan.monthly_payment.toLocaleString()} due on ${loansSummary.nextDueLoan.due_date} (${loansSummary.nextDueLoan.title})`
        : 'None';

    const incomeSection =
        incomeSummary && incomeSummary.activeJobsCount > 0
            ? `- Monthly Gross Earnings: ₱${incomeSummary.monthlyGross.toLocaleString()} across ${incomeSummary.activeJobsCount} active job(s)
- Total Monthly Payroll Deductions: -₱${incomeSummary.monthlyDeductions.toLocaleString()} (Taxes: ₱${incomeSummary.deductionBreakdown.tax.toLocaleString()}, Statutory: ₱${incomeSummary.deductionBreakdown.statutory.toLocaleString()})
- Net Expected Monthly Take-Home: ₱${incomeSummary.monthlyNetTakeHome.toLocaleString()}
${incomeSummary.nextPayday ? `- Next Upcoming Payday: ₱${incomeSummary.nextPayday.netAmount.toLocaleString()} from ${incomeSummary.nextPayday.companyName} on ${incomeSummary.nextPayday.payDate}` : ''}`
            : '- Active Jobs & Salary: No active jobs configured';

    const subsSummary = extraContext?.subscriptionsSummary;
    const subscriptionSection =
        subsSummary && subsSummary.activeCount > 0
            ? `- Monthly Recurring Subscriptions: ₱${subsSummary.monthlyTotal.toLocaleString()}/mo across ${subsSummary.activeCount} service(s) (Yearly: ₱${subsSummary.yearlyProjected.toLocaleString()})
${subsSummary.subscriptions
    .slice(0, 6)
    .map((s) => `  • ${s.serviceName}: ₱${s.amount.toLocaleString()} (${s.frequency}) via ${s.pocketLabel} • Next billing: ${s.nextBillingDate}`)
    .join('\n')}`
            : '- Active Subscriptions: None configured';

    const spending = extraContext?.spendingSummary;
    const spendingSection = spending
        ? `- Current Month Expenses: ₱${spending.monthlyExpense.toLocaleString()}
- Current Month Inflows: ₱${spending.monthlyIncome.toLocaleString()}
- Current Month Net Savings: ₱${spending.netSavings.toLocaleString()}
- Top Expense Categories:
${
    spending.topCategories.length > 0
        ? spending.topCategories
              .slice(0, 4)
              .map((c) => `  • ${c.category}: ₱${c.total.toLocaleString()} (${c.percentage}%)`)
              .join('\n')
        : '  • No category breakdown available'
}
- Recent Outflow Transactions:
${
    spending.recentTransactions.length > 0
        ? spending.recentTransactions
              .slice(0, 5)
              .map((t) => `  • [${t.date}] ${t.title} (${t.category}): -₱${t.amount.toLocaleString()}`)
              .join('\n')
        : '  • No recent expense transactions'
}`
        : '- Spending Analytics: No recent transactions recorded';

    const totalFixedObligations =
        (loansSummary.nextDueLoan ? loans.reduce((sum, l) => sum + l.monthly_payment, 0) : 0) + (subsSummary?.monthlyTotal || 0);

    return `You are PocketBot, a smart, encouraging, and prudent personal financial advisor for a user in the Philippines.
All currency values are in Philippine Pesos (₱).

CURRENT REAL-TIME FINANCIAL STATE FROM USER'S SQLITE DATABASE:
- Total Liquid Money: ₱${totalLiquid.toLocaleString()}
  • Spendable Cash & Wallets: ₱${totalSpendable.toLocaleString()}
  • Reserved Savings & Emergency Funds: ₱${totalSavings.toLocaleString()}
- Individual Pockets & Balances:
${pocketLines || '• No accounts configured yet'}
- Employment & Income Streams:
${incomeSection}
- Fixed Monthly Obligations (Loans + Subscriptions): ₱${totalFixedObligations.toLocaleString()}/mo
- Total Outstanding Active Loans: ₱${loansSummary.totalLoanBalance.toLocaleString()} across ${loans.length} active loans
- Active Loan Obligations & Amortization Schedules:
${loanLines}
- Next Loan Payment Due: ${nextDueText}
- Subscriptions & Recurring Bills:
${subscriptionSection}
- Spending Behavior & Recent Transactions:
${spendingSection}

INSTRUCTIONS FOR RESPONDING:
1. When asked "Can I afford X?", calculate whether the user has enough spendable cash (₱${totalSpendable.toLocaleString()}) and total liquid money (₱${totalLiquid.toLocaleString()}).
   - Differentiate spendable wallet cash from emergency savings! If the purchase requires dipping into dedicated savings pockets (₱${totalSavings.toLocaleString()}), explicitly warn them not to compromise their savings cushion.
   - Check if spending this amount would leave them with less than their upcoming loan payment (${nextDueText}) or upcoming subscription bills. If so, caution them that their fixed obligations are at risk!
   - If the purchase exceeds total money, clearly say no and state how much they are short by.
   - If safe, warmly confirm they can afford it and show what their remaining balance will be.
2. When asked about spending, expenses, or "Where did my money go?", reference their current month's expenses, top expense categories, and recent transactions.
3. When asked about subscriptions or recurring bills, summarize their active services, monthly/yearly commitments, and upcoming billing dates.
4. When asked about income, paycheck, job changes, or taxes, reference their gross earnings, itemized deductions (taxes, statutory SSS/PhilHealth/Pag-IBIG), and net take-home pay.
5. When asked about loans, reference their remaining debt, monthly payments, and amortization status (including any installments settled in advance or partial residuals due).
6. Keep answers concise, clear, and well-structured with markdown bolding (**₱Amount**) and bullet points.
7. If asked about general money topics, answer helpfully while referencing their current financial reality when relevant.
8. Never use emojis or emoticons in your answers. Keep the tone professional, clean, and modern without any emojis.`;
}

/**
 * Determines status flag from model output text.
 */
export function inferStatusFromText(text: string): ChatStatus {
    const lower = text.toLowerCase();
    if (lower.includes('cannot afford') || lower.includes('short by') || lower.includes("can't afford") || lower.includes('exceeds your available')) {
        return 'unaffordable';
    }
    if (lower.includes('caution') || lower.includes('tight') || lower.includes('compromise') || lower.includes('warning') || lower.includes('risk')) {
        return 'tight';
    }
    if (lower.includes('can afford') || lower.includes('comfortably afford') || lower.includes('yes!') || lower.includes('safe to buy')) {
        return 'safe';
    }
    return 'info';
}

export interface QueryGeminiOptions {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    maxRetries?: number;
    fetchFn?: typeof fetch;
    fetchPockets?: (db: SQLiteDatabase) => Promise<(AccountPocket & { institution_name?: string })[]>;
    fetchLoans?: (db: SQLiteDatabase) => Promise<LoanRecord[]>;
    fetchLoansSummary?: (db: SQLiteDatabase) => Promise<{ totalLoanBalance: number; nextDueLoan: LoanRecord | null; activeCount: number }>;
    fetchIncomeSummary?: (db: SQLiteDatabase) => Promise<IncomeSummary>;
    fetchSubscriptions?: (db: SQLiteDatabase) => Promise<SubscriptionRecord[]>;
    fetchTransactions?: (db: SQLiteDatabase) => Promise<TransactionRecord[]>;
}

/**
 * Queries Google Gemini API with the user's financial context injected.
 * Throws an error on network/timeout failure so caller can delegate to offline engine.
 */
export async function queryGeminiAdvisor(db: SQLiteDatabase, prompt: string, options?: QueryGeminiOptions): Promise<GeminiAdvisorResult> {
    const apiKey = options?.apiKey || GEMINI_API_KEY || (options?.fetchFn ? 'mock-api-key' : '');
    if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please check EXPO_PUBLIC_GEMINI_API_KEY in .env');
    }

    const model = options?.model || 'gemini-3.5-flash-lite';
    const timeoutMs = options?.timeoutMs || 20000;
    const maxRetries = options?.maxRetries ?? 1;
    const fetchFn = options?.fetchFn || fetch;

    const getPockets = options?.fetchPockets || getAllActivePockets;
    const getLoans = options?.fetchLoans || getActiveLoans;
    const getLoansSum = options?.fetchLoansSummary || getLoansSummary;
    const getIncSum = options?.fetchIncomeSummary || getIncomeSummary;
    const getSubs = options?.fetchSubscriptions || getAllSubscriptions;
    const getTxs = options?.fetchTransactions || ((database: SQLiteDatabase) => getRecentTransactions(database, 200));

    const [pockets, loans, loansSummary, incomeSummary, subscriptions, transactions] = await Promise.all([
        getPockets(db),
        getLoans(db),
        getLoansSum(db),
        getIncSum(db).catch(() => undefined),
        getSubs(db).catch(() => []),
        getTxs(db).catch(() => [])
    ]);

    const subscriptionsSummary = calculateSubscriptionsAnalytics(subscriptions);
    const monthlyFlow = calculateMonthlyFlow(transactions);
    const categoryBreakdown = calculateCategoryBreakdown(transactions);
    const expenseTransactions = transactions.filter((t) => t.type === 'expense');

    const amortizationSchedules = loans
        .filter((l) => l.term_months && l.term_months > 0)
        .map((l) => {
            const sched = calculateLoanInstallmentSchedule(l);
            return {
                loanId: l.id,
                title: l.title,
                activeInstallmentDue: sched.activeInstallment?.dueDate,
                residualDue: sched.activeInstallment?.remainingDue,
                settledMonths: sched.settledCount,
                totalMonths: sched.totalTermMonths
            };
        });

    const extraContext: ExtraFinancialContext = {
        subscriptionsSummary,
        spendingSummary: {
            monthlyExpense: monthlyFlow.totalExpense,
            monthlyIncome: monthlyFlow.totalIncome,
            netSavings: monthlyFlow.netSavings,
            topCategories: categoryBreakdown,
            recentTransactions: expenseTransactions.slice(0, 5)
        },
        amortizationSchedules
    };

    const systemInstruction = buildFinancialSystemContext(pockets, loans, loansSummary, incomeSummary, extraContext);

    const requestBody = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 600
        }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            try {
                controller.abort();
            } catch {
                // ignore
            }
        }, timeoutMs);

        try {
            const res = await fetchFn(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!res.ok) {
                // Non-retriable client errors (except 429 Too Many Requests)
                if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                    throw new Error(`Gemini API error ${res.status}: ${res.statusText}`);
                }
                throw new Error(`Gemini API error ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!candidateText || typeof candidateText !== 'string') {
                throw new Error('Gemini API returned an empty response.');
            }

            return {
                text: candidateText.trim(),
                status: inferStatusFromText(candidateText),
                source: 'gemini'
            };
        } catch (err: any) {
            clearTimeout(timer);
            const isAborted = controller.signal.aborted;
            const isCancelled =
                isAborted ||
                err?.name === 'AbortError' ||
                err?.message?.toLowerCase().includes('cancelled') ||
                err?.message?.toLowerCase().includes('aborted');

            if (isCancelled) {
                lastError = new Error(`Connection timed out after ${Math.round(timeoutMs / 1000)}s`);
            } else {
                lastError = err;
            }

            // Retry on transient network drop or cancellation if retries remain
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
            }
        }
    }

    throw lastError;
}

export interface VerifyConnectionOptions {
    apiKey?: string;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
}

/**
 * Rapidly verifies active internet connectivity to Google Gemini API.
 * Uses a lightweight metadata probe with a 5-second timeout.
 */
export async function verifyGeminiConnection(options?: VerifyConnectionOptions): Promise<{ ok: boolean; error?: string }> {
    const apiKey = options?.apiKey || GEMINI_API_KEY || (options?.fetchFn ? 'mock-api-key' : '');
    if (!apiKey) {
        return { ok: false, error: 'Gemini API key is not configured in .env' };
    }

    const timeoutMs = options?.timeoutMs || 5000;
    const fetchFn = options?.fetchFn || fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => {
        try {
            controller.abort();
        } catch {
            // ignore
        }
    }, timeoutMs);

    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetchFn(endpoint, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
            return { ok: true };
        }
        return { ok: false, error: `Server returned status ${res.status}` };
    } catch (err: any) {
        clearTimeout(timer);
        if (controller.signal.aborted) {
            return { ok: false, error: 'Connection timed out. Server unreachable.' };
        }
        return { ok: false, error: err?.message || 'Internet connection unavailable' };
    }
}
