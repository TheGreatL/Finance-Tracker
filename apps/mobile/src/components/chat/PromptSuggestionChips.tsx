import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface PromptSuggestionChipsProps {
    onSelectPrompt: (prompt: string) => void;
    disabled?: boolean;
}

const DEFAULT_SUGGESTIONS = [
    'Can I afford ₱5,000?',
    'How much will I have if I spend 3k?',
    'How much do I owe right now?',
    'Total cash balance',
    'How much in Maya?',
    'How much in GCash?'
];

export function PromptSuggestionChips({ onSelectPrompt, disabled }: PromptSuggestionChipsProps) {
    return (
        <View className="py-2 border-t border-stone-200/60 bg-stone-50">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                <View className="flex-row items-center space-x-2">
                    <View className="flex-row items-center bg-stone-200/70 px-2 py-1 rounded-lg mr-1.5">
                        <Sparkles size={12} color="#18342B" />
                        <Text className="text-[11px] font-bold text-[#18342B] ml-1">Prompts:</Text>
                    </View>
                    {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
                        <Pressable
                            key={index}
                            onPress={() => !disabled && onSelectPrompt(suggestion)}
                            disabled={disabled}
                            hitSlop={6}
                            className={`bg-white border border-stone-200 px-3 py-1.5 rounded-full mr-2 shadow-xs ${
                                disabled ? 'opacity-40' : 'active:bg-stone-100 active:scale-98'
                            }`}
                        >
                            <Text className={`text-xs font-semibold ${disabled ? 'text-stone-400' : 'text-stone-700'}`}>{suggestion}</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
