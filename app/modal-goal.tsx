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
import { X, Target } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createSavingsGoal } from '../src/services/goalService';

export default function ModalGoalScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, refreshAll } = useFinance();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal title.');
      return;
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid target amount.');
      return;
    }

    const current = parseFloat(currentAmount) || 0;

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

        <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
          <View className="gap-1">
            <Text size="xs" muted>
              Goal Name:
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emergency Fund, New Laptop, House Downpayment"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Target Amount ({currency}):
            </Text>
            <Input
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
              placeholder="100000.00"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Starting / Already Saved ({currency}):
            </Text>
            <Input
              value={currentAmount}
              onChangeText={setCurrentAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Target Completion Date (Optional, YYYY-MM-DD):
            </Text>
            <Input
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="2026-12-31"
            />
          </View>
        </Card>

        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Save Goal
        </Button>
      </ScrollView>
    </View>
  );
}
