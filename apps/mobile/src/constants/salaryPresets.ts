import type { DeductionCategory, EmploymentType, PaySchedule } from '../types/database';

export interface DeductionPresetItem {
    name: string;
    category: DeductionCategory;
    description: string;
    defaultAmount?: number;
    isPercentage?: boolean;
    percentageRate?: number;
}

export const DEDUCTION_PRESETS: DeductionPresetItem[] = [
    {
        name: 'Withholding Tax',
        category: 'tax',
        description: 'BIR personal income tax withheld by employer'
    },
    {
        name: 'SSS',
        category: 'statutory',
        description: 'Social Security System mandatory employee contribution'
    },
    {
        name: 'PhilHealth',
        category: 'statutory',
        description: 'Philippine Health Insurance Corporation contribution'
    },
    {
        name: 'Pag-IBIG',
        category: 'statutory',
        description: 'Home Development Mutual Fund (HDMF) contribution'
    },
    {
        name: 'HMO / Health Insurance',
        category: 'workplace',
        description: 'Health maintenance organization or dependent plan'
    },
    {
        name: 'Retirement / 401(k)',
        category: 'workplace',
        description: 'Company voluntary pension or provident fund'
    },
    {
        name: 'Staff Loan Payment',
        category: 'workplace',
        description: 'Payroll deduction for company loan or salary advance'
    },
    {
        name: 'Life Insurance',
        category: 'workplace',
        description: 'Group life insurance premium'
    },
    {
        name: 'Other Deduction',
        category: 'other',
        description: 'Custom payroll deduction'
    }
];

export const EMPLOYMENT_TYPE_OPTIONS: { id: EmploymentType; label: string }[] = [
    { id: 'full_time', label: 'Full-Time' },
    { id: 'part_time', label: 'Part-Time' },
    { id: 'freelance', label: 'Freelance' },
    { id: 'contract', label: 'Contract' },
    { id: 'other', label: 'Other' }
];

export const PAY_SCHEDULE_OPTIONS: { id: PaySchedule; label: string; description: string }[] = [
    { id: 'semi_monthly', label: 'Semi-Monthly', description: 'Twice a month (e.g. 15th & 30th)' },
    { id: 'monthly', label: 'Monthly', description: 'Once a month (e.g. end of month)' },
    { id: 'biweekly', label: 'Bi-Weekly', description: 'Every 2 weeks (26 pay periods/yr)' },
    { id: 'weekly', label: 'Weekly', description: 'Once every week (52 pay periods/yr)' }
];

export const DEDUCTION_CATEGORY_CONFIG: Record<DeductionCategory, { label: string; color: string; badgeBg: string; badgeText: string }> = {
    tax: {
        label: 'Taxes',
        color: '#F43F5E',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
        badgeText: 'text-rose-700 dark:text-rose-400'
    },
    statutory: {
        label: 'Statutory',
        color: '#F59E0B',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
        badgeText: 'text-amber-700 dark:text-amber-400'
    },
    workplace: {
        label: 'Workplace & Benefits',
        color: '#6366F1',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
        badgeText: 'text-indigo-700 dark:text-indigo-400'
    },
    other: {
        label: 'Other',
        color: '#64748B',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        badgeText: 'text-slate-700 dark:text-slate-300'
    }
};
