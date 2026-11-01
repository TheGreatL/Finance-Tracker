import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert, Switch } from 'react-native';
import { X, Plus, Paperclip, Camera, FileText, Check, Calendar, ChevronDown, Bell, User, Building2, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { CreateLoanInput, LenderType } from '../../types/database';
import { INSTITUTION_OPTIONS, getInstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { saveAttachment } from '../../utils/fileStorage';
import { scheduleLoanReminder } from '../../services/notificationService';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatCurrency, formatDisplayDate, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface AddLoanModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (input: CreateLoanInput) => Promise<void>;
    initialProvider?: string;
}

const TERM_PRESETS = [3, 6, 12, 18, 24, 36, 48, 60];

export function AddLoanModal({ visible, onClose, onSubmit, initialProvider }: AddLoanModalProps) {
    const [lenderType, setLenderType] = useState<LenderType>('institution');
    const [lenderName, setLenderName] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<string>('billease');
    const [title, setTitle] = useState('');
    const [principalAmountStr, setPrincipalAmountStr] = useState('');
    const [processingFeeStr, setProcessingFeeStr] = useState('');
    const [totalAmountStr, setTotalAmountStr] = useState('');
    const [remainingBalanceStr, setRemainingBalanceStr] = useState('');
    const [startDateStr, setStartDateStr] = useState(() => new Date().toISOString().split('T')[0]);
    const [termMonthsStr, setTermMonthsStr] = useState('12');
    const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
    const [dueDateStr, setDueDateStr] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [interestRateStr, setInterestRateStr] = useState('');
    const [hasInterestCashback, setHasInterestCashback] = useState(false);
    const [notes, setNotes] = useState('');
    const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);

    const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [dueDatePickerVisible, setDueDatePickerVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{
        lenderName?: string;
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
            if (initialProvider === 'gcash') {
                setHasInterestCashback(true);
            }
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
        const errors: { lenderName?: string; title?: string; totalAmount?: string; monthlyPayment?: string; dueDate?: string } = {};
        const totalAmount = parseMoneyInput(totalAmountStr);
        const principalAmount = principalAmountStr ? parseMoneyInput(principalAmountStr) : totalAmount;
        const processingFee = processingFeeStr ? parseMoneyInput(processingFeeStr) : 0;
        const remaining = remainingBalanceStr ? parseMoneyInput(remainingBalanceStr) : totalAmount;
        const monthlyPayment = parseMoneyInput(monthlyPaymentStr);
        const rate = interestRateStr ? parseFloat(interestRateStr) : null;
        const termMonths = termMonthsStr ? parseInt(termMonthsStr, 10) : undefined;

        if (lenderType === 'person' && !lenderName.trim()) {
            errors.lenderName = 'Please specify the lender or person you borrowed from.';
        }
        if (!title.trim()) {
            errors.title = 'Please provide a name or title for this loan.';
        }
        if (totalAmount <= 0) {
            errors.totalAmount = 'Please provide a valid total loan obligation.';
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
            const config = lenderType === 'institution' ? getInstitutionConfig(selectedProvider) : null;

            await onSubmit({
                lenderType,
                lenderName: lenderType === 'person' ? lenderName.trim() : undefined,
                institutionId: lenderType === 'institution' ? selectedProvider : undefined,
                title: title.trim(),
                principalAmount,
                processingFee,
                totalAmount,
                remainingBalance: remaining,
                monthlyPayment,
                startDate: startDateStr ? startDateStr.trim() : undefined,
                dueDate: dueDateStr.trim(),
                termMonths,
                interestRate: rate,
                hasInterestCashback,
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
                    institution_name: config ? config.name : lenderName.trim()
                });
            } catch (notifErr) {
                console.warn('Could not schedule loan notification reminder:', notifErr);
            }

            // Reset
            setLenderType('institution');
            setLenderName('');
            setTitle('');
            setPrincipalAmountStr('');
            setProcessingFeeStr('');
            setTotalAmountStr('');
            setRemainingBalanceStr('');
            setStartDateStr(new Date().toISOString().split('T')[0]);
            setTermMonthsStr('12');
            setMonthlyPaymentStr('');
            setInterestRateStr('');
            setHasInterestCashback(false);
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

    const parsedPrincipal = parseMoneyInput(principalAmountStr) || parseMoneyInput(totalAmountStr);
    const parsedFee = parseMoneyInput(processingFeeStr);
    const netProceeds = Math.max(0, parsedPrincipal - parsedFee);
    const parsedTotal = parseMoneyInput(totalAmountStr);
    const totalInterest = Math.max(0, parsedTotal - parsedPrincipal);

    const parsedTerm = parseInt(termMonthsStr, 10);
    let projectedMaturityStr: string | null = null;
    if (startDateStr && !isNaN(parsedTerm) && parsedTerm > 0) {
        const parts = startDateStr.split('-');
        if (parts.length === 3) {
            const sy = parseInt(parts[0], 10);
            const sm = parseInt(parts[1], 10) - 1;
            const sd = parseInt(parts[2], 10);
            const end = new Date(sy, sm + parsedTerm, sd);
            if (!isNaN(end.getTime())) {
                const ey = end.getFullYear();
                const em = String(end.getMonth() + 1).padStart(2, '0');
                const ed = String(end.getDate()).padStart(2, '0');
                projectedMaturityStr = `${ey}-${em}-${ed}`;
            }
        }
    }

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[92%] border-t border-stone-100">
                        {/* Header */}
                        <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                            <View>
                                <Text className="text-xl font-bold text-stone-900">Add Loan / Debt</Text>
                                <Text className="text-xs text-stone-500">Track repayment schedule, tenor & cashback</Text>
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

                            {/* Lender Type Segmented Control */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Lender Type</Text>
                                <View className="flex-row bg-stone-100 p-1 rounded-2xl border border-stone-200">
                                    <Pressable
                                        onPress={() => {
                                            setLenderType('institution');
                                            if (fieldErrors.lenderName) setFieldErrors((prev) => ({ ...prev, lenderName: undefined }));
                                        }}
                                        disabled={submitting}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                                            lenderType === 'institution' ? 'bg-white shadow-sm border border-stone-200/80' : ''
                                        }`}
                                    >
                                        <Building2 size={15} color={lenderType === 'institution' ? '#18342B' : '#78716C'} />
                                        <Text
                                            className={`text-xs font-bold ml-1.5 ${
                                                lenderType === 'institution' ? 'text-stone-900' : 'text-stone-500'
                                            }`}
                                        >
                                            Bank / Institution
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => {
                                            setLenderType('person');
                                            if (fieldErrors.lenderName) setFieldErrors((prev) => ({ ...prev, lenderName: undefined }));
                                        }}
                                        disabled={submitting}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                                            lenderType === 'person' ? 'bg-white shadow-sm border border-stone-200/80' : ''
                                        }`}
                                    >
                                        <User size={15} color={lenderType === 'person' ? '#18342B' : '#78716C'} />
                                        <Text className={`text-xs font-bold ml-1.5 ${lenderType === 'person' ? 'text-stone-900' : 'text-stone-500'}`}>
                                            Person / Peer
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* 1. Lender Info based on Type */}
                            {lenderType === 'institution' ? (
                                <SearchableSelectField
                                    label="Lending Provider / Bank"
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
                                    onSelect={(opt) => {
                                        setSelectedProvider(opt.id);
                                        if (opt.id === 'gcash') {
                                            setHasInterestCashback(true);
                                        }
                                    }}
                                />
                            ) : (
                                <View className="mb-3">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${
                                            fieldErrors.lenderName ? 'text-rose-600 font-semibold' : 'text-stone-600'
                                        }`}
                                    >
                                        Lender / Person Name *
                                    </Text>
                                    <TextInput
                                        value={lenderName}
                                        onChangeText={(val) => {
                                            setLenderName(val);
                                            if (fieldErrors.lenderName) setFieldErrors((prev) => ({ ...prev, lenderName: undefined }));
                                        }}
                                        editable={!submitting}
                                        placeholder="e.g. Juan Dela Cruz, Kuya Mark, Tita Tessie"
                                        placeholderTextColor="#A8A29E"
                                        className={`rounded-xl px-4 py-3 text-sm text-stone-900 border ${
                                            fieldErrors.lenderName ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                        } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                    />
                                    {fieldErrors.lenderName ? (
                                        <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.lenderName}</Text>
                                    ) : null}
                                </View>
                            )}

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
                                    placeholder={
                                        lenderType === 'person'
                                            ? 'e.g. Personal Emergency Loan, Business Capital'
                                            : 'e.g. BillEase Laptop, GLoan 6-Mo, Salary Loan'
                                    }
                                    placeholderTextColor="#A8A29E"
                                    className={`rounded-xl px-4 py-3 text-sm text-stone-900 border ${
                                        fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                    } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                                />
                                {fieldErrors.title ? <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.title}</Text> : null}
                            </View>

                            {/* 3. Principal & Processing Fee Breakdown */}
                            <View className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 mb-3">
                                <Text className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2.5">Borrowing Breakdown</Text>
                                <View className="flex-row gap-3 mb-2">
                                    <View className="flex-1">
                                        <Text className="text-xs font-medium text-stone-600 mb-1">Principal Borrowed (₱)</Text>
                                        <TextInput
                                            value={principalAmountStr}
                                            onChangeText={(val) => {
                                                const formatted = formatMoneyInput(val);
                                                setPrincipalAmountStr(formatted);
                                                if (!totalAmountStr || totalAmountStr === principalAmountStr) {
                                                    setTotalAmountStr(formatted);
                                                }
                                                if (!remainingBalanceStr || remainingBalanceStr === principalAmountStr) {
                                                    setRemainingBalanceStr(formatted);
                                                }
                                            }}
                                            editable={!submitting}
                                            placeholder="₱10,000"
                                            placeholderTextColor="#A8A29E"
                                            keyboardType="decimal-pad"
                                            className={`border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 font-bold bg-white ${
                                                submitting ? 'opacity-60' : ''
                                            }`}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xs font-medium text-stone-600 mb-1">Processing Fee (₱)</Text>
                                        <TextInput
                                            value={processingFeeStr}
                                            onChangeText={(val) => setProcessingFeeStr(formatMoneyInput(val))}
                                            editable={!submitting}
                                            placeholder="e.g. ₱300 (3%)"
                                            placeholderTextColor="#A8A29E"
                                            keyboardType="decimal-pad"
                                            className={`border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 font-bold bg-white ${
                                                submitting ? 'opacity-60' : ''
                                            }`}
                                        />
                                    </View>
                                </View>
                                {parsedPrincipal > 0 && parsedFee > 0 ? (
                                    <View className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 flex-row items-center justify-between mt-1">
                                        <Text className="text-[11px] font-medium text-emerald-800">Net Cash Disbursed to You:</Text>
                                        <Text className="text-xs font-bold text-emerald-900">{formatCurrency(netProceeds)}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* 4. Total Loan Obligation & Remaining Debt */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${
                                            fieldErrors.totalAmount ? 'text-rose-600 font-semibold' : 'text-stone-600'
                                        }`}
                                    >
                                        Total Payable (₱) *
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
                                        placeholder="₱12,500"
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
                                        placeholder="₱12,500"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 font-bold ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
                                    />
                                </View>
                            </View>

                            {/* Total Contract Interest indicator */}
                            {totalInterest > 0 ? (
                                <View className="bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/60 flex-row items-center justify-between mb-3">
                                    <Text className="text-[11px] font-medium text-amber-800">Total Contract Interest:</Text>
                                    <Text className="text-xs font-bold text-amber-900">{formatCurrency(totalInterest)}</Text>
                                </View>
                            ) : null}

                            {/* 5. Tenor / Duration & Dates */}
                            <View className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 mb-3">
                                <Text className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2.5">Timeline & Tenor</Text>

                                <View className="flex-row gap-3 mb-3">
                                    <View className="flex-1">
                                        <Text className="text-xs font-medium text-stone-600 mb-1">Origination / Start Date</Text>
                                        <Pressable
                                            onPress={() => setStartDatePickerVisible(true)}
                                            disabled={submitting}
                                            accessibilityRole="button"
                                            accessibilityLabel="Select start date"
                                            className={`rounded-xl px-3 py-2.5 flex-row items-center justify-between border border-stone-200 bg-white ${
                                                submitting ? 'opacity-60' : 'active:bg-stone-100'
                                            }`}
                                        >
                                            <View className="flex-row items-center flex-1 mr-1">
                                                <Calendar size={14} color="#18342B" />
                                                <Text className="text-xs font-bold text-stone-900 ml-1.5" numberOfLines={1}>
                                                    {formatDisplayDate(startDateStr)}
                                                </Text>
                                            </View>
                                            <ChevronDown size={14} color="#78716C" />
                                        </Pressable>
                                    </View>

                                    <View className="flex-1">
                                        <Text className="text-xs font-medium text-stone-600 mb-1">Tenor (Months)</Text>
                                        <TextInput
                                            value={termMonthsStr}
                                            onChangeText={setTermMonthsStr}
                                            editable={!submitting}
                                            placeholder="e.g. 12"
                                            placeholderTextColor="#A8A29E"
                                            keyboardType="number-pad"
                                            className={`border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 font-bold bg-white ${
                                                submitting ? 'opacity-60' : ''
                                            }`}
                                        />
                                    </View>
                                </View>

                                {/* Term Presets Chips */}
                                <View className="flex-row flex-wrap gap-1.5 mb-2">
                                    {TERM_PRESETS.map((preset) => {
                                        const isSelected = termMonthsStr === String(preset);
                                        return (
                                            <Pressable
                                                key={preset}
                                                onPress={() => setTermMonthsStr(String(preset))}
                                                disabled={submitting}
                                                className={`px-2.5 py-1 rounded-lg border ${
                                                    isSelected ? 'bg-[#18342B] border-[#18342B]' : 'bg-white border-stone-200 active:bg-stone-100'
                                                }`}
                                            >
                                                <Text className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-stone-700'}`}>
                                                    {preset}m
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {projectedMaturityStr ? (
                                    <View className="bg-stone-200/60 px-3 py-1.5 rounded-xl flex-row items-center justify-between mt-1">
                                        <Text className="text-[11px] text-stone-600 font-medium">Projected Maturity:</Text>
                                        <Text className="text-[11px] font-bold text-stone-900">
                                            {formatDisplayDate(projectedMaturityStr)} ({termMonthsStr} mos)
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* 6. Payment Schedule Row: Monthly Due & Due Date Picker */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text
                                        className={`text-xs font-medium mb-1 ${
                                            fieldErrors.monthlyPayment ? 'text-rose-600 font-semibold' : 'text-stone-600'
                                        }`}
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
                                            setDueDatePickerVisible(true);
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

                            {/* 7. Interest Rate & Early Payoff Cashback Toggle */}
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

                            {/* Early Payoff Cashback Card */}
                            <View className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200 mb-4 flex-row items-center justify-between">
                                <View className="flex-1 mr-3">
                                    <View className="flex-row items-center">
                                        <Sparkles size={14} color="#0D9488" />
                                        <Text className="text-xs font-bold text-teal-900 ml-1.5">Early Payoff Interest Cashback</Text>
                                    </View>
                                    <Text className="text-[11px] text-teal-700 mt-0.5 leading-snug">
                                        Eligible for cash refund on remaining months&apos; interest upon full early settlement (e.g. GCash GLoan).
                                    </Text>
                                </View>
                                <Switch
                                    value={hasInterestCashback}
                                    onValueChange={setHasInterestCashback}
                                    disabled={submitting}
                                    trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
                                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                                />
                            </View>

                            {/* 8. Document / Photo Attachment */}
                            <View className="mb-4">
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
                            <View className="bg-amber-50 p-3 rounded-xl mb-4 border border-amber-200/70 flex-row items-center">
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

            {/* Start Date Picker Calendar Modal */}
            <DatePickerModal
                visible={startDatePickerVisible}
                initialDate={startDateStr}
                title="Select Origination / Start Date"
                onClose={() => setStartDatePickerVisible(false)}
                onSelectDate={(newDate) => setStartDateStr(newDate)}
            />

            {/* Due Date Picker Calendar Modal */}
            <DatePickerModal
                visible={dueDatePickerVisible}
                initialDate={dueDateStr}
                title="Select Next Due Date"
                onClose={() => setDueDatePickerVisible(false)}
                onSelectDate={(newDate) => setDueDateStr(newDate)}
            />
        </>
    );
}
