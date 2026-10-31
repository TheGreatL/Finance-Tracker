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
  Alert,
} from 'react-native';
import { X, Plus, Paperclip, Camera, FileText, Check, Calendar, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { CreateLoanInput } from '../../types/database';
import { INSTITUTION_OPTIONS, getInstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { saveAttachment } from '../../utils/fileStorage';
import { scheduleLoanReminder } from '../../services/notificationService';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatDisplayDate } from '../../utils/formatters';

interface AddLoanModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateLoanInput) => Promise<void>;
  initialProvider?: string;
}

export function AddLoanModal({
  visible,
  onClose,
  onSubmit,
  initialProvider,
}: AddLoanModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('billease');
  const [title, setTitle] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [remainingBalanceStr, setRemainingBalanceStr] = useState('');
  const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
  const [dueDateStr, setDueDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [interestRateStr, setInterestRateStr] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider, visible]);

  // Providers list focusing on lending apps first + all remaining banks/e-wallets
  const priorityCodes = [
    'billease',
    'tala',
    'homecredit',
    'cashalo',
    'gcash',
    'maya',
    'bdo',
    'bpi',
    'cimb',
    'unionbank',
    'metrobank',
  ];
  const providers = [
    ...priorityCodes.map((code) => getInstitutionConfig(code)),
    ...INSTITUTION_OPTIONS.filter((item) => !priorityCodes.includes(item.code)),
  ];

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const filename = asset.fileName || `loan_photo_${Date.now()}.jpg`;
        const persistentUri = await saveAttachment(asset.uri, filename);
        setAttachmentUri(persistentUri);
        setAttachmentName(filename);
      }
    } catch (err: any) {
      Alert.alert('Attachment Error', err?.message || 'Could not pick image');
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const filename = asset.name || `loan_doc_${Date.now()}.pdf`;
        const persistentUri = await saveAttachment(asset.uri, filename);
        setAttachmentUri(persistentUri);
        setAttachmentName(filename);
      }
    } catch (err: any) {
      Alert.alert('Attachment Error', err?.message || 'Could not pick document');
    }
  };

  const handleSave = async () => {
    setError('');
    const totalAmount = parseFloat(totalAmountStr.replace(/[^0-9.]/g, '')) || 0;
    const remaining = remainingBalanceStr
      ? parseFloat(remainingBalanceStr.replace(/[^0-9.]/g, '')) || 0
      : totalAmount;
    const monthlyPayment = parseFloat(monthlyPaymentStr.replace(/[^0-9.]/g, '')) || 0;
    const rate = interestRateStr ? parseFloat(interestRateStr) : null;

    if (!title.trim()) {
      setError('Please provide a name or title for this loan.');
      return;
    }
    if (totalAmount <= 0) {
      setError('Please provide a valid total loan amount.');
      return;
    }
    if (monthlyPayment <= 0) {
      setError('Please specify the monthly payment due amount.');
      return;
    }
    if (!dueDateStr.trim() || !dueDateStr.includes('-')) {
      setError('Please select a valid due date.');
      return;
    }

    try {
      setSubmitting(true);
      const config = getInstitutionConfig(selectedProvider);

      await onSubmit({
        institutionId: selectedProvider,
        title: title.trim(),
        totalAmount,
        remainingBalance: remaining,
        monthlyPayment,
        dueDate: dueDateStr.trim(),
        interestRate: rate,
        attachmentPath: attachmentUri || undefined,
        attachmentName: attachmentName || undefined,
        notes: notes.trim() || undefined,
      });

      // Schedule offline 3-day reminder notification
      await scheduleLoanReminder({
        id: `loan_${Date.now()}`,
        title: title.trim(),
        monthly_payment: monthlyPayment,
        due_date: dueDateStr.trim(),
        institution_name: config.name,
      });

      // Reset
      setTitle('');
      setTotalAmountStr('');
      setRemainingBalanceStr('');
      setMonthlyPaymentStr('');
      setInterestRateStr('');
      setNotes('');
      setAttachmentUri(null);
      setAttachmentName(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[92%] border-t border-stone-100">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
              <View>
                <Text className="text-xl font-bold text-stone-900">Add Loan / Debt</Text>
                <Text className="text-xs text-stone-500">Track repayment schedule & reminders</Text>
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mt-4">
              {error ? (
                <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                  <Text className="text-xs text-red-600 font-medium">{error}</Text>
                </View>
              ) : null}

              {/* 1. Lender / Institution Selector */}
              <SearchableSelectField
                label="1. Lending Provider / Bank"
                modalTitle="Select Lending Provider or Bank"
                searchPlaceholder="Search BillEase, Tala, Home Credit, GCash, BDO..."
                options={providers.map((item): SelectOption => ({
                  id: item.code,
                  label: item.name,
                  subtitle: item.type === 'ewallet' ? 'E-Wallet / Lending' : 'Bank',
                  icon: <InstitutionLogo code={item.code} size={28} />,
                }))}
                selectedId={selectedProvider}
                onSelect={(opt) => setSelectedProvider(opt.id)}
              />

              {/* 2. Loan Title */}
              <View className="mb-3">
                <Text className="text-xs font-medium text-stone-600 mb-1">Loan Title *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. BillEase Laptop, GLoan 6-Mo, Salary Loan"
                  placeholderTextColor="#A8A29E"
                  className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900"
                />
              </View>

              {/* 3. Amounts Row: Total & Remaining */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Total Loan (₱) *</Text>
                  <TextInput
                    value={totalAmountStr}
                    onChangeText={(val) => {
                      setTotalAmountStr(val);
                      if (!remainingBalanceStr) {
                        setRemainingBalanceStr(val);
                      }
                    }}
                    placeholder="₱15,000"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 font-bold"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Remaining Debt (₱)</Text>
                  <TextInput
                    value={remainingBalanceStr}
                    onChangeText={setRemainingBalanceStr}
                    placeholder="₱15,000"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 font-bold"
                  />
                </View>
              </View>

              {/* 4. Payment Schedule Row: Monthly Due & Due Date Picker */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Monthly Payment (₱) *</Text>
                  <TextInput
                    value={monthlyPaymentStr}
                    onChangeText={setMonthlyPaymentStr}
                    placeholder="₱2,500"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 font-bold"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Next Due Date *</Text>
                  <Pressable
                    onPress={() => setDatePickerVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select next due date"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3 flex-row items-center justify-between active:bg-stone-100">
                    <View className="flex-row items-center flex-1 mr-1">
                      <Calendar size={15} color="#18342B" />
                      <Text className="text-xs font-bold text-stone-900 ml-1.5" numberOfLines={1}>
                        {formatDisplayDate(dueDateStr)}
                      </Text>
                    </View>
                    <ChevronDown size={14} color="#78716C" />
                  </Pressable>
                </View>
              </View>

              {/* 5. Interest Rate & Notes */}
              <View className="flex-row gap-3 mb-3">
                <View className="w-1/3">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Interest % (Opt)</Text>
                  <TextInput
                    value={interestRateStr}
                    onChangeText={setInterestRateStr}
                    placeholder="e.g. 3.5"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-medium text-stone-600 mb-1">Notes / Loan Purpose</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="e.g. Work equipment, emergency"
                    placeholderTextColor="#A8A29E"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900"
                  />
                </View>
              </View>

              {/* 6. Document / Photo Attachment */}
              <View className="mb-5">
                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Attachment (Contract / Statement)
                </Text>

                {attachmentUri ? (
                  <View className="flex-row items-center justify-between bg-stone-100 p-3 rounded-xl border border-stone-200">
                    <View className="flex-row items-center flex-1 mr-2">
                      <FileText size={18} color="#18342B" />
                      <Text className="text-xs font-semibold text-stone-800 ml-2" numberOfLines={1}>
                        {attachmentName || 'Attached Document'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setAttachmentUri(null);
                        setAttachmentName(null);
                      }}
                      hitSlop={8}
                      pressRetentionOffset={20}
                      className="p-1 rounded-full bg-stone-200">
                      <X size={14} color="#78716C" />
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handlePickImage}
                      hitSlop={8}
                      pressRetentionOffset={20}
                      className="flex-1 flex-row items-center justify-center bg-stone-100 py-3 rounded-xl border border-stone-200 active:bg-stone-200">
                      <Camera size={16} color="#57534E" />
                      <Text className="text-xs font-bold text-stone-700 ml-1.5">Add Photo</Text>
                    </Pressable>
                    <Pressable
                      onPress={handlePickDocument}
                      hitSlop={8}
                      pressRetentionOffset={20}
                      className="flex-1 flex-row items-center justify-center bg-stone-100 py-3 rounded-xl border border-stone-200 active:bg-stone-200">
                      <FileText size={16} color="#57534E" />
                      <Text className="text-xs font-bold text-stone-700 ml-1.5">Add PDF / File</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Reminder Info Banner */}
              <View className="bg-amber-50 p-3 rounded-xl mb-5 border border-amber-200/70">
                <Text className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  🔔 A local push notification will automatically be scheduled 3 days before your due date at 9:00 AM.
                </Text>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                hitSlop={8}
                pressRetentionOffset={20}
                className="bg-[#18342B] py-3.5 rounded-2xl items-center active:opacity-90 mb-6">
                <Text className="text-white font-bold text-sm">
                  {submitting ? 'Creating Loan...' : 'Save Loan & Set Reminder'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Calendar Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        initialDate={dueDateStr}
        title="Select Due Date"
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={(newDate) => setDueDateStr(newDate)}
      />
    </>
  );
}
