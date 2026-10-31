import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X, Calendar, ChevronDown, Check } from 'lucide-react-native';
import type {
  AccountPocket,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionRecord,
  SubscriptionFrequency,
} from '../../types/database';
import {
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_CATEGORIES,
  getSubscriptionPreset,
} from '../../constants/subscriptions';
import { advanceBillingDate, toLocalISODate } from '../../services/subscriptionService';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { SubscriptionLogo } from './SubscriptionLogo';

interface AddSubscriptionModalProps {
  visible: boolean;
  pockets: (AccountPocket & { institution_name?: string })[];
  editingSubscription?: SubscriptionRecord | null;
  onClose: () => void;
  onSubmit: (input: CreateSubscriptionInput) => Promise<void>;
  onUpdate?: (id: string, input: UpdateSubscriptionInput) => Promise<void>;
}

const FREQUENCIES: { id: SubscriptionFrequency; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

export function AddSubscriptionModal({
  visible,
  pockets,
  editingSubscription,
  onClose,
  onSubmit,
  onUpdate,
}: AddSubscriptionModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>('netflix');
  const [serviceName, setServiceName] = useState<string>('Netflix');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
  const [startDate, setStartDate] = useState<string>(() => toLocalISODate());
  const [nextBillingDate, setNextBillingDate] = useState<string>(() =>
    advanceBillingDate(toLocalISODate(), 'monthly')
  );
  const [category, setCategory] = useState<string>('Entertainment');
  const [notes, setNotes] = useState<string>('');

  const [dateTarget, setDateTarget] = useState<'start' | 'next' | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    setError('');

    if (editingSubscription) {
      setSelectedCode(editingSubscription.service_code || 'custom');
      setServiceName(editingSubscription.service_name);
      setSelectedPocketId(editingSubscription.pocket_id);
      setAmountStr(String(editingSubscription.amount));
      setFrequency(editingSubscription.frequency);
      setStartDate(editingSubscription.start_date);
      setNextBillingDate(editingSubscription.next_billing_date);
      setCategory(editingSubscription.category);
      setNotes(editingSubscription.notes || '');
    } else {
      const today = toLocalISODate();
      setSelectedCode('netflix');
      setServiceName('Netflix');
      setSelectedPocketId(pockets[0]?.id || '');
      setAmountStr('');
      setFrequency('monthly');
      setStartDate(today);
      setNextBillingDate(advanceBillingDate(today, 'monthly'));
      setCategory('Entertainment');
      setNotes('');
    }
  }, [visible, editingSubscription, pockets]);

  const handleSelectPreset = (code: string) => {
    const preset = getSubscriptionPreset(code);
    setSelectedCode(preset.code);
    setCategory(preset.defaultCategory);
    if (preset.code !== 'custom') {
      setServiceName(preset.name);
    } else if (SUBSCRIPTION_PRESETS.some((p) => p.name === serviceName)) {
      setServiceName('');
    }
  };

  const handleChangeFrequency = (newFreq: SubscriptionFrequency) => {
    setFrequency(newFreq);
    if (!editingSubscription) {
      setNextBillingDate(advanceBillingDate(startDate, newFreq));
    }
  };

  const handleSave = async () => {
    setError('');
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

    if (!serviceName.trim()) {
      setError('Please enter the subscription service name.');
      return;
    }
    if (!selectedPocketId) {
      setError('Please select a payment account / pocket.');
      return;
    }
    if (amount <= 0) {
      setError('Please enter a valid billing amount greater than 0.');
      return;
    }
    if (!nextBillingDate.trim()) {
      setError('Please select the next billing date.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSubscription && onUpdate) {
        await onUpdate(editingSubscription.id, {
          serviceName: serviceName.trim(),
          serviceCode: selectedCode,
          pocketId: selectedPocketId,
          amount,
          frequency,
          startDate,
          nextBillingDate,
          category,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          serviceName: serviceName.trim(),
          serviceCode: selectedCode,
          pocketId: selectedPocketId,
          amount,
          frequency,
          startDate,
          nextBillingDate,
          category,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[92%] border-t border-stone-100">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
              <View>
                <Text className="text-xl font-bold text-stone-900">
                  {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
                </Text>
                <Text className="text-xs text-stone-500">
                  Auto-deducts on due date & sends 1-day-prior alert
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                hitSlop={8}
                pressRetentionOffset={20}
                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                <X size={18} color="#78716C" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="mt-4">
              {error ? (
                <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                  <Text className="text-xs text-red-600 font-medium">{error}</Text>
                </View>
              ) : null}

              {/* 1. Service Logo Preset Picker */}
              <SearchableSelectField
                label="1. Choose Service Preset"
                modalTitle="Select Subscription Service"
                searchPlaceholder="Search Netflix, Spotify, iCloud, Gym..."
                options={SUBSCRIPTION_PRESETS.map((preset): SelectOption => ({
                  id: preset.code,
                  label: preset.name,
                  subtitle: preset.defaultCategory,
                  icon: (
                    <SubscriptionLogo
                      code={preset.code}
                      serviceName={preset.name}
                      size={28}
                    />
                  ),
                }))}
                selectedId={selectedCode}
                onSelect={(opt) => handleSelectPreset(opt.id)}
              />

              {/* 2. Service Name & Amount */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">
                    Service Name *
                  </Text>
                  <TextInput
                    value={serviceName}
                    onChangeText={setServiceName}
                    placeholder="e.g. Netflix, Spotify, Gym"
                    placeholderTextColor="#A8A29E"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3 text-sm text-stone-900 font-semibold"
                  />
                </View>

                <View className="w-36">
                  <Text className="text-xs font-medium text-stone-600 mb-1">
                    Billing Amount (₱) *
                  </Text>
                  <TextInput
                    value={amountStr}
                    onChangeText={setAmountStr}
                    placeholder="₱549"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3 text-sm text-stone-900 font-extrabold"
                  />
                </View>
              </View>

              {/* 3. Payment Source (Pocket) */}
              <SearchableSelectField
                label="Payment Source (Auto-Deduct From) *"
                modalTitle="Select Payment Account"
                searchPlaceholder="Search bank, e-wallet, or pocket..."
                placeholder="Select a pocket or wallet..."
                options={pockets.map((p): SelectOption => ({
                  id: p.id,
                  label: p.institution_name ? `${p.institution_name} • ${p.name}` : p.name,
                  subtitle: p.pocket_type === 'savings' ? 'Interest Savings' : 'Everyday Wallet',
                  badge: `${formatCurrency(p.current_balance)} available`,
                }))}
                selectedId={selectedPocketId}
                onSelect={(opt) => setSelectedPocketId(opt.id)}
              />

              {/* 4. Billing Frequency */}
              <Text className="text-xs font-medium text-stone-600 mb-1.5">
                Billing Frequency *
              </Text>
              <View className="flex-row gap-2 mb-4">
                {FREQUENCIES.map((f) => {
                  const isSelected = frequency === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => handleChangeFrequency(f.id)}
                      className={`flex-1 py-2.5 rounded-xl border items-center flex-row justify-center ${
                        isSelected
                          ? 'bg-stone-900 border-stone-900'
                          : 'bg-stone-50 border-stone-200'
                      }`}>
                      {isSelected && <Check size={13} color="#BBD583" />}
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white ml-1' : 'text-stone-700'
                        }`}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 5. Start Date & Next Billing Date */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Start Date</Text>
                  <Pressable
                    onPress={() => setDateTarget('start')}
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-3 flex-row items-center justify-between active:bg-stone-100">
                    <View className="flex-row items-center flex-1 mr-1">
                      <Calendar size={14} color="#78716C" />
                      <Text className="text-xs text-stone-900 font-semibold ml-1.5" numberOfLines={1}>
                        {formatDisplayDate(startDate)}
                      </Text>
                    </View>
                    <ChevronDown size={13} color="#A8A29E" />
                  </Pressable>
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">
                    Next Billing Date *
                  </Text>
                  <Pressable
                    onPress={() => setDateTarget('next')}
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-3 flex-row items-center justify-between active:bg-stone-100">
                    <View className="flex-row items-center flex-1 mr-1">
                      <Calendar size={14} color="#18342B" />
                      <Text className="text-xs text-stone-900 font-bold ml-1.5" numberOfLines={1}>
                        {formatDisplayDate(nextBillingDate)}
                      </Text>
                    </View>
                    <ChevronDown size={13} color="#A8A29E" />
                  </Pressable>
                </View>
              </View>

              {/* 6. Expense Category */}
              <SearchableSelectField
                label="Category *"
                modalTitle="Select Expense Category"
                searchPlaceholder="Search Entertainment, Software, Utilities..."
                options={SUBSCRIPTION_CATEGORIES.map((cat): SelectOption => ({
                  id: cat,
                  label: cat,
                }))}
                selectedId={category}
                onSelect={(opt) => setCategory(opt.id)}
              />

              {/* 7. Optional Notes */}
              <View className="mb-5">
                <Text className="text-xs font-medium text-stone-600 mb-1">Notes (Optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Family plan shared with 4 members"
                  placeholderTextColor="#A8A29E"
                  className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900"
                />
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                hitSlop={8}
                pressRetentionOffset={20}
                className="bg-[#18342B] py-3.5 rounded-2xl items-center active:opacity-90 mb-6">
                <Text className="text-white font-bold text-sm">
                  {submitting
                    ? 'Saving Subscription...'
                    : editingSubscription
                    ? 'Save Changes'
                    : 'Save Subscription & Enable Auto-Pay'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DatePickerModal
        visible={dateTarget !== null}
        initialDate={dateTarget === 'start' ? startDate : nextBillingDate}
        title={dateTarget === 'start' ? 'Select Start Date' : 'Select Next Billing Date'}
        onClose={() => setDateTarget(null)}
        onSelectDate={(newDate) => {
          if (dateTarget === 'start') {
            setStartDate(newDate);
          } else if (dateTarget === 'next') {
            setNextBillingDate(newDate);
          }
          setDateTarget(null);
        }}
      />
    </>
  );
}

