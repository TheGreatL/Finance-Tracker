import React from 'react';
import { View, Text } from 'react-native';
import { Bot, CheckCircle2, AlertTriangle, XCircle, Info, Sparkles, Zap } from 'lucide-react-native';
import type { ChatStatus } from '../../services/chatEngine';
import { formatTime12 } from '../../utils/formatters';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    status?: ChatStatus;
    source?: 'gemini' | 'offline';
    timestamp: string;
    created_at?: string;
}

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

/**
 * Formats basic markdown bolding (`**text**`) into React Native Text elements.
 */
function FormattedText({ text, isUser }: { text: string; isUser: boolean }) {
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return (
        <Text className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-stone-800'}`}>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const content = part.slice(2, -2);
                    return (
                        <Text key={index} className={`font-bold ${isUser ? 'text-white' : 'text-stone-900'}`}>
                            {content}
                        </Text>
                    );
                }
                return <Text key={index}>{part}</Text>;
            })}
        </Text>
    );
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
    const isUser = message.sender === 'user';

    if (isUser) {
        return (
            <View className="flex-row justify-end mb-3 px-4">
                <View className="max-w-[82%] bg-[#18342B] px-4 py-3 rounded-2xl rounded-br-xs shadow-xs">
                    <FormattedText text={message.text} isUser={true} />
                    <Text className="text-[10px] text-stone-300/80 text-right mt-1">{formatTime12(message.created_at || message.timestamp)}</Text>
                </View>
            </View>
        );
    }

    // Bot message status indicator border & background accents
    let badgeBorder = 'border-stone-200/90';
    let badgeBg = 'bg-white';
    let StatusIcon = Info;
    let iconColor = '#78716C';

    if (message.status === 'safe') {
        badgeBorder = 'border-emerald-200';
        StatusIcon = CheckCircle2;
        iconColor = '#059669';
    } else if (message.status === 'tight') {
        badgeBorder = 'border-amber-200';
        badgeBg = 'bg-amber-50/30';
        StatusIcon = AlertTriangle;
        iconColor = '#D97706';
    } else if (message.status === 'unaffordable') {
        badgeBorder = 'border-rose-200';
        badgeBg = 'bg-rose-50/30';
        StatusIcon = XCircle;
        iconColor = '#E11D48';
    }

    const isGemini = message.source === 'gemini';

    return (
        <View className="flex-row items-start mb-3.5 px-4">
            {/* Bot Avatar */}
            <View className="w-8 h-8 rounded-full bg-[#BBD583] items-center justify-center mr-2.5 mt-0.5 shadow-xs">
                <Bot size={18} color="#18342B" />
            </View>

            {/* Bubble Content */}
            <View className={`max-w-[82%] ${badgeBg} px-4 py-3 rounded-2xl rounded-tl-xs border ${badgeBorder} shadow-xs`}>
                <View className="flex-row items-center justify-between mb-1.5 pb-1 border-b border-stone-100">
                    <View className="flex-row items-center space-x-1.5">
                        <Text className="text-xs font-bold text-[#18342B]">PocketBot</Text>
                        {isGemini ? (
                            <View className="bg-[#BBD583]/50 px-1.5 py-0.5 rounded-full ml-1.5 flex-row items-center">
                                <Sparkles size={9} color="#18342B" />
                                <Text className="text-[9px] font-bold text-[#18342B] ml-1">Gemini AI</Text>
                            </View>
                        ) : (
                            <View className="bg-emerald-100/90 px-1.5 py-0.5 rounded-full ml-1.5 flex-row items-center">
                                <Zap size={9} color="#065F46" />
                                <Text className="text-[9px] font-semibold text-emerald-800 ml-1">Offline Engine</Text>
                            </View>
                        )}
                    </View>
                    <StatusIcon size={14} color={iconColor} />
                </View>

                <FormattedText text={message.text} isUser={false} />

                <Text className="text-[10px] text-stone-400 mt-2 text-right">{formatTime12(message.created_at || message.timestamp)}</Text>
            </View>
        </View>
    );
}
