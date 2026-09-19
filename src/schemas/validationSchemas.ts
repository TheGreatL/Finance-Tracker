import { z } from 'zod';

/**
 * Utility to clean numeric strings that may include commas (e.g. "10,000.00" -> "10000.00")
 */
export const cleanNumericString = (val: string): string => {
  return val.replace(/,/g, '').trim();
};

/**
 * Reusable schema helper for validating positive monetary amounts entered as text.
 */
export const positiveAmountSchema = (fieldName: string = 'Amount') =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .refine(
      (val) => {
        const cleaned = cleanNumericString(val);
        return cleaned.length > 0 && !isNaN(Number(cleaned)) && !cleaned.toLowerCase().includes('e');
      },
      `${fieldName} must be a valid number (e.g. 5000 or 50,000)`
    )
    .refine(
      (val) => Number(cleanNumericString(val)) > 0,
      `${fieldName} must be greater than 0`
    );

/**
 * Reusable schema helper for validating non-negative monetary amounts (>= 0).
 */
export const nonNegativeAmountSchema = (fieldName: string = 'Amount') =>
  z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const cleaned = cleanNumericString(val);
        return !isNaN(Number(cleaned)) && !cleaned.toLowerCase().includes('e');
      },
      `${fieldName} must be a valid number (e.g. 0 or 1,000)`
    )
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return Number(cleanNumericString(val)) >= 0;
      },
      `${fieldName} cannot be negative`
    );

/**
 * Optional date string validator (YYYY-MM-DD)
 */
export const optionalDateSchema = (fieldName: string = 'Date') =>
  z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^\d{4}-\d{2}-\d{2}$/.test(val);
      },
      `${fieldName} must be formatted as YYYY-MM-DD (e.g. 2026-12-31)`
    );

/**
 * Required date string validator (YYYY-MM-DD)
 */
export const requiredDateSchema = (fieldName: string = 'Date') =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .refine(
      (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
      `${fieldName} must be formatted as YYYY-MM-DD (e.g. 2026-12-31)`
    );

// ==========================================
// 1. Savings Goal Validation Schema
// ==========================================
export const savingsGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Goal title is required (e.g. Emergency Fund)'),
  targetAmount: positiveAmountSchema('Target amount'),
  currentAmount: nonNegativeAmountSchema('Starting saved amount'),
  targetDate: optionalDateSchema('Target completion date'),
});

export type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>;

// ==========================================
// 2. Transaction Validation Schema
// ==========================================
export const transactionFormSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    amount: positiveAmountSchema('Amount'),
    accountId: z.string().trim().min(1, 'Please select an account'),
    toAccountId: z.string().trim().optional(),
    categoryId: z.string().trim().optional(),
    date: requiredDateSchema('Transaction date'),
    notes: z.string().trim().optional(),
    tags: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return (
          !!data.toAccountId &&
          data.toAccountId.trim() !== '' &&
          data.toAccountId !== data.accountId
        );
      }
      return true;
    },
    {
      message: 'Destination account must be selected and different from source account',
      path: ['toAccountId'],
    }
  );

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

// ==========================================
// 3. Account Validation Schema
// ==========================================
export const accountFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Account name is required (e.g. BDO Checking)'),
    type: z.enum(['bank', 'ewallet', 'cash', 'credit_card']),
    openingBalance: z
      .string()
      .trim()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true;
          const cleaned = cleanNumericString(val);
          return !isNaN(Number(cleaned)) && !cleaned.toLowerCase().includes('e');
        },
        'Balance must be a valid number (e.g. 0.00)'
      ),
    creditLimit: z.string().trim().optional(),
    statementDay: z.string().trim().optional(),
    dueDay: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'credit_card') {
        if (!data.creditLimit || data.creditLimit.trim() === '') return true;
        const cleaned = cleanNumericString(data.creditLimit);
        return !isNaN(Number(cleaned)) && Number(cleaned) >= 0;
      }
      return true;
    },
    {
      message: 'Credit limit must be a positive number or 0',
      path: ['creditLimit'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'credit_card' && data.statementDay && data.statementDay.trim() !== '') {
        const day = parseInt(data.statementDay, 10);
        return !isNaN(day) && day >= 1 && day <= 31;
      }
      return true;
    },
    {
      message: 'Statement cutoff day must be between 1 and 31',
      path: ['statementDay'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'credit_card' && data.dueDay && data.dueDay.trim() !== '') {
        const day = parseInt(data.dueDay, 10);
        return !isNaN(day) && day >= 1 && day <= 31;
      }
      return true;
    },
    {
      message: 'Payment due day must be between 1 and 31',
      path: ['dueDay'],
    }
  );

export type AccountFormData = z.infer<typeof accountFormSchema>;

// ==========================================
// 4. Loan Validation Schema
// ==========================================
export const loanFormSchema = z.object({
  title: z.string().trim().min(1, 'Loan description / title is required'),
  lender: z.string().trim().min(1, 'Lender or borrower name is required'),
  principal: positiveAmountSchema('Principal amount'),
  installment: nonNegativeAmountSchema('Monthly installment'),
  interestRate: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const cleaned = cleanNumericString(val);
        return !isNaN(Number(cleaned)) && Number(cleaned) >= 0;
      },
      'Interest rate must be a valid number 0 or higher'
    ),
  startDate: requiredDateSchema('Start date'),
  dueDate: optionalDateSchema('Final due date'),
  notes: z.string().trim().optional(),
});

export type LoanFormData = z.infer<typeof loanFormSchema>;

// ==========================================
// 5. Wishlist Validation Schema
// ==========================================
export const wishlistFormSchema = z.object({
  title: z.string().trim().min(1, 'Item description is required'),
  cost: positiveAmountSchema('Estimated price'),
  targetDate: optionalDateSchema('Target date'),
  url: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^https?:\/\/.+/i.test(val);
      },
      'URL must start with http:// or https://'
    )
    .optional(),
  notes: z.string().trim().optional(),
});

export type WishlistFormData = z.infer<typeof wishlistFormSchema>;

// ==========================================
// 6. Recurring Rule Validation Schema
// ==========================================
export const recurringRuleFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required (e.g. Monthly Salary, Netflix)'),
  type: z.enum(['income', 'expense']),
  amount: positiveAmountSchema('Amount'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'yearly']),
  accountId: z.string().trim().min(1, 'Please select an account'),
  categoryId: z.string().trim().optional(),
  startDate: requiredDateSchema('First occurrence date'),
  payoutDay1: z.number().int().min(1).max(31).optional(),
  payoutDay2: z.number().int().min(1).max(31).optional(),
});

export type RecurringRuleFormData = z.infer<typeof recurringRuleFormSchema>;

/**
 * Helper to validate form data against a Zod schema.
 * Returns { success: true, data } or { success: false, errors: { [fieldName]: string } }
 */
export function validateForm<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T; errors: Record<string, string> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && typeof field === 'string' && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

