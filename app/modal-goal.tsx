import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  useToast,
} from 'panelui-native';
import { X, Target, Calendar as CalendarIcon } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createSavingsGoal } from '../src/services/goalService';
import {
  savingsGoalSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';
import CalendarPickerModal from '../src/components/CalendarPickerModal';

export default function ModalGoalScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, refreshAll } = useFinance();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
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

  const handleBlurField = (field: 'name' | 'targetAmount' | 'currentAmount' | 'targetDate') => {
    const data = { name, targetAmount, currentAmount, targetDate };
    const validation = validateForm(savingsGoalSchema, data);
    if (!validation.success && validation.errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validation.errors[field] }));
    } else if (errors[field]) {
      clearFieldError(field);
    }
  };

  const handleSubmit = async () => {
    const formData = {
      name,
      targetAmount,
      currentAmount,
      targetDate,
    };

    const validation = validateForm(savingsGoalSchema, formData);
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
    const target = parseFloat(cleanNumericString(targetAmount));
    const current = parseFloat(cleanNumericString(currentAmount)) || 0;

    setSubmitting(true);
    try {
      const id = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await createSavingsGoal({
        id,
        name: name.trim(),
        target_amount: target,
        current_amount: current,
        target_date: targetDate.trim() || null,
        color: '#10B981',
        icon: 'flag',
        status: current >= target ? 'reached' : 'active',
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Goal Created',
        description: `Savings goal "${name}" established.`,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create goal');
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
            New Savings Goal
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label="Goal Title"
            isRequired
            value={name}
            onChangeText={(val) => {
              setName(val);
              clearFieldError('name');
            }}
            onBlur={() => handleBlurField('name')}
            errorMessage={errors.name}
            placeholder="e.g. Emergency Fund, New Laptop, House Downpayment"
          />

          <Input
            label={`Target Amount (${currency})`}
            isRequired
            value={targetAmount}
            onChangeText={(val) => {
              setTargetAmount(val);
              clearFieldError('targetAmount');
            }}
            onBlur={() => handleBlurField('targetAmount')}
            errorMessage={errors.targetAmount}
            keyboardType="decimal-pad"
            placeholder="100000.00"
          />

          <Input
            label={`Starting / Already Saved (${currency})`}
            value={currentAmount}
            onChangeText={(val) => {
              setCurrentAmount(val);
              clearFieldError('currentAmount');
            }}
            onBlur={() => handleBlurField('currentAmount')}
            errorMessage={errors.currentAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Input
            label="Target Completion Date (Optional)"
            description="Format: YYYY-MM-DD (e.g. 2026-12-31)"
            value={targetDate}
            onChangeText={(val) => {
              setTargetDate(val);
              clearFieldError('targetDate');
            }}
            onBlur={() => handleBlurField('targetDate')}
            errorMessage={errors.targetDate}
            placeholder="YYYY-MM-DD"
            endContent={
              <TouchableOpacity
                onPress={() => setCalendarOpen(true)}
                className="p-1 rounded-lg bg-primary/10 active:opacity-75"
              >
                <CalendarIcon size={18} color="#6366F1" />
              </TouchableOpacity>
            }
          />
        </Card>

        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Save Goal
        </Button>
      </ScrollView>

      <CalendarPickerModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selectedDate={targetDate}
        onSelectDate={(newDate) => {
          setTargetDate(newDate);
          clearFieldError('targetDate');
        }}
        title="Pick Target Completion Date"
      />
    </View>
  );
}
