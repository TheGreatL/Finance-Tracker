import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { getDatabase } from '../database/db';
import { recalculateAllAccountBalances } from './ledgerService';
import {
  Account,
  Category,
  Transaction,
  TransactionDeduction,
  RecurringRule,
  SavingsGoal,
  Loan,
  WishlistItem,
} from '../types/database';

export interface BackupInspectionSummary {
  isValid: boolean;
  error?: string;
  manifest?: {
    version: string;
    app_version: string;
    export_timestamp: string;
  };
  counts: {
    accounts: number;
    categories: number;
    transactions: number;
    deductions: number;
    recurring_rules: number;
    savings_goals: number;
    loans: number;
    wishlist: number;
  };
  parsedData?: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    deductions: TransactionDeduction[];
    recurring_rules: RecurringRule[];
    savings_goals: SavingsGoal[];
    loans: Loan[];
    wishlist: WishlistItem[];
  };
}

/**
 * Export complete financial data as a versioned ZIP containing 8 normalized CSVs.
 */
export async function exportBackupZip(): Promise<string> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const fileDate = now.replace(/[:.]/g, '-');

  // 1. Query all tables
  const accounts = await db.getAllAsync<Account>('SELECT * FROM accounts');
  const categories = await db.getAllAsync<Category>('SELECT * FROM categories');
  const transactions = await db.getAllAsync<Transaction>('SELECT * FROM transactions');
  const deductions = await db.getAllAsync<TransactionDeduction>('SELECT * FROM transaction_deductions');
  const recurringRules = await db.getAllAsync<RecurringRule>('SELECT * FROM recurring_rules');
  const savingsGoals = await db.getAllAsync<SavingsGoal>('SELECT * FROM savings_goals');
  const loans = await db.getAllAsync<Loan>('SELECT * FROM loans');
  const wishlist = await db.getAllAsync<WishlistItem>('SELECT * FROM wishlist_items');

  // 2. Prepare manifest
  const manifestData = [
    {
      version: '1.0.0',
      app_version: '1.0.0',
      export_timestamp: now,
      accounts_count: accounts.length,
      categories_count: categories.length,
      transactions_count: transactions.length,
      deductions_count: deductions.length,
      recurring_rules_count: recurringRules.length,
      savings_goals_count: savingsGoals.length,
      loans_count: loans.length,
      wishlist_count: wishlist.length,
    },
  ];

  // 3. Serialize to CSVs
  const zip = new JSZip();
  zip.file('manifest.csv', Papa.unparse(manifestData));
  zip.file('accounts.csv', Papa.unparse(accounts));
  zip.file('categories.csv', Papa.unparse(categories));
  zip.file('transactions.csv', Papa.unparse(transactions));
  zip.file('deductions.csv', Papa.unparse(deductions));
  zip.file('recurring_rules.csv', Papa.unparse(recurringRules));
  zip.file('savings_goals.csv', Papa.unparse(savingsGoals));
  zip.file('loans.csv', Papa.unparse(loans));
  zip.file('wishlist.csv', Papa.unparse(wishlist));

  // 4. Generate ZIP base64
  const base64Zip = await zip.generateAsync({ type: 'base64' });

  // 5. Save to app cache
  const fileName = `finance_tracker_backup_${fileDate}.zip`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64Zip, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 6. Prompt share sheet if available
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: 'Export Finance Tracker Backup',
      UTI: 'public.zip-archive',
    });
  }

  // Record last backup timestamp
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
    'last_backup_date',
    now,
  ]);

  return fileUri;
}

/**
 * Pick a backup ZIP file using the document picker and inspect its contents before committing.
 */
export async function pickAndInspectBackupZip(): Promise<BackupInspectionSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const fileUri = result.assets[0].uri;
  return await inspectBackupZip(fileUri);
}

/**
 * Unzips and inspects the backup without modifying the database.
 */
export async function inspectBackupZip(fileUri: string): Promise<BackupInspectionSummary> {
  try {
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(base64Data, { base64: true });

    // Validate manifest
    const manifestFile = zip.file('manifest.csv');
    if (!manifestFile) {
      return {
        isValid: false,
        error: 'Invalid backup: manifest.csv is missing from the ZIP archive.',
        counts: { accounts: 0, categories: 0, transactions: 0, deductions: 0, recurring_rules: 0, savings_goals: 0, loans: 0, wishlist: 0 },
      };
    }

    const manifestText = await manifestFile.async('text');
    const manifestParsed = Papa.parse<any>(manifestText, { header: true, skipEmptyLines: true });
    const manifest = manifestParsed.data[0] || {};

    const parseCsvFile = async <T>(filename: string): Promise<T[]> => {
      const file = zip.file(filename);
      if (!file) return [];
      const text = await file.async('text');
      const parsed = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
      return parsed.data;
    };

    const accounts = await parseCsvFile<Account>('accounts.csv');
    const categories = await parseCsvFile<Category>('categories.csv');
    const transactions = await parseCsvFile<Transaction>('transactions.csv');
    const deductions = await parseCsvFile<TransactionDeduction>('deductions.csv');
    const recurringRules = await parseCsvFile<RecurringRule>('recurring_rules.csv');
    const savingsGoals = await parseCsvFile<SavingsGoal>('savings_goals.csv');
    const loans = await parseCsvFile<Loan>('loans.csv');
    const wishlist = await parseCsvFile<WishlistItem>('wishlist.csv');

    return {
      isValid: true,
      manifest: {
        version: manifest.version || '1.0.0',
        app_version: manifest.app_version || '1.0.0',
        export_timestamp: manifest.export_timestamp || '',
      },
      counts: {
        accounts: accounts.length,
        categories: categories.length,
        transactions: transactions.length,
        deductions: deductions.length,
        recurring_rules: recurringRules.length,
        savings_goals: savingsGoals.length,
        loans: loans.length,
        wishlist: wishlist.length,
      },
      parsedData: {
        accounts,
        categories,
        transactions,
        deductions,
        recurring_rules: recurringRules,
        savings_goals: savingsGoals,
        loans,
        wishlist,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to inspect backup file: ${err?.message || String(err)}`,
      counts: { accounts: 0, categories: 0, transactions: 0, deductions: 0, recurring_rules: 0, savings_goals: 0, loans: 0, wishlist: 0 },
    };
  }
}

/**
 * Commits the inspected backup data into SQLite in an atomic transaction.
 * Supports "merge" (upsert) or "replace" (wipes current data).
 */
export async function commitBackupData(
  parsedData: NonNullable<BackupInspectionSummary['parsedData']>,
  mode: 'merge' | 'replace'
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      // Clear all existing data in proper dependency order
      await db.execAsync(`
        DELETE FROM transaction_deductions;
        DELETE FROM transactions;
        DELETE FROM recurring_rules;
        DELETE FROM savings_goals;
        DELETE FROM loans;
        DELETE FROM wishlist_items;
        DELETE FROM accounts;
        DELETE FROM categories;
      `);
    }

    // 1. Accounts
    for (const acc of parsedData.accounts) {
      if (!acc.id || !acc.name) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO accounts (
          id, name, type, currency, opening_balance, current_balance,
          credit_limit, statement_day, due_day, color, icon, is_archived,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acc.id,
          acc.name,
          acc.type,
          acc.currency || 'PHP',
          acc.opening_balance ?? 0,
          acc.current_balance ?? 0,
          acc.credit_limit ?? 0,
          acc.statement_day ?? null,
          acc.due_day ?? null,
          acc.color || '#4F46E5',
          acc.icon || 'wallet',
          acc.is_archived ?? 0,
          acc.created_at || new Date().toISOString(),
          acc.updated_at || new Date().toISOString(),
        ]
      );
    }

    // 2. Categories
    for (const cat of parsedData.categories) {
      if (!cat.id || !cat.name) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name, type, icon, color, is_default, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.id,
          cat.name,
          cat.type,
          cat.icon || 'tag',
          cat.color || '#10B981',
          cat.is_default ?? 0,
          cat.is_archived ?? 0,
          cat.created_at || new Date().toISOString(),
        ]
      );
    }

    // 3. Transactions
    for (const tx of parsedData.transactions) {
      if (!tx.id || !tx.account_id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions (
          id, type, account_id, to_account_id, category_id, amount, date,
          notes, tags, expense_nature, gross_amount, deductions_total,
          is_recurring, recurring_rule_id, linked_goal_id, linked_loan_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id,
          tx.type,
          tx.account_id,
          tx.to_account_id ?? null,
          tx.category_id ?? null,
          tx.amount,
          tx.date,
          tx.notes ?? '',
          tx.tags ?? '',
          tx.expense_nature ?? 'needs',
          tx.gross_amount ?? null,
          tx.deductions_total ?? 0,
          tx.is_recurring ?? 0,
          tx.recurring_rule_id ?? null,
          tx.linked_goal_id ?? null,
          tx.linked_loan_id ?? null,
          tx.created_at || new Date().toISOString(),
          tx.updated_at || new Date().toISOString(),
        ]
      );
    }

    // 4. Deductions
    for (const ded of parsedData.deductions) {
      if (!ded.id || !ded.transaction_id) continue;
      await db.runAsync(
        'INSERT OR REPLACE INTO transaction_deductions (id, transaction_id, name, amount) VALUES (?, ?, ?, ?)',
        [ded.id, ded.transaction_id, ded.name, ded.amount]
      );
    }

    // 5. Recurring Rules
    for (const rule of parsedData.recurring_rules) {
      if (!rule.id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_rules (
          id, type, account_id, to_account_id, category_id, amount,
          frequency, start_date, end_date, next_due_date, auto_create,
          is_active, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rule.id,
          rule.type,
          rule.account_id,
          rule.to_account_id ?? null,
          rule.category_id ?? null,
          rule.amount,
          rule.frequency,
          rule.start_date,
          rule.end_date ?? null,
          rule.next_due_date,
          rule.auto_create ?? 0,
          rule.is_active ?? 1,
          rule.notes ?? '',
          rule.created_at || new Date().toISOString(),
        ]
      );
    }

    // 6. Savings Goals
    for (const goal of parsedData.savings_goals) {
      if (!goal.id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO savings_goals (
          id, name, target_amount, current_amount, target_date,
          account_id, color, icon, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          goal.id,
          goal.name,
          goal.target_amount,
          goal.current_amount ?? 0,
          goal.target_date ?? null,
          goal.account_id ?? null,
          goal.color || '#3B82F6',
          goal.icon || 'flag',
          goal.status || 'active',
          goal.created_at || new Date().toISOString(),
        ]
      );
    }

    // 7. Loans
    for (const loan of parsedData.loans) {
      if (!loan.id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO loans (
          id, title, lender_or_borrower, type, principal_amount,
          interest_rate, installment_amount, payment_frequency,
          start_date, due_date, remaining_balance, account_id,
          status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loan.id,
          loan.title,
          loan.lender_or_borrower,
          loan.type,
          loan.principal_amount,
          loan.interest_rate ?? 0,
          loan.installment_amount ?? 0,
          loan.payment_frequency || 'monthly',
          loan.start_date,
          loan.due_date,
          loan.remaining_balance ?? loan.principal_amount,
          loan.account_id ?? null,
          loan.status || 'active',
          loan.notes ?? '',
          loan.created_at || new Date().toISOString(),
        ]
      );
    }

    // 8. Wishlist
    for (const wish of parsedData.wishlist) {
      if (!wish.id) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO wishlist_items (
          id, title, estimated_cost, priority, target_date, notes, url, category_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wish.id,
          wish.title,
          wish.estimated_cost,
          wish.priority || 'medium',
          wish.target_date ?? null,
          wish.notes ?? '',
          wish.url ?? '',
          wish.category_id ?? null,
          wish.status || 'wishing',
          wish.created_at || new Date().toISOString(),
        ]
      );
    }
  });

  // Recompute all balances after import
  await recalculateAllAccountBalances();
}

/**
 * Import a standard simple transactions CSV (e.g. from bank statement or Excel)
 */
export async function importSimpleTransactionsCsv(
  fileUri: string,
  targetAccountId: string
): Promise<{ importedCount: number; error?: string }> {
  try {
    const text = await FileSystem.readAsStringAsync(fileUri);
    const parsed = Papa.parse<any>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
    const db = await getDatabase();
    let imported = 0;

    for (const row of parsed.data) {
      const rawAmount = row.amount || row.Amount || row.Total || 0;
      const amount = Math.abs(Number(rawAmount));
      if (!amount || isNaN(amount)) continue;

      const dateStr = row.date || row.Date || new Date().toISOString().split('T')[0];
      const notes = row.notes || row.Notes || row.description || row.Description || row.Payee || '';
      const rawType = (row.type || row.Type || (Number(rawAmount) < 0 ? 'expense' : 'income')).toString().toLowerCase();
      const type = rawType.includes('inc') ? 'income' : 'expense';

      const id = `tx-imp-${Date.now()}-${imported}-${Math.random().toString(36).substring(2, 5)}`;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO transactions (id, type, account_id, amount, date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, targetAccountId, amount, String(dateStr).split('T')[0], String(notes), now, now]
      );
      imported++;
    }

    await recalculateAllAccountBalances();
    return { importedCount: imported };
  } catch (err: any) {
    return { importedCount: 0, error: err?.message || String(err) };
  }
}
