export type InstitutionType = 'bank' | 'ewallet' | 'cash' | 'other';
export type PocketType = 'wallet' | 'savings';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Institution {
    id: string;
    name: string;
    type: InstitutionType;
    code: string;
    color: string;
    icon: string;
    notes?: string;
    is_archived?: number;
    created_at: string;
    updated_at: string;
    total_balance?: number;
    pocket_count?: number;
}

export interface AccountPocket {
    id: string;
    institution_id: string;
    name: string;
    pocket_type: PocketType;
    currency: string;
    starting_balance: number;
    current_balance: number;
    interest_rate?: number | null;
    savings_details?: string;
    is_archived?: number;
    created_at: string;
    updated_at: string;
}

export interface TransactionRecord {
    id: string;
    title: string;
    pocket_id: string;
    to_pocket_id?: string | null;
    type: TransactionType;
    amount: number;
    category: string;
    date: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields for display
    pocket_name?: string;
    institution_name?: string;
    institution_color?: string;
    institution_code?: string;
    to_pocket_name?: string;
    to_institution_name?: string;
}

export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface LoanRecord {
    id: string;
    institution_id: string;
    title: string;
    total_amount: number;
    remaining_balance: number;
    monthly_payment: number;
    due_date: string;
    interest_rate?: number | null;
    attachment_path?: string;
    attachment_name?: string;
    status: LoanStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    institution_name?: string;
    institution_code?: string;
    institution_color?: string;
}

export interface CreateLoanInput {
    institutionId: string;
    title: string;
    totalAmount: number;
    remainingBalance?: number;
    monthlyPayment: number;
    dueDate: string;
    interestRate?: number | null;
    attachmentPath?: string;
    attachmentName?: string;
    notes?: string;
}

export interface RecordLoanPaymentInput {
    loanId: string;
    pocketId: string;
    amount: number;
    date: string;
    notes?: string;
}

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface SubscriptionRecord {
    id: string;
    service_name: string;
    service_code: string;
    pocket_id: string;
    amount: number;
    frequency: SubscriptionFrequency;
    start_date: string;
    next_billing_date: string;
    category: string;
    status: SubscriptionStatus;
    reminder_days_before: number;
    notification_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields from account_pockets & institutions
    pocket_name?: string;
    institution_name?: string;
    institution_code?: string;
    institution_color?: string;
}

export interface CreateSubscriptionInput {
    serviceName: string;
    serviceCode?: string;
    pocketId: string;
    amount: number;
    frequency: SubscriptionFrequency;
    startDate: string;
    nextBillingDate: string;
    category: string;
    reminderDaysBefore?: number;
    notes?: string;
}

export interface UpdateSubscriptionInput {
    serviceName?: string;
    serviceCode?: string;
    pocketId?: string;
    amount?: number;
    frequency?: SubscriptionFrequency;
    startDate?: string;
    nextBillingDate?: string;
    category?: string;
    reminderDaysBefore?: number;
    notes?: string;
}

// ==========================================
// Multi-Job Salary & Deductions Types
// ==========================================

export type EmploymentType = 'full_time' | 'part_time' | 'freelance' | 'contract' | 'other';
export type PaySchedule = 'monthly' | 'semi_monthly' | 'biweekly' | 'weekly' | 'one_time';
export type JobStatus = 'active' | 'archived';
export type DeductionCategory = 'tax' | 'statutory' | 'workplace' | 'other';
export type DeductionCutoff = 'both' | 'first_cutoff' | 'second_cutoff';
export type PaySlipStatus = 'paid' | 'pending' | 'skipped';

export interface JobRecord {
    id: string;
    title: string;
    company_name: string;
    employment_type: EmploymentType;
    pay_schedule: PaySchedule;
    pay_day_1: number;
    pay_day_2?: number | null;
    payout_date?: string | null;
    gross_salary: number;
    salary_period: 'monthly' | 'per_paycheck';
    target_pocket_id: string;
    status: JobStatus;
    color?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields for display
    pocket_name?: string;
    institution_name?: string;
    institution_color?: string;
    institution_code?: string;
    deductions_count?: number;
    total_deductions?: number;
    net_take_home?: number;
    monthly_gross?: number;
    monthly_net?: number;
    monthly_deductions?: number;
}

export interface JobDeductionRecord {
    id: string;
    job_id: string;
    name: string;
    category: DeductionCategory;
    amount: number;
    is_percentage?: number; // 0 or 1 in SQLite
    percentage_rate?: number | null;
    pay_cutoff?: DeductionCutoff;
    created_at: string;
    updated_at: string;
}

export interface DeductionSnapshotItem {
    name: string;
    category: DeductionCategory;
    amount: number;
    is_percentage?: boolean;
    percentage_rate?: number | null;
    pay_cutoff?: DeductionCutoff;
}

export interface PaySlipRecord {
    id: string;
    job_id: string;
    pocket_id: string;
    transaction_id?: string | null;
    pay_date: string;
    gross_amount: number;
    total_deductions: number;
    net_amount: number;
    deductions_snapshot: string; // JSON stringified DeductionSnapshotItem[]
    status: PaySlipStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields for display
    job_title?: string;
    company_name?: string;
    pocket_name?: string;
    institution_name?: string;
    institution_color?: string;
}

export interface CreateDeductionInput {
    name: string;
    category: DeductionCategory;
    amount: number;
    isPercentage?: boolean;
    percentageRate?: number | null;
    payCutoff?: DeductionCutoff;
}

export interface CreateJobInput {
    title: string;
    companyName: string;
    employmentType: EmploymentType;
    paySchedule: PaySchedule;
    payDay1: number;
    payDay2?: number | null;
    payoutDate?: string | null;
    grossSalary: number;
    salaryPeriod?: 'monthly' | 'per_paycheck';
    targetPocketId: string;
    color?: string;
    notes?: string;
}

export interface UpdateJobInput {
    title?: string;
    companyName?: string;
    employmentType?: EmploymentType;
    paySchedule?: PaySchedule;
    payDay1?: number;
    payDay2?: number | null;
    payoutDate?: string | null;
    grossSalary?: number;
    salaryPeriod?: 'monthly' | 'per_paycheck';
    targetPocketId?: string;
    status?: JobStatus;
    color?: string;
    notes?: string;
}
