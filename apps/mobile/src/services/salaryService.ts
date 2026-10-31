import type { SQLiteDatabase } from 'expo-sqlite';
import type {
    JobRecord,
    JobDeductionRecord,
    PaySlipRecord,
    CreateJobInput,
    UpdateJobInput,
    CreateDeductionInput,
    PaySchedule,
    JobStatus,
    DeductionCategory
} from '../types/database';

export interface CalculatedDeductionItem {
    id?: string;
    name: string;
    category: DeductionCategory;
    amount: number;
    isPercentage?: boolean;
    percentageRate?: number | null;
}

export interface SalaryBreakdownResult {
    grossSalary: number;
    totalDeductions: number;
    netTakeHome: number;
    itemized: CalculatedDeductionItem[];
}

export interface CategorizedDeductions {
    tax: number;
    statutory: number;
    workplace: number;
    other: number;
    total: number;
}

export interface IncomeSummary {
    activeJobsCount: number;
    archivedJobsCount: number;
    monthlyGross: number;
    monthlyDeductions: number;
    monthlyNetTakeHome: number;
    deductionBreakdown: CategorizedDeductions;
    nextPayday?: {
        jobId: string;
        jobTitle: string;
        companyName: string;
        payDate: string;
        netAmount: number;
        pocketName: string;
        institutionColor?: string;
        daysRemaining: number;
    };
}

/**
 * Calculates net take-home pay by evaluating fixed and percentage-based deductions.
 */
export function calculateNetTakeHome(
    grossSalary: number,
    deductions: Array<{
        name: string;
        category: DeductionCategory;
        amount: number;
        isPercentage?: boolean;
        percentageRate?: number | null;
    }>
): SalaryBreakdownResult {
    const safeGross = Math.max(0, grossSalary || 0);
    let totalDeductions = 0;

    const itemized: CalculatedDeductionItem[] = deductions.map((d) => {
        const calculatedAmount =
            d.isPercentage && d.percentageRate && d.percentageRate > 0
                ? Math.round(((safeGross * d.percentageRate) / 100) * 100) / 100
                : Math.max(0, d.amount || 0);
        totalDeductions += calculatedAmount;
        return {
            name: d.name,
            category: d.category,
            amount: calculatedAmount,
            isPercentage: Boolean(d.isPercentage),
            percentageRate: d.percentageRate ?? null
        };
    });

    totalDeductions = Math.round(totalDeductions * 100) / 100;
    const netTakeHome = Math.max(0, Math.round((safeGross - totalDeductions) * 100) / 100);

    return {
        grossSalary: safeGross,
        totalDeductions,
        netTakeHome,
        itemized
    };
}

/**
 * Normalizes salary amounts into expected monthly earnings based on pay frequency.
 */
export function normalizeMonthlySalary(amount: number, schedule: PaySchedule): number {
    const safeAmount = Math.max(0, amount || 0);
    switch (schedule) {
        case 'monthly':
            return safeAmount;
        case 'semi_monthly':
            return safeAmount * 2;
        case 'biweekly':
            return Math.round(((safeAmount * 26) / 12) * 100) / 100;
        case 'weekly':
            return Math.round(((safeAmount * 52) / 12) * 100) / 100;
        default:
            return safeAmount;
    }
}

/**
 * Groups deductions into tax, statutory, workplace, and other buckets.
 */
export function categorizeDeductions(
    deductions: Array<{
        category: DeductionCategory;
        amount: number;
        isPercentage?: boolean;
        percentageRate?: number | null;
    }>,
    grossSalary: number = 0
): CategorizedDeductions {
    let tax = 0;
    let statutory = 0;
    let workplace = 0;
    let other = 0;

    for (const d of deductions) {
        let amt = d.amount || 0;
        if (d.isPercentage && d.percentageRate && grossSalary > 0) {
            amt = (grossSalary * d.percentageRate) / 100;
        }
        switch (d.category) {
            case 'tax':
                tax += amt;
                break;
            case 'statutory':
                statutory += amt;
                break;
            case 'workplace':
                workplace += amt;
                break;
            case 'other':
            default:
                other += amt;
                break;
        }
    }

    const total = Math.round((tax + statutory + workplace + other) * 100) / 100;

    return {
        tax: Math.round(tax * 100) / 100,
        statutory: Math.round(statutory * 100) / 100,
        workplace: Math.round(workplace * 100) / 100,
        other: Math.round(other * 100) / 100,
        total
    };
}

/**
 * Clamps target day to the last valid calendar day of the given month.
 * Month index is 0-based (0 = Jan, 1 = Feb, etc.)
 */
export function clampDayToMonth(year: number, monthIndex: number, targetDay: number): number {
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(Math.max(1, targetDay), lastDayOfMonth);
}

/**
 * Calculates the next upcoming payday formatted as YYYY-MM-DD.
 */
export function getNextPayDate(schedule: PaySchedule, payDay1: number, payDay2?: number | null, fromDate: Date = new Date()): string {
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth();
    const fromDay = fromDate.getDate();

    const pad = (n: number) => String(n).padStart(2, '0');

    if (schedule === 'monthly') {
        const dayThisMonth = clampDayToMonth(fromYear, fromMonth, payDay1);
        if (fromDay <= dayThisMonth) {
            return `${fromYear}-${pad(fromMonth + 1)}-${pad(dayThisMonth)}`;
        }
        // Next month
        const nextMonthDate = new Date(fromYear, fromMonth + 1, 1);
        const nextYear = nextMonthDate.getFullYear();
        const nextMonth = nextMonthDate.getMonth();
        const dayNextMonth = clampDayToMonth(nextYear, nextMonth, payDay1);
        return `${nextYear}-${pad(nextMonth + 1)}-${pad(dayNextMonth)}`;
    }

    if (schedule === 'semi_monthly') {
        const d1 = Math.min(payDay1, payDay2 || 30);
        const d2 = Math.max(payDay1, payDay2 || 30);

        const clampedD1 = clampDayToMonth(fromYear, fromMonth, d1);
        const clampedD2 = clampDayToMonth(fromYear, fromMonth, d2);

        if (fromDay <= clampedD1) {
            return `${fromYear}-${pad(fromMonth + 1)}-${pad(clampedD1)}`;
        }
        if (fromDay <= clampedD2) {
            return `${fromYear}-${pad(fromMonth + 1)}-${pad(clampedD2)}`;
        }

        // Roll over to next month's first pay date
        const nextMonthDate = new Date(fromYear, fromMonth + 1, 1);
        const nextYear = nextMonthDate.getFullYear();
        const nextMonth = nextMonthDate.getMonth();
        const nextClampedD1 = clampDayToMonth(nextYear, nextMonth, d1);
        return `${nextYear}-${pad(nextMonth + 1)}-${pad(nextClampedD1)}`;
    }

    if (schedule === 'weekly' || schedule === 'biweekly') {
        const intervalDays = schedule === 'weekly' ? 7 : 14;
        // Anchor to payDay1 in current month
        const clampedAnchor = clampDayToMonth(fromYear, fromMonth, payDay1);
        const anchorDate = new Date(fromYear, fromMonth, clampedAnchor);

        // If anchor is in future or today
        if (fromDay <= clampedAnchor) {
            return `${fromYear}-${pad(fromMonth + 1)}-${pad(clampedAnchor)}`;
        }

        // Advance by interval days until >= fromDate
        const current = new Date(anchorDate);
        const fromMidnight = new Date(fromYear, fromMonth, fromDay);
        while (current < fromMidnight) {
            current.setDate(current.getDate() + intervalDays);
        }
        return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
    }

    return `${fromYear}-${pad(fromMonth + 1)}-${pad(clampDayToMonth(fromYear, fromMonth, payDay1))}`;
}

/**
 * Creates a new job with itemized deductions atomically.
 */
export async function createJob(db: SQLiteDatabase, input: CreateJobInput, deductions: CreateDeductionInput[] = []): Promise<JobRecord> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const salaryPeriod = input.salaryPeriod || 'per_paycheck';
    const color = input.color || '#4F46E5';

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `INSERT INTO jobs (
        id, title, company_name, employment_type, pay_schedule,
        pay_day_1, pay_day_2, gross_salary, salary_period,
        target_pocket_id, status, color, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                id,
                input.title.trim(),
                input.companyName.trim(),
                input.employmentType,
                input.paySchedule,
                input.payDay1,
                input.payDay2 ?? null,
                input.grossSalary,
                salaryPeriod,
                input.targetPocketId,
                'active',
                color,
                input.notes?.trim() || '',
                now,
                now
            ]
        );

        for (const d of deductions) {
            const deductionId = `ded_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await db.runAsync(
                `INSERT INTO job_deductions (
          id, job_id, name, category, amount, is_percentage, percentage_rate, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [deductionId, id, d.name.trim(), d.category, d.amount, d.isPercentage ? 1 : 0, d.percentageRate ?? null, now, now]
            );
        }
    });

    const created = await getJobById(db, id);
    if (!created) {
        throw new Error(`Failed to retrieve newly created job ${id}`);
    }
    return created;
}

/**
 * Retrieves all jobs with joined pocket and institution details.
 */
export async function getAllJobs(db: SQLiteDatabase, statusFilter?: JobStatus): Promise<JobRecord[]> {
    let query = `
    SELECT 
      j.*,
      p.name as pocket_name,
      i.name as institution_name,
      i.color as institution_color,
      i.code as institution_code
    FROM jobs j
    LEFT JOIN account_pockets p ON j.target_pocket_id = p.id
    LEFT JOIN institutions i ON p.institution_id = i.id
  `;
    const params: any[] = [];

    if (statusFilter) {
        query += ` WHERE j.status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY j.created_at DESC;`;

    const rows = await db.getAllAsync<any>(query, params);
    const jobs: JobRecord[] = [];

    for (const row of rows) {
        const deductions = await getDeductionsByJobId(db, row.id);
        const breakdown = calculateNetTakeHome(row.gross_salary, deductions);

        const monthlyGross = normalizeMonthlySalary(row.gross_salary, row.pay_schedule);
        const monthlyDeductions = normalizeMonthlySalary(breakdown.totalDeductions, row.pay_schedule);
        const monthlyNet = normalizeMonthlySalary(breakdown.netTakeHome, row.pay_schedule);

        jobs.push({
            ...row,
            deductions_count: deductions.length,
            total_deductions: breakdown.totalDeductions,
            net_take_home: breakdown.netTakeHome,
            monthly_gross: monthlyGross,
            monthly_deductions: monthlyDeductions,
            monthly_net: monthlyNet
        });
    }

    return jobs;
}

/**
 * Retrieves a single job by ID with joined details.
 */
export async function getJobById(db: SQLiteDatabase, id: string): Promise<JobRecord | null> {
    const query = `
    SELECT 
      j.*,
      p.name as pocket_name,
      i.name as institution_name,
      i.color as institution_color,
      i.code as institution_code
    FROM jobs j
    LEFT JOIN account_pockets p ON j.target_pocket_id = p.id
    LEFT JOIN institutions i ON p.institution_id = i.id
    WHERE j.id = ?
    LIMIT 1;
  `;

    const row = await db.getFirstAsync<any>(query, [id]);
    if (!row) return null;

    const deductions = await getDeductionsByJobId(db, row.id);
    const breakdown = calculateNetTakeHome(row.gross_salary, deductions);

    const monthlyGross = normalizeMonthlySalary(row.gross_salary, row.pay_schedule);
    const monthlyDeductions = normalizeMonthlySalary(breakdown.totalDeductions, row.pay_schedule);
    const monthlyNet = normalizeMonthlySalary(breakdown.netTakeHome, row.pay_schedule);

    return {
        ...row,
        deductions_count: deductions.length,
        total_deductions: breakdown.totalDeductions,
        net_take_home: breakdown.netTakeHome,
        monthly_gross: monthlyGross,
        monthly_deductions: monthlyDeductions,
        monthly_net: monthlyNet
    };
}

/**
 * Retrieves all deductions for a job.
 */
export async function getDeductionsByJobId(db: SQLiteDatabase, jobId: string): Promise<JobDeductionRecord[]> {
    return await db.getAllAsync<JobDeductionRecord>(`SELECT * FROM job_deductions WHERE job_id = ? ORDER BY created_at ASC;`, [jobId]);
}

/**
 * Updates job metadata and optionally replaces its deductions.
 */
export async function updateJob(db: SQLiteDatabase, id: string, input: UpdateJobInput, deductions?: CreateDeductionInput[]): Promise<JobRecord> {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
        const fields: string[] = [];
        const params: any[] = [];

        if (input.title !== undefined) {
            fields.push('title = ?');
            params.push(input.title.trim());
        }
        if (input.companyName !== undefined) {
            fields.push('company_name = ?');
            params.push(input.companyName.trim());
        }
        if (input.employmentType !== undefined) {
            fields.push('employment_type = ?');
            params.push(input.employmentType);
        }
        if (input.paySchedule !== undefined) {
            fields.push('pay_schedule = ?');
            params.push(input.paySchedule);
        }
        if (input.payDay1 !== undefined) {
            fields.push('pay_day_1 = ?');
            params.push(input.payDay1);
        }
        if (input.payDay2 !== undefined) {
            fields.push('pay_day_2 = ?');
            params.push(input.payDay2);
        }
        if (input.grossSalary !== undefined) {
            fields.push('gross_salary = ?');
            params.push(input.grossSalary);
        }
        if (input.salaryPeriod !== undefined) {
            fields.push('salary_period = ?');
            params.push(input.salaryPeriod);
        }
        if (input.targetPocketId !== undefined) {
            fields.push('target_pocket_id = ?');
            params.push(input.targetPocketId);
        }
        if (input.status !== undefined) {
            fields.push('status = ?');
            params.push(input.status);
        }
        if (input.color !== undefined) {
            fields.push('color = ?');
            params.push(input.color);
        }
        if (input.notes !== undefined) {
            fields.push('notes = ?');
            params.push(input.notes?.trim() || '');
        }

        if (fields.length > 0) {
            fields.push('updated_at = ?');
            params.push(now);
            params.push(id);
            await db.runAsync(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?;`, params);
        }

        if (deductions !== undefined) {
            await db.runAsync(`DELETE FROM job_deductions WHERE job_id = ?;`, [id]);
            for (const d of deductions) {
                const deductionId = `ded_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                await db.runAsync(
                    `INSERT INTO job_deductions (
            id, job_id, name, category, amount, is_percentage, percentage_rate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [deductionId, id, d.name.trim(), d.category, d.amount, d.isPercentage ? 1 : 0, d.percentageRate ?? null, now, now]
                );
            }
        }
    });

    const updated = await getJobById(db, id);
    if (!updated) {
        throw new Error(`Failed to retrieve updated job ${id}`);
    }
    return updated;
}

/**
 * Moves job to archived status.
 */
export async function archiveJob(db: SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?;`, ['archived', now, id]);
}

/**
 * Restores an archived job to active status.
 */
export async function unarchiveJob(db: SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?;`, ['active', now, id]);
}

/**
 * Permanently deletes a job, cascading deductions and historical pay slips.
 */
export async function deleteJob(db: SQLiteDatabase, id: string): Promise<void> {
    await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM job_deductions WHERE job_id = ?;`, [id]);
        await db.runAsync(`DELETE FROM pay_slips WHERE job_id = ?;`, [id]);
        await db.runAsync(`DELETE FROM jobs WHERE id = ?;`, [id]);
    });
}

/**
 * Returns overall monthly income summaries across all active jobs.
 */
export async function getIncomeSummary(db: SQLiteDatabase): Promise<IncomeSummary> {
    const activeJobs = await getAllJobs(db, 'active');
    const archivedJobs = await getAllJobs(db, 'archived');

    let monthlyGross = 0;
    let monthlyDeductions = 0;
    let monthlyNetTakeHome = 0;

    const allDeductionsForCategorization: Array<{
        category: DeductionCategory;
        amount: number;
    }> = [];

    const now = new Date();
    let nearestPayday: IncomeSummary['nextPayday'] = undefined;
    let minDaysRemaining = Number.MAX_SAFE_INTEGER;

    for (const job of activeJobs) {
        const deductions = await getDeductionsByJobId(db, job.id);
        const breakdown = calculateNetTakeHome(job.gross_salary, deductions);

        const mGross = normalizeMonthlySalary(job.gross_salary, job.pay_schedule);
        const mDeductions = normalizeMonthlySalary(breakdown.totalDeductions, job.pay_schedule);
        const mNet = normalizeMonthlySalary(breakdown.netTakeHome, job.pay_schedule);

        monthlyGross += mGross;
        monthlyDeductions += mDeductions;
        monthlyNetTakeHome += mNet;

        for (const item of breakdown.itemized) {
            const normalizedItemAmount = normalizeMonthlySalary(item.amount, job.pay_schedule);
            allDeductionsForCategorization.push({
                category: item.category,
                amount: normalizedItemAmount
            });
        }

        const nextPayDate = getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now);
        const diffTime = new Date(nextPayDate).getTime() - new Date(now.toISOString().split('T')[0]).getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        if (daysRemaining < minDaysRemaining) {
            minDaysRemaining = daysRemaining;
            nearestPayday = {
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.company_name,
                payDate: nextPayDate,
                netAmount: breakdown.netTakeHome,
                pocketName: job.pocket_name || 'Account Pocket',
                institutionColor: job.institution_color,
                daysRemaining
            };
        }
    }

    const deductionBreakdown = categorizeDeductions(allDeductionsForCategorization);

    return {
        activeJobsCount: activeJobs.length,
        archivedJobsCount: archivedJobs.length,
        monthlyGross: Math.round(monthlyGross * 100) / 100,
        monthlyDeductions: Math.round(monthlyDeductions * 100) / 100,
        monthlyNetTakeHome: Math.round(monthlyNetTakeHome * 100) / 100,
        deductionBreakdown,
        nextPayday: nearestPayday
    };
}

/**
 * Retrieves pay slips for a specific job.
 */
export async function getPaySlipsByJob(db: SQLiteDatabase, jobId: string): Promise<PaySlipRecord[]> {
    const query = `
    SELECT 
      ps.*,
      j.title as job_title,
      j.company_name,
      p.name as pocket_name,
      i.name as institution_name,
      i.color as institution_color
    FROM pay_slips ps
    LEFT JOIN jobs j ON ps.job_id = j.id
    LEFT JOIN account_pockets p ON ps.pocket_id = p.id
    LEFT JOIN institutions i ON p.institution_id = i.id
    WHERE ps.job_id = ?
    ORDER BY ps.pay_date DESC;
  `;
    return await db.getAllAsync<PaySlipRecord>(query, [jobId]);
}

/**
 * Internal helper to record an income transaction, update target pocket balance,
 * insert an itemized pay slip, and queue an in-app notification.
 */
async function executePaydayDeposit(db: SQLiteDatabase, job: JobRecord, payDate: string, customNotes?: string): Promise<PaySlipRecord> {
    const deductions = await getDeductionsByJobId(db, job.id);
    const breakdown = calculateNetTakeHome(job.gross_salary, deductions);

    // Check target pocket exists
    const pocket = await db.getFirstAsync<{ id: string; current_balance: number; name?: string }>(
        `SELECT id, current_balance, name FROM account_pockets WHERE id = ?;`,
        [job.target_pocket_id]
    );
    if (!pocket) {
        throw new Error(`Target account pocket '${job.target_pocket_id}' not found for job '${job.title}'`);
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paySlipId = `ps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newBalance = Math.round((pocket.current_balance + breakdown.netTakeHome) * 100) / 100;
    const snapshotJson = JSON.stringify(breakdown.itemized);

    await db.withTransactionAsync(async () => {
        // 1. Insert income transaction
        await db.runAsync(
            `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                txId,
                `Salary: ${job.title} (${job.company_name})`,
                job.target_pocket_id,
                null,
                'income',
                breakdown.netTakeHome,
                'Salary',
                payDate,
                customNotes || `Automated salary deposit for ${job.title}`,
                now,
                now
            ]
        );

        // 2. Update target pocket balance
        await db.runAsync(`UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?;`, [newBalance, now, job.target_pocket_id]);

        // 3. Insert pay slip record
        await db.runAsync(
            `INSERT INTO pay_slips (
        id, job_id, pocket_id, transaction_id, pay_date, gross_amount,
        total_deductions, net_amount, deductions_snapshot, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                paySlipId,
                job.id,
                job.target_pocket_id,
                txId,
                payDate,
                job.gross_salary,
                breakdown.totalDeductions,
                breakdown.netTakeHome,
                snapshotJson,
                'paid',
                customNotes || 'Automated deposit',
                now,
                now
            ]
        );

        // 4. Queue in-app notification
        const formattedNet = breakdown.netTakeHome.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const pocketName = pocket.name || 'Account Pocket';
        await db.runAsync(
            `INSERT INTO app_notifications (
        id, type, title, body, data, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                notifId,
                'salary_deposit',
                `💰 Payday Deposited: ${job.company_name}`,
                `Net salary of ₱${formattedNet} for ${job.title} has been deposited to ${pocketName}.`,
                JSON.stringify({ jobId: job.id, payDate, amount: breakdown.netTakeHome, pocketId: job.target_pocket_id }),
                0,
                now
            ]
        );
    });

    const createdSlip = await db.getFirstAsync<PaySlipRecord>(`SELECT * FROM pay_slips WHERE id = ?;`, [paySlipId]);
    if (!createdSlip) {
        throw new Error(`Failed to retrieve newly created pay slip ${paySlipId}`);
    }
    return createdSlip;
}

/**
 * Automated cron/dashboard runner: detects due pay dates for all active jobs
 * on or before referenceDate and records transactions and pay slips if not already processed.
 */
export async function processDuePaydays(
    db: SQLiteDatabase,
    referenceDate: Date = new Date()
): Promise<{ processedCount: number; totalCredited: number }> {
    const activeJobs = await getAllJobs(db, 'active');
    let processedCount = 0;
    let totalCredited = 0;

    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const refDateStr = `${refYear}-${pad(refMonth + 1)}-${pad(referenceDate.getDate())}`;

    for (const job of activeJobs) {
        const candidatePayDates: string[] = [];

        if (job.pay_schedule === 'monthly') {
            const clampedDay = clampDayToMonth(refYear, refMonth, job.pay_day_1);
            candidatePayDates.push(`${refYear}-${pad(refMonth + 1)}-${pad(clampedDay)}`);
        } else if (job.pay_schedule === 'semi_monthly') {
            const d1 = Math.min(job.pay_day_1, job.pay_day_2 || 30);
            const d2 = Math.max(job.pay_day_1, job.pay_day_2 || 30);
            const clamped1 = clampDayToMonth(refYear, refMonth, d1);
            const clamped2 = clampDayToMonth(refYear, refMonth, d2);
            candidatePayDates.push(`${refYear}-${pad(refMonth + 1)}-${pad(clamped1)}`);
            candidatePayDates.push(`${refYear}-${pad(refMonth + 1)}-${pad(clamped2)}`);
        } else if (job.pay_schedule === 'weekly' || job.pay_schedule === 'biweekly') {
            const interval = job.pay_schedule === 'weekly' ? 7 : 14;
            const startDay = clampDayToMonth(refYear, refMonth, job.pay_day_1);
            const cur = new Date(refYear, refMonth, startDay);
            while (cur.getDate() > interval) {
                cur.setDate(cur.getDate() - interval);
            }
            while (cur.getMonth() === refMonth) {
                candidatePayDates.push(`${refYear}-${pad(refMonth + 1)}-${pad(cur.getDate())}`);
                cur.setDate(cur.getDate() + interval);
            }
        }

        for (const payDate of candidatePayDates) {
            if (payDate <= refDateStr) {
                const alreadyPaid = await db.getFirstAsync<{ id: string }>(`SELECT id FROM pay_slips WHERE job_id = ? AND pay_date = ?;`, [
                    job.id,
                    payDate
                ]);
                if (!alreadyPaid) {
                    const slip = await executePaydayDeposit(db, job, payDate);
                    processedCount++;
                    totalCredited += slip.net_amount;
                }
            }
        }
    }

    return {
        processedCount,
        totalCredited: Math.round(totalCredited * 100) / 100
    };
}

/**
 * Manually records and deposits a paycheck for a specific job on a specified date.
 */
export async function recordPaydayManual(db: SQLiteDatabase, jobId: string, payDate: string, notes?: string): Promise<PaySlipRecord> {
    const job = await getJobById(db, jobId);
    if (!job) {
        throw new Error(`Job '${jobId}' not found.`);
    }

    const existing = await db.getFirstAsync<PaySlipRecord>(`SELECT * FROM pay_slips WHERE job_id = ? AND pay_date = ?;`, [jobId, payDate]);
    if (existing) {
        throw new Error(`A pay slip has already been recorded for ${job.title} on ${payDate}.`);
    }

    return await executePaydayDeposit(db, job, payDate, notes || 'Manual payday recording');
}
