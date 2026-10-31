import { describe, it, expect, vi, beforeEach } from 'vitest';
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

        expect(context).toContain('Total Available Liquid Money: ₱50,000');
        expect(context).toContain('BDO - Main Wallet: ₱35,000');
        expect(context).toContain('GCash - GCash Pocket: ₱15,000');
        expect(context).toContain('Laptop Installment (BillEase): ₱15,000 remaining');
        expect(context).toContain('2026-10-30');
        expect(context).toContain('No active jobs configured');
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
