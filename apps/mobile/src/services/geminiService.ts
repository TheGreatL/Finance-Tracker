import type { SQLiteDatabase } from 'expo-sqlite';
import { GEMINI_API_KEY } from '../constants/config';
import { getAllActivePockets } from './accountService';
import { getActiveLoans, getLoansSummary } from './loanService';
import { getIncomeSummary, type IncomeSummary } from './salaryService';
import type { AccountPocket, LoanRecord } from '../types/database';
import type { ChatStatus } from './chatEngine';

export interface GeminiAdvisorResult {
    text: string;
    status: ChatStatus;
    source: 'gemini';
}

/**
 * Builds a dynamic system prompt containing the user's real-time financial snapshot.
 */
export function buildFinancialSystemContext(
    pockets: (AccountPocket & { institution_name?: string })[],
    loans: LoanRecord[],
    loansSummary: { totalLoanBalance: number; nextDueLoan: LoanRecord | null; activeCount: number },
    incomeSummary?: IncomeSummary
): string {
    const totalLiquid = pockets.reduce((sum, p) => sum + p.current_balance, 0);

    const pocketLines = pockets.map((p) => `• ${p.institution_name || 'Bank'} - ${p.name}: ₱${p.current_balance.toLocaleString()}`).join('\n');

    const loanLines =
        loans.length === 0
            ? 'No active loans (Debt-free)'
            : loans
                  .map(
                      (l) =>
                          `• ${l.title} (${l.institution_name}): ₱${l.remaining_balance.toLocaleString()} remaining • Monthly: ₱${l.monthly_payment.toLocaleString()} (Due: ${l.due_date})`
                  )
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

    return `You are PocketBot, a smart, encouraging, and prudent personal financial advisor for a user in the Philippines.
All currency values are in Philippine Pesos (₱).

CURRENT REAL-TIME FINANCIAL STATE FROM USER'S SQLITE DATABASE:
- Total Available Liquid Money: ₱${totalLiquid.toLocaleString()}
- Individual Pockets & Balances:
${pocketLines || '• No accounts configured yet'}
- Employment & Income Streams:
${incomeSection}
- Total Outstanding Active Loans: ₱${loansSummary.totalLoanBalance.toLocaleString()} across ${loans.length} active loans
- Active Loan Obligations:
${loanLines}
- Next Loan Payment Due: ${nextDueText}

INSTRUCTIONS FOR RESPONDING:
1. When asked "Can I afford X?", calculate whether the user has enough liquid money (₱${totalLiquid.toLocaleString()}).
   - If they have enough, check if spending this amount would leave them with less than their upcoming loan payment (${nextDueText}). If so, warn them that their budget will be tight and caution them!
   - If the purchase exceeds total money, clearly say no and state how much they are short by.
   - If safe, warmly confirm they can afford it and show what their remaining balance will be.
2. When asked about income, paycheck, job changes, or taxes, reference their gross earnings, itemized deductions (taxes, statutory SSS/PhilHealth/Pag-IBIG), and net take-home pay.
3. Keep answers concise, clear, and well-structured with markdown bolding (**₱Amount**) and bullet points.
4. If asked about general money topics, answer helpfully while referencing their current financial reality when relevant.`;
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
    fetchFn?: typeof fetch;
    fetchPockets?: (db: SQLiteDatabase) => Promise<(AccountPocket & { institution_name?: string })[]>;
    fetchLoans?: (db: SQLiteDatabase) => Promise<LoanRecord[]>;
    fetchLoansSummary?: (db: SQLiteDatabase) => Promise<{ totalLoanBalance: number; nextDueLoan: LoanRecord | null; activeCount: number }>;
    fetchIncomeSummary?: (db: SQLiteDatabase) => Promise<IncomeSummary>;
}

/**
 * Queries Google Gemini API with the user's financial context injected.
 * Throws an error on network/timeout failure so caller can delegate to offline engine.
 */
export async function queryGeminiAdvisor(db: SQLiteDatabase, prompt: string, options?: QueryGeminiOptions): Promise<GeminiAdvisorResult> {
    const apiKey = options?.apiKey || GEMINI_API_KEY;
    const model = options?.model || 'gemini-3.5-flash-lite';
    const timeoutMs = options?.timeoutMs || 8000;
    const fetchFn = options?.fetchFn || fetch;

    const getPockets = options?.fetchPockets || getAllActivePockets;
    const getLoans = options?.fetchLoans || getActiveLoans;
    const getLoansSum = options?.fetchLoansSummary || getLoansSummary;
    const getIncSum = options?.fetchIncomeSummary || getIncomeSummary;

    const [pockets, loans, loansSummary, incomeSummary] = await Promise.all([
        getPockets(db),
        getLoans(db),
        getLoansSum(db),
        getIncSum(db).catch(() => undefined)
    ]);

    const systemInstruction = buildFinancialSystemContext(pockets, loans, loansSummary, incomeSummary);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}
