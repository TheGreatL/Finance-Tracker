import { describe, it, expect, vi } from 'vitest';
import { buildFinancialSystemContext, queryGeminiAdvisor, inferStatusFromText, verifyGeminiConnection } from '../src/services/geminiService';

describe('geminiService', () => {
    const mockPockets = [
        {
            id: 'p1',
            institution_id: 'i1',
            name: 'Main Wallet',
            pocket_type: 'wallet',
            current_balance: 35000,
            institution_name: 'BDO'
        },
        {
            id: 'p2',
            institution_id: 'i2',
            name: 'GCash Pocket',
            pocket_type: 'everyday',
            current_balance: 15000,
            institution_name: 'GCash'
        }
    ];

    const mockLoans = [
        {
            id: 'l1',
            institution_name: 'BillEase',
            title: 'Laptop Installment',
            total_amount: 25000,
            remaining_balance: 15000,
            monthly_payment: 3000,
            due_date: '2026-10-30',
            status: 'active'
        }
    ];

    const mockLoansSummary = {
        totalLoanBalance: 15000,
        nextDueLoan: mockLoans[0],
        activeCount: 1
    };

    it('builds a comprehensive financial context prompt from SQLite data', () => {
        const context = buildFinancialSystemContext(mockPockets as any, mockLoans as any, mockLoansSummary as any);

        expect(context).toContain('Total Liquid Money: ₱50,000');
        expect(context).toContain('BDO - Main Wallet (Spendable Wallet): ₱35,000');
        expect(context).toContain('GCash - GCash Pocket (Spendable Wallet): ₱15,000');
        expect(context).toContain('Laptop Installment (BillEase): ₱15,000 remaining');
        expect(context).toContain('2026-10-30');
        expect(context).toContain('No active jobs configured');
    });

    it('builds enriched financial context with subscriptions, spending, and amortization schedule', () => {
        const pocketsWithSavings = [
            ...mockPockets,
            {
                id: 'p3',
                institution_id: 'i3',
                name: 'Emergency Fund',
                pocket_type: 'savings',
                current_balance: 100000,
                institution_name: 'SeaBank'
            }
        ];

        const extraContext = {
            subscriptionsSummary: {
                totalMonthly: 1249,
                monthlyTotal: 1249,
                yearlyProjected: 14988,
                activeCount: 2,
                subscriptions: [
                    {
                        id: 's1',
                        serviceName: 'Netflix Premium',
                        amount: 549,
                        frequency: 'monthly',
                        category: 'Entertainment',
                        pocketLabel: 'GCash Pocket',
                        nextBillingDate: '2026-11-10',
                        status: 'active'
                    },
                    {
                        id: 's2',
                        serviceName: 'Spotify Family',
                        amount: 700,
                        frequency: 'monthly',
                        category: 'Music',
                        pocketLabel: 'Main Wallet',
                        nextBillingDate: '2026-11-15',
                        status: 'active'
                    }
                ]
            },
            spendingSummary: {
                monthlyExpense: 32000,
                monthlyIncome: 80000,
                netSavings: 48000,
                topCategories: [
                    { category: 'Food & Dining', total: 12000, count: 18, percentage: 37.5 },
                    { category: 'Utilities', total: 8000, count: 4, percentage: 25.0 }
                ],
                recentTransactions: [
                    {
                        id: 't1',
                        title: 'Grocery Supermarket',
                        amount: 3500,
                        type: 'expense',
                        category: 'Food & Dining',
                        date: '2026-10-28',
                        pocket_id: 'p1'
                    }
                ]
            },
            amortizationSchedules: [
                {
                    loanId: 'l1',
                    title: 'Laptop Installment',
                    activeInstallmentDue: '2026-11-30',
                    residualDue: 1500,
                    settledMonths: 5,
                    totalMonths: 12
                }
            ]
        };

        const context = buildFinancialSystemContext(
            pocketsWithSavings as any,
            mockLoans as any,
            mockLoansSummary as any,
            undefined,
            extraContext as any
        );

        expect(context).toContain('Spendable Cash & Wallets: ₱50,000');
        expect(context).toContain('Reserved Savings & Emergency Funds: ₱100,000');
        expect(context).toContain('SeaBank - Emergency Fund (Savings): ₱100,000');
        expect(context).toContain('Monthly Recurring Subscriptions: ₱1,249/mo across 2 service(s)');
        expect(context).toContain('Netflix Premium: ₱549 (monthly) via GCash Pocket • Next billing: 2026-11-10');
        expect(context).toContain('Current Month Expenses: ₱32,000');
        expect(context).toContain('Current Month Net Savings: ₱48,000');
        expect(context).toContain('Food & Dining: ₱12,000 (37.5%)');
        expect(context).toContain('[2026-10-28] Grocery Supermarket (Food & Dining): -₱3,500');
        expect(context).toContain('5/12 mos settled • Active Due: ₱1,500 on 2026-11-30');
    });

    it('builds financial context including multi-job salary and deductions', () => {
        const mockIncomeSummary = {
            activeJobsCount: 2,
            archivedJobsCount: 1,
            monthlyGross: 120000,
            monthlyDeductions: 25000,
            monthlyNetTakeHome: 95000,
            deductionBreakdown: {
                tax: 15000,
                statutory: 6000,
                workplace: 4000
            },
            nextPayday: {
                jobId: 'job-1',
                companyName: 'Tech Innovations Inc',
                jobTitle: 'Senior Software Engineer',
                payDate: '2026-11-15',
                daysRemaining: 15,
                netAmount: 47500
            }
        };

        const context = buildFinancialSystemContext(mockPockets as any, mockLoans as any, mockLoansSummary as any, mockIncomeSummary as any);

        expect(context).toContain('Monthly Gross Earnings: ₱120,000 across 2 active job(s)');
        expect(context).toContain('Total Monthly Payroll Deductions: -₱25,000 (Taxes: ₱15,000, Statutory: ₱6,000)');
        expect(context).toContain('Net Expected Monthly Take-Home: ₱95,000');
        expect(context).toContain('Next Upcoming Payday: ₱47,500 from Tech Innovations Inc on 2026-11-15');
    });

    describe('inferStatusFromText', () => {
        it('infers unaffordable status from text', () => {
            expect(inferStatusFromText('No, you cannot afford this purchase right now.')).toBe('unaffordable');
            expect(inferStatusFromText('You are short by ₱5,000.')).toBe('unaffordable');
        });

        it('infers tight status when caution or upcoming debt risk is mentioned', () => {
            expect(inferStatusFromText('Caution: Spending this may compromise your loan payment.')).toBe('tight');
            expect(inferStatusFromText('Your budget will be very tight.')).toBe('tight');
        });

        it('infers safe status when purchase is safe', () => {
            expect(inferStatusFromText('Yes! You can comfortably afford this.')).toBe('safe');
        });

        it('defaults to info for neutral text', () => {
            expect(inferStatusFromText('Here is your breakdown for this month.')).toBe('info');
        });
    });

    describe('queryGeminiAdvisor', () => {
        const mockDb = {} as any;

        it('parses valid Gemini API response successfully', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: 'Yes! You can afford this ₱5,000 item. You have ₱50,000 available.'
                                    }
                                ]
                            }
                        }
                    ]
                })
            });

            const result = await queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
                fetchFn: mockFetch,
                fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary)
            });

            expect(result.source).toBe('gemini');
            expect(result.status).toBe('safe');
            expect(result.text).toContain('Yes! You can afford this');
        });

        it('injects income summary into Gemini prompt when querying advisor', async () => {
            let capturedSystemInstruction = '';
            const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
                const body = JSON.parse(options.body);
                capturedSystemInstruction = body.systemInstruction.parts[0].text;
                return {
                    ok: true,
                    json: async () => ({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: 'Based on your salary of ₱120,000, you are in great shape!'
                                        }
                                    ]
                                }
                            }
                        ]
                    })
                };
            });

            const mockIncomeSummary = {
                activeJobsCount: 1,
                archivedJobsCount: 0,
                monthlyGross: 120000,
                monthlyDeductions: 25000,
                monthlyNetTakeHome: 95000,
                deductionBreakdown: { tax: 15000, statutory: 6000, workplace: 4000 },
                nextPayday: null
            };

            const result = await queryGeminiAdvisor(mockDb, 'How is my monthly salary looking?', {
                fetchFn: mockFetch,
                fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary),
                fetchIncomeSummary: vi.fn().mockResolvedValue(mockIncomeSummary)
            });

            expect(capturedSystemInstruction).toContain('Monthly Gross Earnings: ₱120,000 across 1 active job(s)');
            expect(result.text).toContain('Based on your salary of ₱120,000');
        });

        it('injects subscriptions and transactions into Gemini prompt when available', async () => {
            let capturedSystemInstruction = '';
            const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
                const body = JSON.parse(options.body);
                capturedSystemInstruction = body.systemInstruction.parts[0].text;
                return {
                    ok: true,
                    json: async () => ({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: 'You have 1 active subscription for Spotify.'
                                        }
                                    ]
                                }
                            }
                        ]
                    })
                };
            });

            const mockSubscriptions = [
                {
                    id: 'sub-1',
                    service_name: 'Spotify Premium',
                    amount: 149,
                    frequency: 'monthly',
                    pocket_id: 'p1',
                    next_billing_date: '2026-11-20',
                    status: 'active'
                }
            ];

            const mockTransactions = [
                {
                    id: 'tx-1',
                    title: 'Jollibee Meal',
                    amount: 250,
                    type: 'expense',
                    category: 'Dining Out',
                    date: '2026-10-31',
                    pocket_id: 'p1'
                }
            ];

            const result = await queryGeminiAdvisor(mockDb, 'What are my subscriptions and expenses?', {
                fetchFn: mockFetch,
                fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary),
                fetchSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
                fetchTransactions: vi.fn().mockResolvedValue(mockTransactions)
            });

            expect(capturedSystemInstruction).toContain('Spotify Premium');
            expect(capturedSystemInstruction).toContain('Jollibee Meal');
            expect(result.text).toContain('Spotify');
        });

        it('retries on transient network error and succeeds on second attempt', async () => {
            let callCount = 0;
            const mockFetch = vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('fetch: failed Fetch request has been cancelled');
                }
                return {
                    ok: true,
                    json: async () => ({
                        candidates: [
                            {
                                content: {
                                    parts: [{ text: 'Recovered after retry! You can afford it.' }]
                                }
                            }
                        ]
                    })
                };
            });

            const result = await queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
                fetchFn: mockFetch,
                maxRetries: 1,
                fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary)
            });

            expect(callCount).toBe(2);
            expect(result.text).toContain('Recovered after retry');
        });

        it('converts cancellation or timeout into human-readable timeout error message', async () => {
            const mockFetch = vi.fn().mockImplementation(async () => {
                throw new Error('fetch: failed Fetch request has been cancelled');
            });

            await expect(
                queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
                    fetchFn: mockFetch,
                    maxRetries: 0,
                    timeoutMs: 20000,
                    fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                    fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                    fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary)
                })
            ).rejects.toThrow('Connection timed out after 20s');
        });

        it('throws error when Gemini API request fails', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(
                queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
                    fetchFn: mockFetch,
                    fetchPockets: vi.fn().mockResolvedValue(mockPockets),
                    fetchLoans: vi.fn().mockResolvedValue(mockLoans),
                    fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary)
                })
            ).rejects.toThrow();
        });
    });

    describe('verifyGeminiConnection', () => {
        it('returns ok: true when lightweight metadata probe succeeds', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200
            });

            const result = await verifyGeminiConnection({
                fetchFn: mockFetch,
                apiKey: 'test-api-key'
            });

            expect(result.ok).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('returns ok: false with error details when server returns non-ok response', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403
            });

            const result = await verifyGeminiConnection({
                fetchFn: mockFetch,
                apiKey: 'test-api-key'
            });

            expect(result.ok).toBe(false);
            expect(result.error).toContain('Server returned status 403');
        });

        it('returns ok: false when connection times out or network is down', async () => {
            const mockFetch = vi.fn().mockImplementation(async () => {
                throw new Error('Network request failed');
            });

            const result = await verifyGeminiConnection({
                fetchFn: mockFetch,
                apiKey: 'test-api-key'
            });

            expect(result.ok).toBe(false);
            expect(result.error).toContain('Network request failed');
        });
    });
});
