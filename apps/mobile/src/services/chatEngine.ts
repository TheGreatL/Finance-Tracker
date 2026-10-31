import type { SQLiteDatabase } from 'expo-sqlite';
import { getAllActivePockets } from './accountService';
import { getActiveLoans, getLoansSummary } from './loanService';
import type { AccountPocket, LoanRecord } from '../types/database';
import { PHILIPPINE_INSTITUTIONS } from '../constants/institutions';

export type ChatIntent = 'affordability' | 'projection' | 'debt' | 'balance' | 'institution_balance' | 'unknown';

export type ChatStatus = 'safe' | 'tight' | 'unaffordable' | 'info' | 'unknown';

export interface ChatMessageResponse {
    text: string;
    status: ChatStatus;
    intent: ChatIntent;
    amount?: number;
    data?: Record<string, any>;
}

export interface EvaluateChatOptions {
    getAllActivePockets?: (db: SQLiteDatabase) => Promise<(AccountPocket & { institution_name?: string; institution_code?: string })[]>;
    getActiveLoans?: (db: SQLiteDatabase) => Promise<LoanRecord[]>;
    getLoansSummary?: (db: SQLiteDatabase) => Promise<{ totalLoanBalance: number; nextDueLoan: LoanRecord | null; activeCount: number }>;
    referenceDate?: Date;
}

/**
 * Extracts a numeric amount from user prompt.
 * Supports: 5000, 15,000, ₱15,000, P5000, php 3500, 15k, 2.5k, 2m
 */
export function parseAmount(input: string): number | null {
    if (!input) return null;
    const clean = input.toLowerCase();

    // 1. Shorthand notation like 15k, 2.5k, 2m
    const shorthandMatch = clean.match(/(?:[₱p]|php)?\s*(\d+(?:\.\d+)?)\s*([km])\b/);
    if (shorthandMatch) {
        const num = parseFloat(shorthandMatch[1]);
        const unit = shorthandMatch[2];
        if (unit === 'k') return Math.round(num * 1000);
        if (unit === 'm') return Math.round(num * 1000000);
    }

    // 2. Standard digits with commas or currency signs: ₱15,000 or 15000.50
    const standardMatch = clean.match(/(?:[₱p]|php)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
    if (standardMatch) {
        const rawNumberStr = standardMatch[1].replace(/,/g, '');
        const num = parseFloat(rawNumberStr);
        if (!isNaN(num) && num > 0) {
            return num;
        }
    }

    return null;
}

/**
 * Detects the user's financial intent from natural language prompt.
 */
export function detectIntent(input: string): ChatIntent {
    const norm = input.toLowerCase().trim();

    // Affordability
    if (
        norm.includes('afford') ||
        norm.includes('can i buy') ||
        norm.includes('can we buy') ||
        norm.includes('should i buy') ||
        norm.includes('kaya ba')
    ) {
        return 'affordability';
    }

    // Projection / What-if
    if (
        norm.includes('how much will i have') ||
        norm.includes('how much money will i have') ||
        norm.includes('remaining if') ||
        norm.includes('left if') ||
        norm.includes('what will be left') ||
        norm.includes('matitira')
    ) {
        return 'projection';
    }

    // Debt & Loans
    if (norm.includes('owe') || norm.includes('loan') || norm.includes('debt') || norm.includes('utang') || norm.includes('credit line')) {
        return 'debt';
    }

    // Specific institution balance check
    const hasBalanceWord = norm.includes('balance') || norm.includes('how much in') || norm.includes('how much money in') || norm.includes('pera sa');

    const knownInstitutions = [
        'gcash',
        'maya',
        'bdo',
        'bpi',
        'seabank',
        'gotyme',
        'unionbank',
        'metrobank',
        'komo',
        'tonik',
        'cimb',
        'cash',
        'billease',
        'tala',
        'home credit'
    ];

    const matchedInstitution = knownInstitutions.some((inst) => norm.includes(inst));
    if (hasBalanceWord && matchedInstitution) {
        return 'institution_balance';
    }

    // Total balance check
    if (
        norm.includes('how much money do i have') ||
        norm.includes('total balance') ||
        norm.includes('total cash') ||
        norm.includes('total money') ||
        norm.includes('net money') ||
        norm.includes('kabuuang pera') ||
        norm === 'balance'
    ) {
        return 'balance';
    }

    return 'unknown';
}

/**
 * Extracts institution name from prompt if present.
 */
function extractInstitutionName(prompt: string): string | null {
    const norm = prompt.toLowerCase();
    for (const inst of Object.values(PHILIPPINE_INSTITUTIONS)) {
        if (norm.includes(inst.code.toLowerCase()) || norm.includes(inst.name.toLowerCase())) {
            return inst.name;
        }
    }
    if (norm.includes('cash')) return 'Cash';
    return null;
}

/**
 * Evaluates user prompt against SQLite data without external AI APIs.
 */
export async function evaluateChatPrompt(db: SQLiteDatabase, prompt: string, options?: EvaluateChatOptions): Promise<ChatMessageResponse> {
    const fetchPockets = options?.getAllActivePockets ?? getAllActivePockets;
    const fetchLoans = options?.getActiveLoans ?? getActiveLoans;
    const fetchLoansSummary = options?.getLoansSummary ?? getLoansSummary;
    const today = options?.referenceDate ?? new Date();

    const intent = detectIntent(prompt);
    const amount = parseAmount(prompt);

    const [pockets, activeLoans, loansSummary] = await Promise.all([fetchPockets(db), fetchLoans(db), fetchLoansSummary(db)]);

    const totalLiquid = pockets.reduce((sum, p) => sum + p.current_balance, 0);

    // Intent 1: Affordability
    if (intent === 'affordability') {
        if (!amount) {
            return {
                text: `Please include an amount you would like to test, e.g. **"Can I afford ₱5,000?"** or **"Can I afford 15k?"**.`,
                status: 'info',
                intent: 'affordability'
            };
        }

        // Check loans due within 14 days
        const upcomingLoans = activeLoans.filter((loan) => {
            if (!loan.due_date) return false;
            const dueDate = new Date(loan.due_date);
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 14;
        });

        const upcomingPaymentsTotal = upcomingLoans.reduce((sum, l) => sum + l.monthly_payment, 0);

        // Case 1: Exceeds total available money
        if (amount > totalLiquid) {
            const shortage = amount - totalLiquid;
            return {
                text: `**No, you cannot afford this right now.**\n\nYour total available money across all accounts is **₱${totalLiquid.toLocaleString()}**. You are short by **₱${shortage.toLocaleString()}** for this ₱${amount.toLocaleString()} purchase.`,
                status: 'unaffordable',
                intent: 'affordability',
                amount,
                data: { totalLiquid, shortage }
            };
        }

        // Case 2: Enough total cash, but risks upcoming loan commitments
        const remainingAfterPurchase = totalLiquid - amount;
        if (upcomingPaymentsTotal > 0 && remainingAfterPurchase < upcomingPaymentsTotal) {
            const primaryLoan = upcomingLoans[0];
            return {
                text: `**Caution: You can technically purchase this, but your funds will be tight.**\n\nYou currently have **₱${totalLiquid.toLocaleString()}**. Spending **₱${amount.toLocaleString()}** leaves you with **₱${remainingAfterPurchase.toLocaleString()}**.\n\nHowever, you have an upcoming **${primaryLoan.institution_name}** loan payment of **₱${primaryLoan.monthly_payment.toLocaleString()}** due on **${primaryLoan.due_date}**. Spending this may compromise your upcoming loan obligation!`,
                status: 'tight',
                intent: 'affordability',
                amount,
                data: { totalLiquid, remainingAfterPurchase, upcomingPaymentsTotal }
            };
        }

        // Case 3: Safe to afford
        return {
            text: `**Yes, you can afford this!**\n\nYou have **₱${totalLiquid.toLocaleString()}** available across your accounts. After spending **₱${amount.toLocaleString()}**, you will retain **₱${remainingAfterPurchase.toLocaleString()}** in liquid funds.`,
            status: 'safe',
            intent: 'affordability',
            amount,
            data: { totalLiquid, remainingAfterPurchase }
        };
    }

    // Intent 2: Projection / What-if
    if (intent === 'projection') {
        if (!amount) {
            return {
                text: `Please specify the amount you are planning to spend, e.g. **"How much will I have if I spend ₱4,500?"**.`,
                status: 'info',
                intent: 'projection'
            };
        }

        const projectedRemaining = totalLiquid - amount;
        if (projectedRemaining < 0) {
            return {
                text: `If you spend **₱${amount.toLocaleString()}**, your balance will fall into the negative by **-₱${Math.abs(projectedRemaining).toLocaleString()}** (Current funds: ₱${totalLiquid.toLocaleString()}).`,
                status: 'unaffordable',
                intent: 'projection',
                amount,
                data: { totalLiquid, projectedRemaining }
            };
        }

        return {
            text: `If you spend **₱${amount.toLocaleString()}**, you will have **₱${projectedRemaining.toLocaleString()}** remaining across your accounts (Current total: ₱${totalLiquid.toLocaleString()}).`,
            status: 'info',
            intent: 'projection',
            amount,
            data: { totalLiquid, projectedRemaining }
        };
    }

    // Intent 3: Debt & Loans
    if (intent === 'debt') {
        if (activeLoans.length === 0) {
            return {
                text: `**You are completely debt-free!** You have no active loans or credit lines recorded.`,
                status: 'info',
                intent: 'debt'
            };
        }

        const nextLoan = loansSummary.nextDueLoan;
        const loanLines = activeLoans
            .map(
                (l) =>
                    `• **${l.title}** (${l.institution_name}): ₱${l.remaining_balance.toLocaleString()} remaining • ₱${l.monthly_payment.toLocaleString()}/mo (Due: ${l.due_date})`
            )
            .join('\n');

        return {
            text: `**Total Active Debt: ₱${loansSummary.totalLoanBalance.toLocaleString()}** across ${activeLoans.length} active loans.\n\n${loanLines}${
                nextLoan
                    ? `\n\n**Next payment due:** ₱${nextLoan.monthly_payment.toLocaleString()} on **${nextLoan.due_date}** (${nextLoan.title}).`
                    : ''
            }`,
            status: 'info',
            intent: 'debt',
            data: { totalLoanBalance: loansSummary.totalLoanBalance, activeLoans }
        };
    }

    // Intent 4: Specific Institution Balance
    if (intent === 'institution_balance') {
        const instName = extractInstitutionName(prompt);
        if (!instName) {
            return {
                text: `Which institution would you like to check? E.g. **"How much in GCash?"** or **"Maya balance"**.`,
                status: 'info',
                intent: 'institution_balance'
            };
        }

        const matchingPockets = pockets.filter((p) => (p.institution_name || '').toLowerCase().includes(instName.toLowerCase()));

        if (matchingPockets.length === 0) {
            return {
                text: `You don't have any accounts or pockets set up under **${instName}** yet.`,
                status: 'info',
                intent: 'institution_balance'
            };
        }

        const instTotal = matchingPockets.reduce((sum, p) => sum + p.current_balance, 0);
        const breakdown = matchingPockets.map((p) => `• ${p.name}: ₱${p.current_balance.toLocaleString()}`).join('\n');

        return {
            text: `**${instName} Total: ₱${instTotal.toLocaleString()}**\n\n${breakdown}`,
            status: 'info',
            intent: 'institution_balance',
            data: { instName, instTotal, matchingPockets }
        };
    }

    // Intent 5: Total Balance
    if (intent === 'balance') {
        const topPockets = [...pockets]
            .sort((a, b) => b.current_balance - a.current_balance)
            .slice(0, 4)
            .map((p) => `• ${p.institution_name ? `${p.institution_name} (${p.name})` : p.name}: ₱${p.current_balance.toLocaleString()}`)
            .join('\n');

        return {
            text: `**Total Available Money: ₱${totalLiquid.toLocaleString()}**\n\nAcross ${pockets.length} accounts & pockets:\n${topPockets}`,
            status: 'info',
            intent: 'balance',
            data: { totalLiquid, pocketCount: pockets.length }
        };
    }

    // Fallback: Unknown
    return {
        text: `I'm your offline finance assistant. I calculate directly from your SQLite database without sending data anywhere. I can help answer questions like:\n\n• **"Can I afford ₱15,000?"**\n• **"How much will I have if I buy a phone for 25k?"**\n• **"How much do I owe right now?"**\n• **"How much money do I have?"**\n• **"How much in Maya?"**`,
        status: 'unknown',
        intent: 'unknown'
    };
}
