import { describe, it, expect, vi } from 'vitest';
import { SCHEMA_SQL } from '../src/database/schema';

describe('salary database schema & migrations', () => {
    it('SCHEMA_SQL defines jobs table with appropriate columns and constraints', () => {
        expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS jobs');
        expect(SCHEMA_SQL).toContain(
            "employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'freelance', 'contract', 'other'))"
        );
        expect(SCHEMA_SQL).toContain(
            "pay_schedule TEXT NOT NULL CHECK(pay_schedule IN ('monthly', 'semi_monthly', 'biweekly', 'weekly', 'one_time'))"
        );
        expect(SCHEMA_SQL).toContain('payout_date TEXT DEFAULT NULL');
        expect(SCHEMA_SQL).toContain("status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived'))");
        expect(SCHEMA_SQL).toContain('FOREIGN KEY (target_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT');
        expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)');
    });

    it('SCHEMA_SQL defines job_deductions table with cascade delete', () => {
        expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS job_deductions');
        expect(SCHEMA_SQL).toContain("category TEXT NOT NULL CHECK(category IN ('tax', 'statutory', 'workplace', 'other'))");
        expect(SCHEMA_SQL).toContain("pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff'))");
        expect(SCHEMA_SQL).toContain("pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff'))");
        expect(SCHEMA_SQL).toContain('FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE');
        expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_job_deductions_job ON job_deductions(job_id)');
    });

    it('SCHEMA_SQL defines pay_slips table with uniqueness on (job_id, pay_date)', () => {
        expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS pay_slips');
        expect(SCHEMA_SQL).toContain('UNIQUE(job_id, pay_date)');
        expect(SCHEMA_SQL).toContain('FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE');
        expect(SCHEMA_SQL).toContain('FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT');
        expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_pay_slips_job ON pay_slips(job_id)');
        expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_pay_slips_pay_date ON pay_slips(pay_date DESC)');
    });
});
