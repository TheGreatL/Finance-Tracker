import { describe, it, expect, vi } from 'vitest';
import {
  parseAmount,
  detectIntent,
  evaluateChatPrompt,
  type ChatMessageResponse,
} from '../src/services/chatEngine';

describe('chatEngine', () => {
  describe('parseAmount', () => {
    it('parses basic integer and decimal strings', () => {
      expect(parseAmount('5000')).toBe(5000);
      expect(parseAmount('12500.50')).toBe(12500.5);
    });

    it('parses comma-formatted numbers', () => {
      expect(parseAmount('15,000')).toBe(15000);
      expect(parseAmount('1,250,000')).toBe(1250000);
    });

    it('parses currency symbols and prefixes', () => {
      expect(parseAmount('₱5,000')).toBe(5000);
      expect(parseAmount('P12000')).toBe(12000);
      expect(parseAmount('php 3,500')).toBe(3500);
      expect(parseAmount('PHP10000')).toBe(10000);
    });

    it('parses shorthand k and m multipliers', () => {
      expect(parseAmount('15k')).toBe(15000);
      expect(parseAmount('2.5k')).toBe(2500);
      expect(parseAmount('₱1.5k')).toBe(1500);
      expect(parseAmount('2m')).toBe(2000000);
    });

    it('extracts amount embedded inside natural sentences', () => {
      expect(parseAmount('Can I afford this laptop for 25,000?')).toBe(25000);
      expect(parseAmount('how much will i have left if i spend 4.5k?')).toBe(4500);
    });

    it('returns null when no valid number exists', () => {
      expect(parseAmount('hello world')).toBeNull();
      expect(parseAmount('how much do i owe')).toBeNull();
    });
  });

  describe('detectIntent', () => {
    it('detects affordability intent', () => {
      expect(detectIntent('can i afford 5000')).toBe('affordability');
      expect(detectIntent('can i buy this for 15k')).toBe('affordability');
      expect(detectIntent('is 2500 affordable?')).toBe('affordability');
    });

    it('detects projection intent', () => {
      expect(detectIntent('how much money will i have if 3000')).toBe('projection');
      expect(detectIntent('how much will i have left if i buy 4500')).toBe('projection');
      expect(detectIntent('remaining if i spend 2000')).toBe('projection');
    });

    it('detects debt intent', () => {
      expect(detectIntent('how much do i owe')).toBe('debt');
      expect(detectIntent('what are my loans')).toBe('debt');
      expect(detectIntent('active loans')).toBe('debt');
      expect(detectIntent('total debt')).toBe('debt');
    });

    it('detects total balance intent', () => {
      expect(detectIntent('how much money do i have')).toBe('balance');
      expect(detectIntent('total balance')).toBe('balance');
      expect(detectIntent('total cash')).toBe('balance');
    });

    it('detects institution balance intent', () => {
      expect(detectIntent('how much in gcash')).toBe('institution_balance');
      expect(detectIntent('maya balance')).toBe('institution_balance');
      expect(detectIntent('how much money in bdo')).toBe('institution_balance');
    });

    it('falls back to unknown for unhandled prompts', () => {
      expect(detectIntent('what is the weather today?')).toBe('unknown');
    });
  });

  describe('evaluateChatPrompt', () => {
    const mockDb = {} as any;

    // Helper mock data
    const mockPockets = [
      { id: 'p1', institution_id: 'i1', name: 'Main', current_balance: 30000, institution_name: 'BDO', institution_code: 'bdo' },
      { id: 'p2', institution_id: 'i2', name: 'Wallet', current_balance: 20000, institution_name: 'GCash', institution_code: 'gcash' },
    ];

    it('evaluates safe affordability correctly', async () => {
      // Mock db queries
      const mockGetAllActivePockets = vi.fn().mockResolvedValue(mockPockets);
      const mockGetActiveLoans = vi.fn().mockResolvedValue([]);
      const mockGetLoansSummary = vi.fn().mockResolvedValue({ totalLoanBalance: 0, nextDueLoan: null, activeCount: 0 });

      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'can i afford 5000', {
        getAllActivePockets: mockGetAllActivePockets,
        getActiveLoans: mockGetActiveLoans,
        getLoansSummary: mockGetLoansSummary,
      });

      expect(res.status).toBe('safe');
      expect(res.text).toContain('Yes, you can afford this');
      expect(res.text).toContain('₱50,000'); // total available
      expect(res.text).toContain('₱45,000'); // remaining
    });

    it('warns when affordability threatens upcoming loan payments', async () => {
      const mockLoans = [
        {
          id: 'l1',
          title: 'BillEase Phone',
          institution_name: 'BillEase',
          monthly_payment: 15000,
          due_date: '2026-10-28', // due in 4 days
          remaining_balance: 15000,
          status: 'active',
        },
      ];

      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'can i afford 40000', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets), // 50k total
        getActiveLoans: vi.fn().mockResolvedValue(mockLoans),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 15000, nextDueLoan: mockLoans[0], activeCount: 1 }),
        referenceDate: new Date('2026-10-24'),
      });

      expect(res.status).toBe('tight');
      expect(res.text).toContain('Caution');
      expect(res.text).toContain('BillEase');
      expect(res.text).toContain('₱15,000');
    });

    it('rejects when amount exceeds total money', async () => {
      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'can i afford 75000', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets), // 50k total
        getActiveLoans: vi.fn().mockResolvedValue([]),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 0, nextDueLoan: null, activeCount: 0 }),
      });

      expect(res.status).toBe('unaffordable');
      expect(res.text).toContain('No, you cannot afford this right now');
      expect(res.text).toContain('₱25,000'); // shortage
    });

    it('evaluates projection calculation', async () => {
      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'how much will i have if i spend 12000', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets), // 50k total
        getActiveLoans: vi.fn().mockResolvedValue([]),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 0, nextDueLoan: null, activeCount: 0 }),
      });

      expect(res.status).toBe('info');
      expect(res.text).toContain('₱38,000');
    });

    it('evaluates debt summary', async () => {
      const mockLoans = [
        {
          id: 'l1',
          title: 'BillEase Laptop',
          institution_name: 'BillEase',
          monthly_payment: 2500,
          due_date: '2026-10-29',
          remaining_balance: 10000,
          status: 'active',
        },
      ];

      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'how much do i owe', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets),
        getActiveLoans: vi.fn().mockResolvedValue(mockLoans),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 10000, nextDueLoan: mockLoans[0], activeCount: 1 }),
      });

      expect(res.status).toBe('info');
      expect(res.text).toContain('₱10,000');
      expect(res.text).toContain('BillEase Laptop');
    });

    it('evaluates specific institution balance', async () => {
      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'how much money in gcash', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets),
        getActiveLoans: vi.fn().mockResolvedValue([]),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 0, nextDueLoan: null, activeCount: 0 }),
      });

      expect(res.status).toBe('info');
      expect(res.text).toContain('GCash');
      expect(res.text).toContain('₱20,000');
    });

    it('returns friendly suggestions for unknown prompts', async () => {
      const res: ChatMessageResponse = await evaluateChatPrompt(mockDb, 'tell me a joke', {
        getAllActivePockets: vi.fn().mockResolvedValue(mockPockets),
        getActiveLoans: vi.fn().mockResolvedValue([]),
        getLoansSummary: vi.fn().mockResolvedValue({ totalLoanBalance: 0, nextDueLoan: null, activeCount: 0 }),
      });

      expect(res.status).toBe('unknown');
      expect(res.text).toContain('I can help answer questions like');
    });
  });
});
