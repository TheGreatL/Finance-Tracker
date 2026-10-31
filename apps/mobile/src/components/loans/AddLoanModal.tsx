import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { X, Plus, Paperclip, Camera, FileText, Check, Calendar, ChevronDown, Bell } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { CreateLoanInput } from '../../types/database';
import { INSTITUTION_OPTIONS, getInstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { saveAttachment } from '../../utils/fileStorage';
import { scheduleLoanReminder } from '../../services/notificationService';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatDisplayDate, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface AddLoanModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (input: CreateLoanInput) => Promise<void>;
    initialProvider?: string;
}

export function AddLoanModal({ visible, onClose, onSubmit, initialProvider }: AddLoanModalProps) {
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
    const [fieldErrors, setFieldErrors] = useState<{
        title?: string;
        totalAmount?: string;
        monthlyPayment?: string;
        dueDate?: string;
    }>({});
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (visible) {
            setError('');
            setFieldErrors({});
        }
        if (initialProvider) {
            setSelectedProvider(initialProvider);
        }
    }, [initialProvider, visible]);

    // Providers list focusing on lending apps first + all remaining banks/e-wallets
    const priorityCodes = ['billease', 'tala', 'homecredit', 'cashalo', 'gcash', 'maya', 'bdo', 'bpi', 'cimb', 'unionbank', 'metrobank'];
    const providers = [
        ...priorityCodes.map((code) => getInstitutionConfig(code)),
        ...INSTITUTION_OPTIONS.filter((item) => !priorityCodes.includes(item.code))
    ];

    const handlePickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow photo library access in Settings to attach receipt or contract images.');
                return;
            }

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8
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
                copyToCacheDirectory: true
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
        const errors: { title?: string; totalAmount?: string; monthlyPayment?: string; dueDate?: string } = {};
        const totalAmount = parseMoneyInput(totalAmountStr);
        const remaining = remainingBalanceStr ? parseMoneyInput(remainingBalanceStr) : totalAmount;
        const monthlyPayment = parseMoneyInput(monthlyPaymentStr);
        const rate = interestRateStr ? parseFloat(interestRateStr) : null;

        if (!title.trim()) {
            errors.title = 'Please provide a name or title for this loan.';
        }
        if (totalAmount <= 0) {
            errors.totalAmount = 'Please provide a valid total loan amount.';
        }
        if (monthlyPayment <= 0) {
            errors.monthlyPayment = 'Please specify the monthly payment due amount.';
        }
        if (!dueDateStr.trim() || !dueDateStr.includes('-')) {
            errors.dueDate = 'Please select a valid due date.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
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
                notes: notes.trim() || undefined
            });

            // Schedule offline 3-day reminder notification safely
            try {
                await scheduleLoanReminder({
                    id: `loan_${Date.now()}`,
                    title: title.trim(),
                    monthly_payment: monthlyPayment,
                    due_date: dueDateStr.trim(),
                    institution_name: config.name
                });
            } catch (notifErr) {
                console.warn('Could not schedule loan notification reminder:', notifErr);
            }

            // Reset
            setTitle('');
            setTotalAmountStr('');
            setRemainingBalanceStr('');
            setMonthlyPaymentStr('');
            setInterestRateStr('');
            setNotes('');
            setAttachmentUri(null);
            setAttachmentName(null);
            setFieldErrors({});
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create loan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[92%] border-t border-stone-100">
                        {/* Header */}
                        <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                            <View>
                                <Text className="text-xl font-bold text-stone-900">Add Loan / Debt</Text>
                                <Text className="text-xs text-stone-500">Track repayment schedule & reminders</Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                disabled={submitting}
                                pointerEvents={submitting ? 'none' : 'auto'}
                                accessibilityRole="button"
                                accessibilityLabel="Close modal"
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className={`w-8 h-8 rounded-full bg-stone-100 items-center justify-center ${submitting ? 'opacity-40' : ''}`}
                            >
                                <X size={18} color="#78716C" />
                            </Pressable>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: keyboardInset }}
                            className="mt-4"
                        >
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
                                disabled={submitting}
                                options={providers.map((item): SelectOption => ({
                                    id: item.code,
                                    label: item.name,
                                    subtitle: item.type === 'ewallet' ? 'E-Wallet / Lending' : 'Bank',
                                    icon: <InstitutionLogo code={item.code} size={28} />
                                }))}
                                selectedId={selectedProvider}
                                onSelect={(opt) => setSelectedProvider(opt.id)}
                            />

                            {/* 2. Loan Title */}
                            <View className="mb-3">
                                <Text className={`text-xs font-medium mb-1 ${fieldErrors.title ? 'text-rose-600 font-semibold' : 'text-stone-600'}`}>
                                    Loan Title *
                                </Text>
                                <TextInput
                                    value={title}
                                    onChangeText={(val) => {
                                        setTitle(val);
                                        if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                                    }}
                                    editable={!submitting}
                                    placeholder="e.g. BillEase Laptop, GLoan 6-Mo, Salary Loan"
                                    placeholderTextColor="#A8A29E"
                                    className={`rounded-xl px-4 py-3 text-sm text-stone-900 border ${
                                        fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                    } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                />
                                {fieldErrors.title ? <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.title}</Text> : null}
                            </View>

                            {/* 3. Amounts Row: Total & Remaining */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${fieldErrors.totalAmount ? 'text-rose-600 font-semibold' : 'text-stone-600'}`}
                                    >
                                        Total Loan (₱) *
                                    </Text>
                                    <TextInput
                                        value={totalAmountStr}
                                        onChangeText={(val) => {
                                            const formatted = formatMoneyInput(val);
                                            setTotalAmountStr(formatted);
                                            if (fieldErrors.totalAmount) setFieldErrors((prev) => ({ ...prev, totalAmount: undefined }));
                                            if (!remainingBalanceStr || remainingBalanceStr === totalAmountStr) {
                                                setRemainingBalanceStr(formatted);
                                            }
                                        }}
                                        editable={!submitting}
                                        placeholder="₱15,000"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`rounded-xl px-4 py-3 text-sm text-stone-900 font-bold border ${
                                            fieldErrors.totalAmount ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                        } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                    />
                                    {fieldErrors.totalAmount ? (
                                        <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.totalAmount}</Text>
                                    ) : null}
                                </View>

                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Remaining Debt (₱)</Text>
                                    <TextInput
                                        value={remainingBalanceStr}
                                        onChangeText={(val) => setRemainingBalanceStr(formatMoneyInput(val))}
                                        editable={!submitting}
                                        placeholder="₱15,000"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 font-bold ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
                                    />
                                </View>
                            </View>

                            {/* 4. Payment Schedule Row: Monthly Due & Due Date Picker */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${fieldErrors.monthlyPayment ? 'text-rose-600 font-semibold' : 'text-stone-600'}`}
                                    >
                                        Monthly Payment (₱) *
                                    </Text>
                                    <TextInput
                                        value={monthlyPaymentStr}
                                        onChangeText={(val) => {
                                            setMonthlyPaymentStr(formatMoneyInput(val));
                                            if (fieldErrors.monthlyPayment) setFieldErrors((prev) => ({ ...prev, monthlyPayment: undefined }));
                                        }}
                                        editable={!submitting}
                                        placeholder="₱2,500"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`rounded-xl px-4 py-3 text-sm text-stone-900 font-bold border ${
                                            fieldErrors.monthlyPayment ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                        } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                    />
                                    {fieldErrors.monthlyPayment ? (
                                        <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.monthlyPayment}</Text>
                                    ) : null}
                                </View>

                                <View className="flex-1">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${fieldErrors.dueDate ? 'text-rose-600 font-semibold' : 'text-stone-600'}`}
                                    >
                                        Next Due Date *
                                    </Text>
                                    <Pressable
                                        onPress={() => {
                                            setDatePickerVisible(true);
                                            if (fieldErrors.dueDate) setFieldErrors((prev) => ({ ...prev, dueDate: undefined }));
                                        }}
                                        disabled={submitting}
                                        accessibilityRole="button"
                                        accessibilityLabel="Select next due date"
                                        className={`rounded-xl px-3.5 py-3 flex-row items-center justify-between border ${
                                            fieldErrors.dueDate ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50 active:bg-stone-100'
                                        } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                    >
                                        <View className="flex-row items-center flex-1 mr-1">
                                            <Calendar size={15} color="#18342B" />
                                            <Text className="text-xs font-bold text-stone-900 ml-1.5" numberOfLines={1}>
                                                {formatDisplayDate(dueDateStr)}
                                            </Text>
                                        </View>
                                        <ChevronDown size={14} color="#78716C" />
                                    </Pressable>
                                    {fieldErrors.dueDate ? (
                                        <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.dueDate}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* 5. Interest Rate & Notes */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="w-1/3">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Interest % (Opt)</Text>
                                    <TextInput
                                        value={interestRateStr}
                                        onChangeText={setInterestRateStr}
                                        editable={!submitting}
                                        placeholder="e.g. 3.5"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="numeric"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Notes / Loan Purpose</Text>
                                    <TextInput
                                        value={notes}
                                        onChangeText={setNotes}
                                        editable={!submitting}
                                        placeholder="e.g. Work equipment, emergency"
                                        placeholderTextColor="#A8A29E"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
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
                                            disabled={submitting}
                                            hitSlop={8}
                                            pressRetentionOffset={20}
                                            className={`p-1 rounded-full bg-stone-200 ${submitting ? 'opacity-40' : ''}`}
                                        >
                                            <X size={14} color="#78716C" />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View className="flex-row gap-2">
                                        <Pressable
                                            onPress={handlePickImage}
                                            disabled={submitting}
                                            hitSlop={8}
                                            pressRetentionOffset={20}
                                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border border-stone-200 ${
                                                submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-100 active:bg-stone-200'
                                            }`}
                                        >
                                            <Camera size={16} color="#57534E" />
                                            <Text className="text-xs font-bold text-stone-700 ml-1.5">Add Photo</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={handlePickDocument}
                                            disabled={submitting}
                                            hitSlop={8}
                                            pressRetentionOffset={20}
                                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border border-stone-200 ${
                                                submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-100 active:bg-stone-200'
                                            }`}
                                        >
                                            <FileText size={16} color="#57534E" />
                                            <Text className="text-xs font-bold text-stone-700 ml-1.5">Add PDF / File</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>

                            {/* Reminder Info Banner */}
                            <View className="bg-amber-50 p-3 rounded-xl mb-5 border border-amber-200/70 flex-row items-center">
                                <Bell size={14} color="#92400E" />
                                <Text className="text-[11px] text-amber-800 font-medium leading-relaxed flex-1 ml-2">
                                    A local push notification will automatically be scheduled 3 days before your due date at 9:00 AM.
                                </Text>
                            </View>

                            {/* Save Button */}
                            <Pressable
                                onPress={handleSave}
                                disabled={submitting}
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className={`bg-[#18342B] py-3.5 rounded-2xl items-center mb-6 ${submitting ? 'opacity-50' : 'active:opacity-90'}`}
                            >
                                <Text className="text-white font-bold text-sm">{submitting ? 'Creating Loan...' : 'Save Loan & Set Reminder'}</Text>
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
