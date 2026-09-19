import React, { useState } from 'react';
import { Pressable, ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  Item,
  PANEL_THEMES,
  Switch,
  Text,
  Button,
  Badge,
  Chip,
  Dialog,
  useThemeMode,
  useToast,
} from 'panelui-native';
import {
  Download,
  Upload,
  FileArchive,
  Database,
  Coins,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';
import {
  exportBackupZip,
  pickAndInspectBackupZip,
  commitBackupData,
  BackupInspectionSummary,
} from '../../src/services/backupService';
import { getDatabase } from '../../src/database/db';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { family, mode, setFamily, toggleMode } = useThemeMode();
  const { currency, setCurrency, refreshAll } = useFinance();
  const { toast } = useToast();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [inspectionSummary, setInspectionSummary] = useState<BackupInspectionSummary | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const currencies = [
    { symbol: '₱', code: 'PHP', name: 'Philippine Peso' },
    { symbol: '$', code: 'USD', name: 'US Dollar' },
    { symbol: '€', code: 'EUR', name: 'Euro' },
    { symbol: '£', code: 'GBP', name: 'British Pound' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
    { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBackupZip();
      toast.show({
        variant: 'success',
        label: 'Backup Exported',
        description: 'Complete ZIP backup created with 8 CSV ledger files.',
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export backup ZIP');
    } finally {
      setExporting(false);
    }
  };

  const handlePickImport = async () => {
    setImporting(true);
    try {
      const summary = await pickAndInspectBackupZip();
      if (!summary) return;

      if (!summary.isValid) {
        Alert.alert('Invalid Backup Archive', summary.error || 'The selected file is not a valid Finance Tracker backup.');
        return;
      }

      setInspectionSummary(summary);
      setImportModalOpen(true);
    } catch (err: any) {
      Alert.alert('Import Failed', err?.message || 'Could not inspect backup file');
    } finally {
      setImporting(false);
    }
  };

  const handleCommit = async (mode: 'merge' | 'replace') => {
    if (!inspectionSummary?.parsedData) return;
    setCommitting(true);
    try {
      await commitBackupData(inspectionSummary.parsedData, mode);
      await refreshAll();
      setImportModalOpen(false);
      setInspectionSummary(null);
      toast.show({
        variant: 'success',
        label: mode === 'replace' ? 'Data Replaced Successfully' : 'Data Merged Successfully',
        description: 'All records and account balances have been synchronized.',
      });
    } catch (err: any) {
      Alert.alert('Import Commit Failed', err?.message || 'Failed to commit backup data');
    } finally {
      setCommitting(false);
    }
  };

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      const db = await getDatabase();
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
      // Reload defaults
      await refreshAll();
      setResetConfirmOpen(false);
      toast.show({
        variant: 'info',
        label: 'Database Reset',
        description: 'Starter accounts and default categories restored.',
      });
    } catch (err: any) {
      Alert.alert('Reset Failed', err?.message || 'Failed to reset database');
    } finally {
      setResetting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 40,
        paddingHorizontal: 16,
        gap: 24,
      }}
    >
      <View className="gap-1">
        <Text size="3xl" weight="bold">
          Settings & Backup
        </Text>
        <Text muted>Preferences, offline backup archive, and theme controls.</Text>
      </View>

      {/* Currency Selection */}
      <View className="gap-3">
        <Text size="sm" weight="medium" muted className="uppercase tracking-wider">
          Default Currency Symbol
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {currencies.map(c => (
              <Chip
                key={c.code}
                selected={currency === c.symbol}
                onPress={() => setCurrency(c.symbol)}
              >
                {c.symbol} {c.code}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Backup & Restore Hub */}
      <View className="gap-3">
        <Text size="sm" weight="medium" muted className="uppercase tracking-wider">
          Offline Backup & Restore
        </Text>

        <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
          <View className="flex-row items-center gap-2">
            <FileArchive size={20} color="#4F46E5" />
            <Text size="base" weight="bold">
              ZIP-of-CSVs Backup System
            </Text>
          </View>

          <Text size="xs" muted>
            Because SQLite data is stored on-device and removed on app uninstall, export your complete financial history as a versioned ZIP package containing 8 normalized CSV files.
          </Text>

          <View className="flex-row gap-2 pt-1">
            <Button
              className="flex-1"
              loading={exporting}
              onPress={handleExport}
            >
              Export ZIP Backup
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              loading={importing}
              onPress={handlePickImport}
            >
              Import Backup
            </Button>
          </View>
        </Card>
      </View>

      {/* Theme Selection */}
      <View className="gap-3">
        <Text size="sm" weight="medium" muted className="uppercase tracking-wider">
          Theme & Appearance
        </Text>

        <View className="flex-row gap-4">
          {PANEL_THEMES.map(entry => {
            const selected = entry.id === family.id;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={entry.name}
                onPress={() => setFamily(entry.id)}
                className="items-center gap-2"
              >
                <View className={selected ? 'rounded-full border-2 border-ring p-0.5' : 'p-0.5'}>
                  <View
                    className="h-10 w-10 rounded-full border border-border"
                    style={{ backgroundColor: entry.swatch[mode === 'dark' ? 1 : 0] }}
                  />
                </View>
                <Text size="sm" muted={!selected}>
                  {entry.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Item>
            <Item.Content>
              <Item.Title>Dark mode</Item.Title>
              <Item.Description>Currently {mode}</Item.Description>
            </Item.Content>
            <Item.Actions>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleMode}
                accessibilityLabel="Dark mode"
                accessibilityHint={`Currently ${mode}`}
              />
            </Item.Actions>
          </Item>
        </Card>
      </View>

      {/* Danger Zone: Reset Data */}
      <View className="gap-3">
        <Text size="sm" weight="medium" muted className="uppercase tracking-wider text-rose-500">
          Danger Zone
        </Text>
        <Card className="p-4 bg-card border border-border rounded-2xl gap-2">
          <Text size="sm" weight="semibold">
            Reset All Financial Data
          </Text>
          <Text size="xs" muted>
            Wipes all ledger transactions, custom accounts, loans, and goals from local SQLite storage.
          </Text>
          <Button
            variant="destructive"
            size="sm"
            onPress={() => setResetConfirmOpen(true)}
            className="mt-1"
          >
            Reset Database
          </Button>
        </Card>
      </View>

      {/* Import Dry-Run Inspection Dialog */}
      {inspectionSummary && (
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <Dialog.Content className="p-5 gap-4">
            <View className="gap-1 border-b border-border pb-2">
              <Text size="lg" weight="bold">
                Backup Archive Inspection
              </Text>
              <Text size="xs" muted>
                Exported on: {inspectionSummary.manifest?.export_timestamp || 'Unknown'} (v{inspectionSummary.manifest?.version || '1.0'})
              </Text>
            </View>

            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Records Detected in ZIP:
            </Text>

            <View className="gap-1.5 p-3 bg-muted/20 rounded-xl">
              <View className="flex-row justify-between">
                <Text size="xs">Accounts:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.accounts}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Transactions (Ledger):</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.transactions}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Itemized Deductions:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.deductions}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Categories:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.categories}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Recurring Rules:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.recurring_rules}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Savings Goals:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.savings_goals}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Loans & Debts:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.loans}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs">Wishlist Items:</Text>
                <Text size="xs" weight="bold">{inspectionSummary.counts.wishlist}</Text>
              </View>
            </View>

            <Text size="xs" muted>
              Choose how you want to restore this backup:
            </Text>

            <View className="gap-2 pt-1">
              <Button
                loading={committing}
                onPress={() => handleCommit('merge')}
              >
                Merge with Existing Data
              </Button>

              <Button
                variant="destructive"
                loading={committing}
                onPress={() => {
                  Alert.alert(
                    'Replace All Local Data?',
                    'This will erase your current ledger and restore the exact records from this backup archive. Are you sure?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Replace Everything', style: 'destructive', onPress: () => handleCommit('replace') },
                    ]
                  );
                }}
              >
                Replace All Data
              </Button>

              <Button
                variant="ghost"
                onPress={() => setImportModalOpen(false)}
              >
                Cancel
              </Button>
            </View>
          </Dialog.Content>
        </Dialog>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <Dialog.Content className="p-5 gap-3">
          <Text size="lg" weight="bold" className="text-rose-500">
            Confirm Reset Database
          </Text>
          <Text size="sm" muted>
            This action will remove all recorded transactions, accounts, and plans from SQLite. Make sure you have exported a ZIP backup before proceeding.
          </Text>
          <View className="flex-row gap-2 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              loading={resetting}
              onPress={handleResetDatabase}
            >
              Reset Everything
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>
    </ScrollView>
  );
}
