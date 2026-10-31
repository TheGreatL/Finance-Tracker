import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Database, Download, Upload, Trash2, ArrowRight } from 'lucide-react-native';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  pickAndValidateBackupFile,
  type DatabaseBackup,
} from '../../services/databaseBackupService';
import { getDatabase } from '../../database/db';
import { resetDatabase } from '../../database/seed';
import { DatabaseResetDialog } from '../dev/DatabaseResetDialog';

interface DatabaseManagementCardProps {
  onDataChanged: () => Promise<void>;
}

export function DatabaseManagementCard({ onDataChanged }: DatabaseManagementCardProps) {
  const [loadingAction, setLoadingAction] = useState<'export' | 'import' | 'reset' | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [pendingRestoreBackup, setPendingRestoreBackup] = useState<DatabaseBackup | null>(null);

  const handleExport = async () => {
    try {
      setLoadingAction('export');
      const db = await getDatabase();
      const { summary } = await exportDatabaseBackup(db);

      Alert.alert(
        'Database Exported',
        `Successfully exported backup file!\n\n` +
          `• Accounts: ${summary.institutionsCount}\n` +
          `• Pockets: ${summary.pocketsCount}\n` +
          `• Transactions: ${summary.transactionsCount}\n` +
          `• Loans: ${summary.loansCount}\n` +
          `• Subscriptions: ${summary.subscriptionsCount}`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export database backup');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePickImport = async () => {
    try {
      setLoadingAction('import');
      const backup = await pickAndValidateBackupFile();
      if (!backup) {
        return; // User canceled picker
      }

      const { summary } = backup;
      Alert.alert(
        'Confirm Database Restore',
        `Restore data from backup created on ${new Date(backup.exportedAt).toLocaleDateString()}?\n\n` +
          `• ${summary.institutionsCount} accounts\n` +
          `• ${summary.pocketsCount} pockets\n` +
          `• ${summary.transactionsCount} transactions\n` +
          `• ${summary.loansCount} loans\n` +
          `• ${summary.subscriptionsCount} subscriptions\n\n` +
          `⚠️ Warning: Restoring will overwrite existing data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoadingAction('import');
                const db = await getDatabase();
                await importDatabaseBackup(db, backup);
                await onDataChanged();
                Alert.alert('Database Restored', 'Your database has been successfully restored from backup.');
              } catch (importErr: any) {
                Alert.alert('Restore Failed', importErr?.message || 'Failed to import backup');
              } finally {
                setLoadingAction(null);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.message || 'Could not read or parse backup file';
      if (msg.toLowerCase().includes('permission')) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to select and restore a database backup file. Please grant file/media access in Settings.'
        );
      } else {
        Alert.alert('Invalid Backup File', msg);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetConfirm = async () => {
    try {
      setLoadingAction('reset');
      const db = await getDatabase();
      await resetDatabase(db);
      await onDataChanged();
      Alert.alert('Reset Complete', 'Database has been wiped to zero balance.');
    } catch (err: any) {
      Alert.alert('Reset Error', err?.message || 'Could not reset database');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <View className="px-5 mt-6 mb-4">
        {/* Section Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-xl bg-stone-200/80 items-center justify-center mr-2">
              <Database size={16} color="#18342B" />
            </View>
            <View>
              <Text className="text-base font-bold text-stone-900">Database & Backup</Text>
              <Text className="text-[11px] text-stone-500">
                Export, restore, or reset local offline database
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Action Buttons */}
        <View className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-xs space-y-2.5">
          {/* 1. Export */}
          <Pressable
            onPress={handleExport}
            disabled={loadingAction !== null}
            accessibilityRole="button"
            accessibilityLabel="Export database backup"
            className="flex-row items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 active:bg-stone-100 mb-2"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-xl bg-emerald-100/80 items-center justify-center mr-3">
                <Download size={18} color="#065F46" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-stone-900">Export Database</Text>
                <Text className="text-[11px] text-stone-500 mt-0.5">
                  Save all accounts, transactions & loans as JSON
                </Text>
              </View>
            </View>
            {loadingAction === 'export' ? (
              <ActivityIndicator size="small" color="#18342B" />
            ) : (
              <View className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 flex-row items-center">
                <Text className="text-[10px] font-bold text-[#18342B] mr-1">Backup</Text>
                <ArrowRight size={11} color="#18342B" />
              </View>
            )}
          </Pressable>

          {/* 2. Import */}
          <Pressable
            onPress={handlePickImport}
            disabled={loadingAction !== null}
            accessibilityRole="button"
            accessibilityLabel="Import database backup"
            className="flex-row items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 active:bg-stone-100 mb-2"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-xl bg-sky-100/80 items-center justify-center mr-3">
                <Upload size={18} color="#0369A1" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-stone-900">Import Database</Text>
                <Text className="text-[11px] text-stone-500 mt-0.5">
                  Restore records from a previously exported backup file
                </Text>
              </View>
            </View>
            {loadingAction === 'import' ? (
              <ActivityIndicator size="small" color="#0369A1" />
            ) : (
              <View className="bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/60 flex-row items-center">
                <Text className="text-[10px] font-bold text-sky-900 mr-1">Restore</Text>
                <ArrowRight size={11} color="#0369A1" />
              </View>
            )}
          </Pressable>

          {/* 3. Reset Database */}
          <Pressable
            onPress={() => setResetDialogOpen(true)}
            disabled={loadingAction !== null}
            accessibilityRole="button"
            accessibilityLabel="Reset database"
            className="flex-row items-center justify-between p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/70 active:bg-rose-100/50"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-xl bg-rose-100 items-center justify-center mr-3">
                <Trash2 size={18} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-rose-900">Reset Database</Text>
                <Text className="text-[11px] text-rose-700/80 mt-0.5">
                  Wipe all data and restart with a clean slate
                </Text>
              </View>
            </View>
            {loadingAction === 'reset' ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <View className="bg-rose-100 px-2.5 py-1 rounded-lg">
                <Text className="text-[10px] font-bold text-rose-800">Wipe Data</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <DatabaseResetDialog
        visible={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirmReset={handleResetConfirm}
      />
    </>
  );
}

