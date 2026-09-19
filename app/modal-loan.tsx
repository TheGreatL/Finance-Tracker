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
import { createLoan } from '../src/services/loanService';
import { LoanType } from '../src/types/database';
import {
  loanFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';

export default function ModalLoanScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, refreshAll } = useFinance();

  const [title, setTitle] = useState('');
  const [lender, setLender] = useState('');
  const [type, setType] = useState<LoanType>('payable');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [installment, setInstallment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
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
      title,
      lender,
      principal,
      installment,
      interestRate,
      startDate,
      dueDate,
      notes,
    };

    const validation = validateForm(loanFormSchema, formData);
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
    const principalNum = parseFloat(cleanNumericString(principal));
    const installmentNum = installment ? parseFloat(cleanNumericString(installment)) || 0 : 0;
    const rateNum = interestRate ? parseFloat(cleanNumericString(interestRate)) || 0 : 0;

    setSubmitting(true);
    try {
      const id = `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await createLoan({
        id,
        title: title.trim(),
        lender_or_borrower: lender.trim(),
        type,
        principal_amount: principalNum,
        interest_rate: rateNum,
        installment_amount: installmentNum,
        payment_frequency: 'monthly',
        start_date: startDate,
        due_date: dueDate.trim() || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        remaining_balance: principalNum,
        status: 'active',
        notes: notes.trim(),
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Loan Added',
        description: `Tracking ${type === 'payable' ? 'debt' : 'receivable'} for "${title}".`,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create loan');
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
        <View className="flex-row items-center justify-between">
          <Text size="2xl" weight="bold">
            Track Loan / Debt
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Loan Type */}
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Obligation Type
          </Text>
          <View className="flex-row gap-2">
            <Chip
              selected={type === 'payable'}
              onPress={() => setType('payable')}
            >
              Payable (Money I Owe)
            </Chip>
            <Chip
              selected={type === 'receivable'}
              onPress={() => setType('receivable')}
            >
              Receivable (Money Owed to Me)
            </Chip>
          </View>
        </View>

        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label="Loan Description / Item"
            isRequired
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              clearFieldError('title');
            }}
            errorMessage={errors.title}
            placeholder="e.g. Car Loan, Friend Loan, Appliance 0%"
          />

          <Input
            label={type === 'payable' ? 'Lender / Institution' : 'Borrower Name'}
            isRequired
            value={lender}
            onChangeText={(val) => {
              setLender(val);
              clearFieldError('lender');
            }}
            errorMessage={errors.lender}
            placeholder="e.g. BPI, John Doe, Toyota Financial"
          />

          <Input
            label={`Principal Amount (${currency})`}
            isRequired
            value={principal}
            onChangeText={(val) => {
              setPrincipal(val);
              clearFieldError('principal');
            }}
            errorMessage={errors.principal}
            keyboardType="decimal-pad"
            placeholder="50000.00"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Monthly Installment"
                value={installment}
                onChangeText={(val) => {
                  setInstallment(val);
                  clearFieldError('installment');
                }}
                errorMessage={errors.installment}
                keyboardType="decimal-pad"
                placeholder="2500.00"
              />
            </View>

            <View className="flex-1">
              <Input
                label="Interest Rate (%/yr)"
                value={interestRate}
                onChangeText={(val) => {
                  setInterestRate(val);
                  clearFieldError('interestRate');
                }}
                errorMessage={errors.interestRate}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <Input
            label="Final Due Date (Optional)"
            description="Format: YYYY-MM-DD (e.g. 2027-12-31)"
            value={dueDate}
            onChangeText={(val) => {
              setDueDate(val);
              clearFieldError('dueDate');
            }}
            errorMessage={errors.dueDate}
            placeholder="2027-12-31"
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Contract number, bank notes..."
          />
        </Card>

        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Save Loan Obligation
        </Button>
      </ScrollView>
    </View>
  );
}
