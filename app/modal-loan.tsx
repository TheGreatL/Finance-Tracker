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
import { X, HeartHandshake } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createLoan } from '../src/services/loanService';
import { LoanType } from '../src/types/database';

export default function ModalLoanScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, accounts, refreshAll } = useFinance();

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

  const handleSubmit = async () => {
    if (!title.trim() || !lender.trim()) {
      Alert.alert('Required', 'Please enter a loan title and lender/borrower name.');
      return;
    }

    const principalNum = parseFloat(principal);
    if (isNaN(principalNum) || principalNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid principal loan amount.');
      return;
    }

    const installmentNum = parseFloat(installment) || 0;
    const rateNum = parseFloat(interestRate) || 0;

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

        <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
          <View className="gap-1">
            <Text size="xs" muted>
              Loan Description / Item:
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Car Loan, Friend Loan, Appliance 0%"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              {type === 'payable' ? 'Lender / Institution:' : 'Borrower Name:'}
            </Text>
            <Input
              value={lender}
              onChangeText={setLender}
              placeholder="e.g. BPI, John Doe, Toyota Financial"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Principal Amount ({currency}):
            </Text>
            <Input
              value={principal}
              onChangeText={setPrincipal}
              keyboardType="decimal-pad"
              placeholder="50000.00"
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text size="xs" muted>
                Monthly Installment:
              </Text>
              <Input
                value={installment}
                onChangeText={setInstallment}
                keyboardType="decimal-pad"
                placeholder="2500.00"
              />
            </View>

            <View className="flex-1 gap-1">
              <Text size="xs" muted>
                Interest Rate (%/yr):
              </Text>
              <Input
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Final Due Date (YYYY-MM-DD):
            </Text>
            <Input
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="2027-12-31"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Notes:
            </Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Contract number, bank notes..."
            />
          </View>
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
