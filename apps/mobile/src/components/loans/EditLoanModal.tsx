import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert, Switch } from 'react-native';
import { X, Lock, Paperclip, Camera, Calendar, Check, Trash2, Building2, User, Sparkles, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { LoanRecord, UpdateLoanMetadataInput, LenderType } from '../../types/database';
import { INSTITUTION_OPTIONS, getInstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { saveAttachment } from '../../utils/fileStorage';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatCurrency, formatDisplayDate, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface EditLoanModalProps {
    visible: boolean;
    loan: LoanRecord | null;
    onClose: () => void;
    onSave: (loanId: string, updates: UpdateLoanMetadataInput) => Promise<void>;
}

const TERM_PRESETS = [3, 6, 12, 18, 24, 36, 48, 60];

export function EditLoanModal({ visible, loan, onClose, onSave }: EditLoanModalProps) {
    const [lenderType, setLenderType] = useState<LenderType>('institution');
    const [lenderName, setLenderName] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<string>('billease');
    const [title, setTitle] = useState('');
    const [principalAmountStr, setPrincipalAmountStr] = useState('');
    const [processingFeeStr, setProcessingFeeStr] = useState('');
    const [totalAmountStr, setTotalAmountStr] = useState('');
    const [startDateStr, setStartDateStr] = useState('');
    const [termMonthsStr, setTermMonthsStr] = useState('');
    const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
    const [dueDateStr, setDueDateStr] = useState('');
    const [interestRateStr, setInterestRateStr] = useState('');
    const [hasInterestCashback, setHasInterestCashback] = useState(false);
    const [notes, setNotes] = useState('');
    const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);

    const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [dueDatePickerVisible, setDueDatePickerVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (loan) {
            setLenderType(loan.lender_type || 'institution');
            setLenderName(loan.lender_name || '');
            setSelectedProvider(loan.institution_code || loan.institution_id || 'billease');
            setTitle(loan.title || '');
            setPrincipalAmountStr(loan.principal_amount ? formatMoneyInput(loan.principal_amount.toString()) : '');
            setProcessingFeeStr(loan.processing_fee ? formatMoneyInput(loan.processing_fee.toString()) : '');
            setTotalAmountStr(loan.total_amount ? formatMoneyInput(loan.total_amount.toString()) : '');
            setStartDateStr(loan.start_date || '');
            setTermMonthsStr(loan.term_months ? String(loan.term_months) : '');
            setMonthlyPaymentStr(loan.monthly_payment ? formatMoneyInput(loan.monthly_payment.toString()) : '');
            setDueDateStr(loan.due_date || '');
            setInterestRateStr(loan.interest_rate != null ? String(loan.interest_rate) : '');
            setHasInterestCashback(Boolean(loan.has_interest_cashback));
            setNotes(loan.notes || '');
            setAttachmentUri(loan.attachment_path || null);
            setAttachmentName(loan.attachment_name || (loan.attachment_path ? 'Attached Document' : null));
        }
    }, [loan]);

    if (!loan) return null;

    const priorityCodes = ['billease', 'tala', 'homecredit', 'cashalo', 'gcash', 'maya', 'bdo', 'bpi', 'cimb', 'unionbank', 'metrobank'];
    const providers = [
        ...priorityCodes.map((code) => getInstitutionConfig(code)),
        ...INSTITUTION_OPTIONS.filter((item) => !priorityCodes.includes(item.code))
    ];

    const providerOptions: SelectOption[] = providers.map((item) => ({
        id: item.code,
        label: item.name,
        subtitle: item.type === 'ewallet' ? 'E-Wallet / Lending' : 'Bank',
        icon: <InstitutionLogo code={item.code} size={28} />
    }));

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                const savedPath = await saveAttachment(file.uri, file.name);
                setAttachmentUri(savedPath);
                setAttachmentName(file.name);
            }
        } catch {
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const fileName = `loan_photo_${Date.now()}.jpg`;
                const savedPath = await saveAttachment(asset.uri, fileName);
                setAttachmentUri(savedPath);
                setAttachmentName(fileName);
            }
        } catch {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required', 'Please enter a loan title.');
            return;
        }
        if (lenderType === 'person' && !lenderName.trim()) {
            Alert.alert('Required', 'Please enter the lender or person name.');
            return;
        }
        const monthlyPayment = parseMoneyInput(monthlyPaymentStr);
        if (monthlyPayment <= 0) {
            Alert.alert('Invalid Payment', 'Please enter a valid monthly payment amount.');
            return;
        }

        try {
            setSaving(true);
            await onSave(loan.id, {
                title: title.trim(),
                lenderType,
                lenderName: lenderType === 'person' ? lenderName.trim() : undefined,
                institutionId: lenderType === 'institution' ? selectedProvider : undefined,
                principalAmount: principalAmountStr ? parseMoneyInput(principalAmountStr) : undefined,
                processingFee: processingFeeStr ? parseMoneyInput(processingFeeStr) : undefined,
                totalAmount: totalAmountStr ? parseMoneyInput(totalAmountStr) : undefined,
                startDate: startDateStr ? startDateStr.trim() : undefined,
                dueDate: dueDateStr.trim(),
                termMonths: termMonthsStr ? parseInt(termMonthsStr, 10) : undefined,
                interestRate: interestRateStr ? parseFloat(interestRateStr) : null,
                hasInterestCashback,
                monthlyPayment,
                notes: notes.trim() || undefined,
                attachmentPath: attachmentUri || undefined,
                attachmentName: attachmentName || undefined
            });
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to update loan details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={saving ? () => {} : onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[92%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-bold text-stone-900">Edit Loan Details</Text>
                            <Text className="text-xs text-stone-500">Update loan terms, duration & notes</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            disabled={saving}
                            pointerEvents={saving ? 'none' : 'auto'}
                            hitSlop={8}
                            className={`w-8 h-8 rounded-full bg-stone-100 items-center justify-center ${saving ? 'opacity-40' : ''}`}
                        >
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    <ScrollView
                        className="px-6 py-4 space-y-4"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: keyboardInset }}
                    >
                        {/* Protected Debt Balance Banner */}
                        <View className="bg-amber-50 p-4 rounded-2xl border border-amber-200/70 mb-2">
                            <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center">
                                    <Lock size={14} color="#B45309" />
                                    <Text className="text-xs font-bold text-amber-900 ml-1.5 uppercase tracking-wider">Balance Protected</Text>
                                </View>
                                <Text className="text-sm font-bold text-stone-900">{formatCurrency(loan.remaining_balance)} left</Text>
                            </View>
                            <Text className="text-[11px] text-amber-800/80 leading-relaxed mt-1">
                                Remaining balance is reduced strictly by recording repayments to ensure your debt payoff calculations stay accurate.
                            </Text>
                        </View>

                        {/* Lender Type Segmented Control */}
                        <View className="mb-2">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Lender Type</Text>
                            <View className="flex-row bg-stone-100 p-1 rounded-2xl border border-stone-200">
                                <Pressable
                                    onPress={() => setLenderType('institution')}
                                    disabled={saving}
                                    className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                                        lenderType === 'institution' ? 'bg-white shadow-sm border border-stone-200/80' : ''
                                    }`}
                                >
                                    <Building2 size={15} color={lenderType === 'institution' ? '#18342B' : '#78716C'} />
                                    <Text
                                        className={`text-xs font-bold ml-1.5 ${lenderType === 'institution' ? 'text-stone-900' : 'text-stone-500'}`}
                                    >
                                        Bank / Institution
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setLenderType('person')}
                                    disabled={saving}
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

                        {/* Lender Selector or Person Name */}
                        {lenderType === 'institution' ? (
                            <View className="mb-3">
                                <SearchableSelectField
                                    label="Lending Institution / Provider"
                                    options={providerOptions}
                                    selectedId={selectedProvider}
                                    onSelect={(opt) => setSelectedProvider(opt.id)}
                                    placeholder="Select provider"
                                    disabled={saving}
                                />
                            </View>
                        ) : (
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-stone-700 mb-1.5">Lender / Person Name *</Text>
                                <TextInput
                                    value={lenderName}
                                    onChangeText={setLenderName}
                                    editable={!saving}
                                    placeholder="e.g. Juan Dela Cruz, Kuya Mark"
                                    placeholderTextColor="#A8A29E"
                                    className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 ${
                                        saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                    }`}
                                />
                            </View>
                        )}

                        {/* Title */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Loan Title *</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                editable={!saving}
                                placeholder="e.g. BPI Auto Loan"
                                placeholderTextColor="#A8A29E"
                                className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 ${
                                    saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                }`}
                            />
                        </View>

                        {/* Principal & Processing Fee */}
                        <View className="bg-stone-100/70 p-3.5 rounded-2xl border border-stone-200 mb-3">
                            <Text className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2">Borrowing Breakdown</Text>
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Principal Borrowed (₱)</Text>
                                    <TextInput
                                        value={principalAmountStr}
                                        onChangeText={(val) => setPrincipalAmountStr(formatMoneyInput(val))}
                                        editable={!saving}
                                        placeholder="₱10,000"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 font-bold bg-white ${
                                            saving ? 'opacity-60' : ''
                                        }`}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Processing Fee (₱)</Text>
                                    <TextInput
                                        value={processingFeeStr}
                                        onChangeText={(val) => setProcessingFeeStr(formatMoneyInput(val))}
                                        editable={!saving}
                                        placeholder="₱300"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 font-bold bg-white ${
                                            saving ? 'opacity-60' : ''
                                        }`}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Tenor / Duration & Origination Date */}
                        <View className="bg-stone-100/70 p-3.5 rounded-2xl border border-stone-200 mb-3">
                            <Text className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2">Timeline & Tenor</Text>
                            <View className="flex-row gap-3 mb-2">
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Origination Date</Text>
                                    <Pressable
                                        onPress={() => setStartDatePickerVisible(true)}
                                        disabled={saving}
                                        className={`rounded-xl px-3 py-2.5 flex-row items-center justify-between border border-stone-200 bg-white ${
                                            saving ? 'opacity-60' : 'active:bg-stone-50'
                                        }`}
                                    >
                                        <Text className="text-xs font-bold text-stone-900" numberOfLines={1}>
                                            {startDateStr ? formatDisplayDate(startDateStr) : 'Set start date'}
                                        </Text>
                                        <Calendar size={14} color="#78716C" />
                                    </Pressable>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Tenor (Months)</Text>
                                    <TextInput
                                        value={termMonthsStr}
                                        onChangeText={setTermMonthsStr}
                                        editable={!saving}
                                        placeholder="e.g. 12"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="number-pad"
                                        className={`border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 font-bold bg-white ${
                                            saving ? 'opacity-60' : ''
                                        }`}
                                    />
                                </View>
                            </View>
                            <View className="flex-row flex-wrap gap-1.5">
                                {TERM_PRESETS.map((preset) => {
                                    const isSelected = termMonthsStr === String(preset);
                                    return (
                                        <Pressable
                                            key={preset}
                                            onPress={() => setTermMonthsStr(String(preset))}
                                            disabled={saving}
                                            className={`px-2.5 py-1 rounded-lg border ${
                                                isSelected ? 'bg-[#18342B] border-[#18342B]' : 'bg-white border-stone-200'
                                            }`}
                                        >
                                            <Text className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-stone-700'}`}>{preset}m</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Due Date & Monthly Payment */}
                        <View className="flex-row space-x-3 mb-3">
                            <View className="flex-1 mr-2">
                                <Text className="text-xs font-bold text-stone-700 mb-1.5">Monthly Payment (₱)</Text>
                                <TextInput
                                    value={monthlyPaymentStr}
                                    onChangeText={(val) => setMonthlyPaymentStr(formatMoneyInput(val))}
                                    editable={!saving}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#A8A29E"
                                    className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 ${
                                        saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                    }`}
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-xs font-bold text-stone-700 mb-1.5">Next Due Date</Text>
                                <Pressable
                                    onPress={() => setDueDatePickerVisible(true)}
                                    disabled={saving}
                                    className={`flex-row items-center justify-between px-4 py-3 rounded-2xl border border-stone-200 ${
                                        saving ? 'bg-stone-100 opacity-60' : 'bg-white active:bg-stone-100'
                                    }`}
                                >
                                    <Text className="text-sm text-stone-900 font-medium" numberOfLines={1}>
                                        {dueDateStr ? formatDisplayDate(dueDateStr) : 'Set date'}
                                    </Text>
                                    <Calendar size={15} color="#78716C" />
                                </Pressable>
                            </View>
                        </View>

                        {/* Early Payoff Cashback Toggle */}
                        <View className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200 mb-3 flex-row items-center justify-between">
                            <View className="flex-1 mr-3">
                                <View className="flex-row items-center">
                                    <Sparkles size={14} color="#0D9488" />
                                    <Text className="text-xs font-bold text-teal-900 ml-1.5">Early Payoff Interest Cashback</Text>
                                </View>
                                <Text className="text-[11px] text-teal-700 mt-0.5 leading-snug">
                                    Eligible for cash refund on remaining months&apos; interest upon early payoff.
                                </Text>
                            </View>
                            <Switch
                                value={hasInterestCashback}
                                onValueChange={setHasInterestCashback}
                                disabled={saving}
                                trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
                                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                            />
                        </View>

                        {/* Notes */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Notes (Optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                editable={!saving}
                                placeholder="Loan reference #, payment schedule, or agreement terms..."
                                placeholderTextColor="#A8A29E"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 min-h-[70px] ${
                                    saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                }`}
                            />
                        </View>

                        {/* Attachment */}
                        <View className="mb-4">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Document Attachment</Text>
                            {attachmentUri ? (
                                <View className="flex-row items-center justify-between bg-white px-4 py-3 rounded-2xl border border-stone-200">
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <Paperclip size={15} color="#18342B" />
                                        <Text className="text-xs text-stone-900 ml-2 font-medium" numberOfLines={1}>
                                            {attachmentName || 'Attachment attached'}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            setAttachmentUri(null);
                                            setAttachmentName(null);
                                        }}
                                        disabled={saving}
                                        hitSlop={8}
                                        className={saving ? 'opacity-40' : ''}
                                    >
                                        <Trash2 size={16} color="#DC2626" />
                                    </Pressable>
                                </View>
                            ) : (
                                <View className="flex-row space-x-2">
                                    <Pressable
                                        onPress={handlePickDocument}
                                        disabled={saving}
                                        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border border-stone-200 mr-2 ${
                                            saving ? 'bg-stone-100 opacity-60' : 'bg-white active:bg-stone-100'
                                        }`}
                                    >
                                        <Paperclip size={15} color="#78716C" />
                                        <Text className="text-xs font-medium text-stone-700 ml-1.5">Pick Document</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={handlePickImage}
                                        disabled={saving}
                                        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border border-stone-200 ${
                                            saving ? 'bg-stone-100 opacity-60' : 'bg-white active:bg-stone-100'
                                        }`}
                                    >
                                        <Camera size={15} color="#78716C" />
                                        <Text className="text-xs font-medium text-stone-700 ml-1.5">Pick Photo</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            className={`bg-[#18342B] py-3.5 rounded-2xl items-center flex-row justify-center mb-6 shadow-xs ${
                                saving ? 'opacity-50' : 'active:opacity-90'
                            }`}
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text className="text-white font-bold text-sm ml-2">{saving ? 'Saving...' : 'Save Loan Details'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            {/* Start Date Picker Modal */}
            <DatePickerModal
                visible={startDatePickerVisible}
                initialDate={startDateStr || new Date().toISOString().split('T')[0]}
                title="Select Origination / Start Date"
                onClose={() => setStartDatePickerVisible(false)}
                onSelectDate={(newDate) => {
                    setStartDateStr(newDate);
                    setStartDatePickerVisible(false);
                }}
            />

            {/* Due Date Picker Modal */}
            <DatePickerModal
                visible={dueDatePickerVisible}
                initialDate={dueDateStr || new Date().toISOString().split('T')[0]}
                title="Select Next Due Date"
                onClose={() => setDueDatePickerVisible(false)}
                onSelectDate={(newDate) => {
                    setDueDateStr(newDate);
                    setDueDatePickerVisible(false);
                }}
            />
        </Modal>
    );
}
