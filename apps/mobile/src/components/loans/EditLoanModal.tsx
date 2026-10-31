import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { X, Lock, Paperclip, Camera, Calendar, Check, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { LoanRecord } from '../../types/database';
import { INSTITUTION_OPTIONS, getInstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { saveAttachment } from '../../utils/fileStorage';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatCurrency } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface EditLoanModalProps {
    visible: boolean;
    loan: LoanRecord | null;
    onClose: () => void;
    onSave: (
        loanId: string,
        updates: {
            title: string;
            institutionId: string;
            dueDate: string;
            monthlyPayment: number;
            notes?: string;
            attachmentPath?: string;
            attachmentName?: string;
        }
    ) => Promise<void>;
}

export function EditLoanModal({ visible, loan, onClose, onSave }: EditLoanModalProps) {
    const [selectedProvider, setSelectedProvider] = useState<string>('billease');
    const [title, setTitle] = useState('');
    const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
    const [dueDateStr, setDueDateStr] = useState('');
    const [notes, setNotes] = useState('');
    const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);

    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (loan) {
            setSelectedProvider(loan.institution_code || loan.institution_id || 'billease');
            setTitle(loan.title || '');
            setMonthlyPaymentStr(loan.monthly_payment ? loan.monthly_payment.toString() : '');
            setDueDateStr(loan.due_date || '');
            setNotes(loan.notes || '');
            setAttachmentUri(loan.attachment_path || null);
            setAttachmentName(loan.attachment_name || (loan.attachment_path ? 'Attached Document' : null));
        }
    }, [loan]);

    if (!loan) return null;

    const providerOptions: SelectOption[] = INSTITUTION_OPTIONS.map((item) => ({
        id: item.code,
        label: item.name,
        subtitle: item.type.toUpperCase()
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
        const monthlyPayment = parseFloat(monthlyPaymentStr.replace(/,/g, ''));
        if (isNaN(monthlyPayment) || monthlyPayment < 0) {
            Alert.alert('Invalid Payment', 'Please enter a valid monthly payment amount.');
            return;
        }

        try {
            setSaving(true);
            await onSave(loan.id, {
                title: title.trim(),
                institutionId: selectedProvider,
                dueDate: dueDateStr,
                monthlyPayment,
                notes: notes.trim(),
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
                <View className="bg-stone-50 rounded-t-3xl max-h-[90%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-bold text-stone-900">Edit Loan Details</Text>
                            <Text className="text-xs text-stone-500">Update loan terms and notes</Text>
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
                                <Text className="text-sm font-extrabold text-stone-900">{formatCurrency(loan.remaining_balance)} left</Text>
                            </View>
                            <Text className="text-[11px] text-amber-800/80 leading-relaxed mt-1">
                                Remaining balance is reduced strictly by recording repayments to ensure your debt payoff calculations stay accurate.
                            </Text>
                        </View>

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

                        {/* Provider Select */}
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

                        {/* Due Date & Monthly Payment */}
                        <View className="flex-row space-x-3 mb-3">
                            <View className="flex-1 mr-2">
                                <Text className="text-xs font-bold text-stone-700 mb-1.5">Monthly Payment (₱)</Text>
                                <TextInput
                                    value={monthlyPaymentStr}
                                    onChangeText={setMonthlyPaymentStr}
                                    editable={!saving}
                                    keyboardType="numeric"
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
                                    onPress={() => setDatePickerVisible(true)}
                                    disabled={saving}
                                    className={`flex-row items-center justify-between px-4 py-3 rounded-2xl border border-stone-200 ${
                                        saving ? 'bg-stone-100 opacity-60' : 'bg-white active:bg-stone-100'
                                    }`}
                                >
                                    <Text className="text-sm text-stone-900 font-medium" numberOfLines={1}>
                                        {dueDateStr || 'Set date'}
                                    </Text>
                                    <Calendar size={15} color="#78716C" />
                                </Pressable>
                            </View>
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

            <DatePickerModal
                visible={datePickerVisible}
                initialDate={dueDateStr || new Date().toISOString().split('T')[0]}
                onClose={() => setDatePickerVisible(false)}
                onSelectDate={(newDate) => {
                    setDueDateStr(newDate);
                    setDatePickerVisible(false);
                }}
            />
        </Modal>
    );
}
