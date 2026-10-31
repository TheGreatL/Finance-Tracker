import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Search, X, Check, ChevronDown } from 'lucide-react-native';

export interface SelectOption {
    id: string;
    label: string;
    subtitle?: string;
    badge?: string;
    keywords?: string;
    icon?: React.ReactNode;
}

/**
 * Filters a list of SelectOption items case-insensitively across label, subtitle, badge, and keywords.
 */
export function filterSelectOptions(options: SelectOption[], query: string): SelectOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    return options.filter((opt) => {
        const inLabel = opt.label.toLowerCase().includes(q);
        const inSubtitle = opt.subtitle?.toLowerCase().includes(q) ?? false;
        const inBadge = opt.badge?.toLowerCase().includes(q) ?? false;
        const inKeywords = opt.keywords?.toLowerCase().includes(q) ?? false;
        const inId = opt.id.toLowerCase().includes(q);
        return inLabel || inSubtitle || inBadge || inKeywords || inId;
    });
}

interface SearchableSelectModalProps {
    visible: boolean;
    title: string;
    searchPlaceholder?: string;
    options: SelectOption[];
    selectedId?: string;
    onSelect: (option: SelectOption) => void;
    onClose: () => void;
}

export function SearchableSelectModal({
    visible,
    title,
    searchPlaceholder = 'Search...',
    options,
    selectedId,
    onSelect,
    onClose
}: SearchableSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
        }
    }, [visible]);

    const filteredOptions = useMemo(() => filterSelectOptions(options, searchQuery), [options, searchQuery]);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior="padding" className="flex-1 bg-black/60 items-center justify-center p-4">
                <View className="bg-white rounded-3xl w-full max-w-sm max-h-[80%] p-5 border border-stone-100 shadow-2xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                        <Text className="text-base font-bold text-stone-900">{title}</Text>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close dropdown"
                            hitSlop={8}
                            className="w-7 h-7 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200"
                        >
                            <X size={15} color="#78716C" />
                        </Pressable>
                    </View>

                    {/* Search Field */}
                    <View className="flex-row items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 my-3">
                        <Search size={15} color="#78716C" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={searchPlaceholder}
                            placeholderTextColor="#A8A29E"
                            autoCorrect={false}
                            className="flex-1 ml-2 text-xs text-stone-900 font-medium py-0"
                        />
                        {searchQuery.length > 0 ? (
                            <Pressable
                                onPress={() => setSearchQuery('')}
                                hitSlop={8}
                                className="w-5 h-5 rounded-full bg-stone-200 items-center justify-center"
                            >
                                <X size={11} color="#57534E" />
                            </Pressable>
                        ) : null}
                    </View>

                    {/* Options List */}
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="max-h-80">
                        {filteredOptions.length === 0 ? (
                            <View className="py-8 items-center justify-center">
                                <Text className="text-xs font-semibold text-stone-500">No matches found for &ldquo;{searchQuery}&rdquo;</Text>
                            </View>
                        ) : (
                            filteredOptions.map((item) => {
                                const isSelected = item.id === selectedId;
                                return (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => {
                                            onSelect(item);
                                            onClose();
                                        }}
                                        className={`flex-row items-center justify-between px-3.5 py-3 rounded-2xl mb-1.5 border ${
                                            isSelected ? 'bg-emerald-50/90 border-emerald-300' : 'bg-white border-stone-100 active:bg-stone-50'
                                        }`}
                                    >
                                        <View className="flex-row items-center flex-1 mr-2">
                                            {item.icon ? <View className="mr-3">{item.icon}</View> : null}
                                            <View className="flex-1">
                                                <Text
                                                    className={`text-sm font-bold ${isSelected ? 'text-[#18342B]' : 'text-stone-900'}`}
                                                    numberOfLines={1}
                                                >
                                                    {item.label}
                                                </Text>
                                                {item.subtitle ? (
                                                    <Text className="text-[11px] text-stone-500 font-medium mt-0.5" numberOfLines={1}>
                                                        {item.subtitle}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>

                                        <View className="flex-row items-center">
                                            {item.badge ? (
                                                <Text className={`text-xs font-bold mr-2 ${isSelected ? 'text-[#18342B]' : 'text-stone-600'}`}>
                                                    {item.badge}
                                                </Text>
                                            ) : null}
                                            {isSelected ? (
                                                <View className="w-5 h-5 rounded-full bg-[#18342B] items-center justify-center">
                                                    <Check size={12} color="#BBD583" />
                                                </View>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

interface SearchableSelectFieldProps {
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    modalTitle?: string;
    options: SelectOption[];
    selectedId?: string;
    onSelect: (option: SelectOption) => void;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelectField({
    label,
    placeholder = 'Select an option...',
    searchPlaceholder = 'Search...',
    modalTitle = 'Select Option',
    options,
    selectedId,
    onSelect,
    className = 'mb-4',
    disabled = false
}: SearchableSelectFieldProps) {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedOption = useMemo(() => options.find((o) => o.id === selectedId), [options, selectedId]);

    return (
        <View className={className}>
            {label ? <Text className="text-xs font-medium text-stone-600 mb-1.5">{label}</Text> : null}

            <Pressable
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={label || modalTitle}
                className={`border rounded-xl px-3.5 py-3 flex-row items-center justify-between ${
                    disabled ? 'bg-stone-100 border-stone-200 opacity-60' : 'bg-stone-50 border-stone-200 active:bg-stone-100'
                }`}
            >
                {selectedOption ? (
                    <View className="flex-row items-center flex-1 mr-2">
                        {selectedOption.icon ? <View className="mr-2.5">{selectedOption.icon}</View> : null}
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                                {selectedOption.label}
                            </Text>
                            {selectedOption.subtitle ? (
                                <Text className="text-[11px] text-stone-500 font-medium" numberOfLines={1}>
                                    {selectedOption.subtitle}
                                </Text>
                            ) : null}
                        </View>
                        {selectedOption.badge ? <Text className="text-xs font-bold text-[#18342B] ml-2">{selectedOption.badge}</Text> : null}
                    </View>
                ) : (
                    <Text className="text-sm text-stone-400 flex-1">{placeholder}</Text>
                )}

                <ChevronDown size={16} color="#78716C" />
            </Pressable>

            <SearchableSelectModal
                visible={modalVisible}
                title={modalTitle}
                searchPlaceholder={searchPlaceholder}
                options={options}
                selectedId={selectedId}
                onSelect={onSelect}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}
