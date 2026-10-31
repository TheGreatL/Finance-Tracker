import type { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Share, Platform } from 'react-native';
import { requestFileStoragePermission } from './permissionService';

export interface DatabaseBackup {
    version: number;
    exportedAt: string;
    appName: string;
    schemaVersion: number;
    data: {
        institutions: any[];
        account_pockets: any[];
        transactions: any[];
        loans: any[];
        subscriptions: any[];
        jobs?: any[];
        job_deductions?: any[];
        pay_slips?: any[];
        chat_messages: any[];
        app_notifications?: any[];
    };
    summary: {
        institutionsCount: number;
        pocketsCount: number;
        transactionsCount: number;
        loansCount: number;
        subscriptionsCount: number;
        jobsCount?: number;
        paySlipsCount?: number;
    };
}

export interface ValidationResult {
    valid: boolean;
    backup?: DatabaseBackup;
    error?: string;
}

export interface ImportResult {
    success: boolean;
    restoredCounts: {
        institutions: number;
        pockets: number;
        transactions: number;
        loans: number;
        subscriptions: number;
        jobs?: number;
        paySlips?: number;
        chatMessages: number;
    };
}

/**
 * Gathers all database tables and exports a structured JSON backup file,
 * saving it locally and opening the native Share sheet.
 */
export async function exportDatabaseBackup(db: SQLiteDatabase): Promise<{
    backup: DatabaseBackup;
    filePath: string;
    summary: DatabaseBackup['summary'];
}> {
    const [institutions, account_pockets, transactions, loans, subscriptions, jobs, job_deductions, pay_slips, chat_messages, app_notifications] =
        await Promise.all([
            db.getAllAsync('SELECT * FROM institutions ORDER BY created_at ASC;'),
            db.getAllAsync('SELECT * FROM account_pockets ORDER BY created_at ASC;'),
            db.getAllAsync('SELECT * FROM transactions ORDER BY date ASC, created_at ASC;'),
            db.getAllAsync('SELECT * FROM loans ORDER BY created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM subscriptions ORDER BY created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM jobs ORDER BY created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM job_deductions ORDER BY created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM pay_slips ORDER BY pay_date ASC, created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM chat_messages ORDER BY created_at ASC;').catch(() => []),
            db.getAllAsync('SELECT * FROM app_notifications ORDER BY created_at ASC;').catch(() => [])
        ]);

    const summary = {
        institutionsCount: institutions.length,
        pocketsCount: account_pockets.length,
        transactionsCount: transactions.length,
        loansCount: loans.length,
        subscriptionsCount: subscriptions.length,
        jobsCount: jobs.length,
        paySlipsCount: pay_slips.length
    };

    const backup: DatabaseBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'Finance Tracker',
        schemaVersion: 2,
        data: {
            institutions,
            account_pockets,
            transactions,
            loans,
            subscriptions,
            jobs,
            job_deductions,
            pay_slips,
            chat_messages,
            app_notifications
        },
        summary
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `finance_tracker_backup_${timestamp}.json`;
    const baseDir = FileSystem.documentDirectory || '';
    const filePath = `${baseDir}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, jsonContent);

    try {
        await Share.share({
            title: 'Finance Tracker Database Backup',
            message: Platform.OS === 'android' ? jsonContent : undefined,
            url: filePath
        });
    } catch (shareErr) {
        console.warn('Could not open system share dialog:', shareErr);
    }

    return { backup, filePath, summary };
}

/**
 * Validates whether a given string is a valid Finance Tracker backup JSON.
 */
export function validateDatabaseBackup(jsonString: string): ValidationResult {
    try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') {
            return { valid: false, error: 'File content is not a valid JSON object.' };
        }

        if (!parsed.version || !parsed.data || typeof parsed.data !== 'object') {
            return { valid: false, error: 'Missing database tables in backup payload.' };
        }

        const { institutions, account_pockets, transactions } = parsed.data;
        if (!Array.isArray(institutions) || !Array.isArray(account_pockets) || !Array.isArray(transactions)) {
            return { valid: false, error: 'Backup does not contain valid account or transaction lists.' };
        }

        const summary = parsed.summary || {
            institutionsCount: institutions.length,
            pocketsCount: account_pockets.length,
            transactionsCount: transactions.length,
            loansCount: Array.isArray(parsed.data.loans) ? parsed.data.loans.length : 0,
            subscriptionsCount: Array.isArray(parsed.data.subscriptions) ? parsed.data.subscriptions.length : 0
        };

        return {
            valid: true,
            backup: {
                version: parsed.version,
                exportedAt: parsed.exportedAt || new Date().toISOString(),
                appName: parsed.appName || 'Finance Tracker',
                schemaVersion: parsed.schemaVersion || 2,
                data: parsed.data,
                summary
            }
        };
    } catch (err: any) {
        return { valid: false, error: `Invalid JSON syntax: ${err?.message || 'Parse error'}` };
    }
}

/**
 * Restores a full backup into the SQLite database inside a safe transaction.
 */
export async function importDatabaseBackup(db: SQLiteDatabase, backup: DatabaseBackup): Promise<ImportResult> {
    const {
        institutions,
        account_pockets,
        transactions,
        loans = [],
        subscriptions = [],
        jobs = [],
        job_deductions = [],
        pay_slips = [],
        chat_messages = [],
        app_notifications = []
    } = backup.data;

    await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM pay_slips;
    DELETE FROM job_deductions;
    DELETE FROM jobs;
    DELETE FROM transactions;
    DELETE FROM subscriptions;
    DELETE FROM loans;
    DELETE FROM account_pockets;
    DELETE FROM institutions;
    DELETE FROM chat_messages;
    DELETE FROM app_notifications;
  `);

    // 1. Insert institutions
    for (const item of institutions) {
        await db.runAsync(
            `INSERT INTO institutions (
        id, name, type, code, color, icon, notes, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            item.id,
            item.name,
            item.type,
            item.code,
            item.color,
            item.icon,
            item.notes || '',
            item.is_archived ?? 0,
            item.created_at,
            item.updated_at
        );
    }

    // 2. Insert account_pockets
    for (const p of account_pockets) {
        await db.runAsync(
            `INSERT INTO account_pockets (
        id, institution_id, name, pocket_type, currency, starting_balance,
        current_balance, interest_rate, savings_details, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            p.id,
            p.institution_id,
            p.name,
            p.pocket_type,
            p.currency || 'PHP',
            p.starting_balance ?? 0,
            p.current_balance ?? 0,
            p.interest_rate ?? null,
            p.savings_details || '',
            p.is_archived ?? 0,
            p.created_at,
            p.updated_at
        );
    }

    // 3. Insert transactions
    for (const t of transactions) {
        await db.runAsync(
            `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            t.id,
            t.title,
            t.pocket_id,
            t.to_pocket_id ?? null,
            t.type,
            t.amount,
            t.category,
            t.date,
            t.notes || '',
            t.created_at,
            t.updated_at
        );
    }

    // 4. Insert loans
    for (const l of loans) {
        await db.runAsync(
            `INSERT INTO loans (
        id, institution_id, title, total_amount, remaining_balance, monthly_payment,
        due_date, interest_rate, attachment_path, attachment_name, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            l.id,
            l.institution_id,
            l.title,
            l.total_amount,
            l.remaining_balance,
            l.monthly_payment,
            l.due_date,
            l.interest_rate ?? null,
            l.attachment_path || '',
            l.attachment_name || '',
            l.status || 'active',
            l.notes || '',
            l.created_at,
            l.updated_at
        );
    }

    // 5. Insert subscriptions
    for (const s of subscriptions) {
        await db.runAsync(
            `INSERT INTO subscriptions (
        id, service_name, service_code, pocket_id, amount, frequency,
        start_date, next_billing_date, category, status, reminder_days_before,
        notification_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            s.id,
            s.service_name,
            s.service_code || 'custom',
            s.pocket_id,
            s.amount,
            s.frequency,
            s.start_date,
            s.next_billing_date,
            s.category,
            s.status || 'active',
            s.reminder_days_before ?? 1,
            s.notification_id || '',
            s.notes || '',
            s.created_at,
            s.updated_at
        );
    }

    // 6. Insert jobs
    for (const j of jobs) {
        await db.runAsync(
            `INSERT INTO jobs (
        id, title, company_name, employment_type, pay_schedule,
        pay_day_1, pay_day_2, gross_salary, salary_period,
        target_pocket_id, status, color, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            j.id,
            j.title,
            j.company_name,
            j.employment_type,
            j.pay_schedule,
            j.pay_day_1,
            j.pay_day_2 ?? null,
            j.gross_salary,
            j.salary_period || 'per_paycheck',
            j.target_pocket_id,
            j.status || 'active',
            j.color || '#4F46E5',
            j.notes || '',
            j.created_at,
            j.updated_at
        );
    }

    // 7. Insert job_deductions
    for (const d of job_deductions) {
        await db.runAsync(
            `INSERT INTO job_deductions (
        id, job_id, name, category, amount, is_percentage, percentage_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            d.id,
            d.job_id,
            d.name,
            d.category,
            d.amount,
            d.is_percentage ?? 0,
            d.percentage_rate ?? null,
            d.created_at,
            d.updated_at
        );
    }

    // 8. Insert pay_slips
    for (const ps of pay_slips) {
        await db.runAsync(
            `INSERT INTO pay_slips (
        id, job_id, pocket_id, transaction_id, pay_date, gross_amount,
        total_deductions, net_amount, deductions_snapshot, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            ps.id,
            ps.job_id,
            ps.pocket_id,
            ps.transaction_id ?? null,
            ps.pay_date,
            ps.gross_amount,
            ps.total_deductions,
            ps.net_amount,
            ps.deductions_snapshot || '[]',
            ps.status || 'paid',
            ps.notes || '',
            ps.created_at,
            ps.updated_at
        );
    }

    // 6. Insert chat messages
    for (const m of chat_messages) {
        await db.runAsync(
            `INSERT INTO chat_messages (
        id, sender, text, status, source, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            m.id,
            m.sender,
            m.text,
            m.status || 'info',
            m.source || 'offline',
            m.timestamp,
            m.created_at
        );
    }

    // 7. Insert app notifications
    for (const n of app_notifications) {
        await db.runAsync(
            `INSERT INTO app_notifications (
        id, type, title, body, data, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            n.id,
            n.type,
            n.title,
            n.body,
            n.data || '',
            n.is_read ?? 0,
            n.created_at
        );
    }

    await db.execAsync(`PRAGMA foreign_keys = ON;`);

    return {
        success: true,
        restoredCounts: {
            institutions: institutions.length,
            pockets: account_pockets.length,
            transactions: transactions.length,
            loans: loans.length,
            subscriptions: subscriptions.length,
            jobs: jobs.length,
            paySlips: pay_slips.length,
            chatMessages: chat_messages.length
        }
    };
}

/**
 * Prompts the user to pick a backup JSON file from the filesystem and validates it.
 * Explicitly verifies and requests storage/file access permission first.
 */
export async function pickAndValidateBackupFile(): Promise<DatabaseBackup | null> {
    const hasPermission = await requestFileStoragePermission();
    if (!hasPermission) {
        throw new Error('File access permission was denied. Please allow file/storage access in device settings to import your backup.');
    }

    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
    }

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri);
    const validation = validateDatabaseBackup(content);

    if (!validation.valid || !validation.backup) {
        throw new Error(validation.error || 'Failed to parse backup file');
    }

    return validation.backup;
}
