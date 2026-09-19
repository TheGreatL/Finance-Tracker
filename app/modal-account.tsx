import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  Chip,
  useToast,
} from 'panelui-native';
import { X } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createAccount } from '../src/services/accountService';
import { AccountType } from '../src/types/database';
import {
  accountFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';

export default function ModalAccountScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, refreshAll } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementDay, setStatementDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async () => {
    const formData = {
      name,
      type,
      openingBalance,
      creditLimit: type === 'credit_card' ? creditLimit : undefined,
      statementDay: type === 'credit_card' ? statementDay : undefined,
      dueDay: type === 'credit_card' ? dueDay : undefined,
    };

    const validation = validateForm(accountFormSchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.show({
        variant: 'destructive',
        label: 'Validation Error',
        description: firstError || 'Please check highlighted fields.',
      });
      return;
    }

    setErrors({});
    const openBal = openingBalance ? parseFloat(cleanNumericString(openingBalance)) || 0 : 0;
    const limit = type === 'credit_card' && creditLimit ? parseFloat(cleanNumericString(creditLimit)) || 0 : 0;
    const stmt = type === 'credit_card' && statementDay ? parseInt(statementDay, 10) : null;
    const due = type === 'credit_card' && dueDay ? parseInt(dueDay, 10) : null;

    setSubmitting(true);
    try {
      const id = `acc-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await createAccount({
        id,
        name: name.trim(),
        type,
        currency: 'PHP',
        opening_balance: openBal,
        current_balance: openBal,
        credit_limit: limit,
        statement_day: stmt,
        due_day: due,
        color: type === 'bank' ? '#3B82F6' : type === 'ewallet' ? '#06B6D4' : type === 'credit_card' ? '#8B5CF6' : '#10B981',
        icon: type === 'bank' ? 'landmark' : type === 'ewallet' ? 'smartphone' : type === 'credit_card' ? 'credit-card' : 'wallet',
        is_archived: 0,
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Account Created',
        description: `${name} has been added to your ledger.`,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingHorizontal: 16,
          gap: 18,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Text size="2xl" weight="bold">
            Add Account
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Account Type Selector */}
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Account Type
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <Chip selected={type === 'bank'} onPress={() => setType('bank')}>
              Bank Account
            </Chip>
            <Chip selected={type === 'ewallet'} onPress={() => setType('ewallet')}>
              eWallet (GCash/Maya)
            </Chip>
            <Chip selected={type === 'cash'} onPress={() => setType('cash')}>
              Physical Cash
            </Chip>
            <Chip selected={type === 'credit_card'} onPress={() => setType('credit_card')}>
              Credit Card
            </Chip>
          </View>
        </View>

        {/* General Details */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label="Account Name"
            isRequired
            value={name}
            onChangeText={(val) => {
              setName(val);
              clearFieldError('name');
            }}
            errorMessage={errors.name}
            placeholder="e.g. BDO Checking, Maya, Visa Gold"
          />

          <Input
            label={`${type === 'credit_card' ? 'Initial Outstanding Balance' : 'Opening Balance'} (${currency})`}
            value={openingBalance}
            onChangeText={(val) => {
              setOpeningBalance(val);
              clearFieldError('openingBalance');
            }}
            errorMessage={errors.openingBalance}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </Card>

        {/* Credit Card Specific Fields */}
        {type === 'credit_card' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
            <Text size="sm" weight="bold">
              Credit Card Specifications
            </Text>

            <Input
              label={`Credit Limit (${currency})`}
              value={creditLimit}
              onChangeText={(val) => {
                setCreditLimit(val);
                clearFieldError('creditLimit');
              }}
              errorMessage={errors.creditLimit}
              keyboardType="decimal-pad"
              placeholder="50000.00"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Cutoff Day (1-31)"
                  value={statementDay}
                  onChangeText={(val) => {
                    setStatementDay(val);
                    clearFieldError('statementDay');
                  }}
                  errorMessage={errors.statementDay}
                  keyboardType="number-pad"
                  placeholder="15"
                />
              </View>

              <View className="flex-1">
                <Input
                  label="Due Day (1-31)"
                  value={dueDay}
                  onChangeText={(val) => {
                    setDueDay(val);
                    clearFieldError('dueDay');
                  }}
                  errorMessage={errors.dueDay}
                  keyboardType="number-pad"
                  placeholder="5"
                />
              </View>
            </View>
          </Card>
        )}

        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Create Account
        </Button>
      </ScrollView>
    </View>
  );
}
