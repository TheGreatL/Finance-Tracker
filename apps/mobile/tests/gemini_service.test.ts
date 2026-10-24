import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildFinancialSystemContext,
  queryGeminiAdvisor,
  inferStatusFromText,
} from '../src/services/geminiService';

describe('geminiService', () => {
  const mockPockets = [
    {
      id: 'p1',
      institution_id: 'i1',
      name: 'Main Wallet',
      pocket_type: 'wallet',
      current_balance: 35000,
      institution_name: 'BDO',
    },
    {
      id: 'p2',
      institution_id: 'i2',
      name: 'GCash Pocket',
      pocket_type: 'everyday',
      current_balance: 15000,
      institution_name: 'GCash',
    },
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
      status: 'active',
    },
  ];

  const mockLoansSummary = {
    totalLoanBalance: 15000,
    nextDueLoan: mockLoans[0],
    activeCount: 1,
  };

  it('builds a comprehensive financial context prompt from SQLite data', () => {
    const context = buildFinancialSystemContext(
      mockPockets as any,
      mockLoans as any,
      mockLoansSummary as any
    );

    expect(context).toContain('Total Available Liquid Money: ₱50,000');
    expect(context).toContain('BDO - Main Wallet: ₱35,000');
    expect(context).toContain('GCash - GCash Pocket: ₱15,000');
    expect(context).toContain('Laptop Installment (BillEase): ₱15,000 remaining');
    expect(context).toContain('2026-10-30');
  });

  describe('inferStatusFromText', () => {
    it('infers unaffordable status from text', () => {
      expect(inferStatusFromText('No, you cannot afford this purchase right now.')).toBe(
        'unaffordable'
      );
      expect(inferStatusFromText('You are short by ₱5,000.')).toBe('unaffordable');
    });

    it('infers tight status when caution or upcoming debt risk is mentioned', () => {
      expect(inferStatusFromText('Caution: Spending this may compromise your loan payment.')).toBe(
        'tight'
      );
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
                    text: 'Yes! You can afford this ₱5,000 item. You have ₱50,000 available.',
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
        fetchFn: mockFetch,
        fetchPockets: vi.fn().mockResolvedValue(mockPockets),
        fetchLoans: vi.fn().mockResolvedValue(mockLoans),
        fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary),
      });

      expect(result.source).toBe('gemini');
      expect(result.status).toBe('safe');
      expect(result.text).toContain('Yes! You can afford this');
    });

    it('throws error when Gemini API request fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        queryGeminiAdvisor(mockDb, 'Can I afford ₱5,000?', {
          fetchFn: mockFetch,
          fetchPockets: vi.fn().mockResolvedValue(mockPockets),
          fetchLoans: vi.fn().mockResolvedValue(mockLoans),
          fetchLoansSummary: vi.fn().mockResolvedValue(mockLoansSummary),
        })
      ).rejects.toThrow();
    });
  });
});
