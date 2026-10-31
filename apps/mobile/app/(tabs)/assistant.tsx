import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    Keyboard,
    Dimensions,
    Platform,
    Alert,
    ActivityIndicator,
    type KeyboardEvent,
    type LayoutChangeEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bot, Send, Trash2, Sparkles, Zap, Calendar } from 'lucide-react-native';
import { getDatabase } from '../../src/database/db';
import { evaluateChatPrompt } from '../../src/services/chatEngine';
import { queryGeminiAdvisor, verifyGeminiConnection } from '../../src/services/geminiService';
import {
    saveChatMessage,
    getStoredChatMessages,
    clearChatStorage,
    buildChatTimelineItems,
    type ChatTimelineItem
} from '../../src/services/chatStorageService';
import { ChatMessageBubble, type ChatMessage } from '../../src/components/chat/ChatMessageBubble';
import { ChatTypingIndicator } from '../../src/components/chat/ChatTypingIndicator';
import { PromptSuggestionChips } from '../../src/components/chat/PromptSuggestionChips';
import { computeKeyboardOverlap } from '../../src/utils/keyboard';
import { formatTime12 } from '../../src/utils/formatters';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    sender: 'bot',
    text: `👋 **Welcome! I'm your personal financial assistant.**\n\nUse the toggle at the top to switch between **✨ Gemini AI** (smart online reasoning) and **⚡ Offline Mode** (instant local SQLite engine).\n\nAsk me scenario questions like:\n• **"Can I afford ₱15,000?"**\n• **"How much will I have if I buy a phone for 25k?"**\n• **"How much do I owe right now?"**\n• **"How much in Maya?"**`,
    status: 'info',
    source: 'gemini',
    timestamp: formatTime12(new Date()),
    created_at: new Date().toISOString()
};

export default function AssistantScreen() {
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList<ChatTimelineItem>>(null);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [chatMode, setChatMode] = useState<'gemini' | 'offline'>('gemini');
    const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);

    // Track container bottom Y and active keyboard metrics to position input bar right at the top of the keyboard
    const viewBottomYRef = useRef<number>(Dimensions.get('window').height);
    const keyboardMetricsRef = useRef<{ height: number; screenY: number }>({
        height: 0,
        screenY: 0
    });
    const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

    const recalculateKeyboardOffset = useCallback(() => {
        const windowHeight = Dimensions.get('window').height;
        const overlap = computeKeyboardOverlap({
            viewBottomY: viewBottomYRef.current,
            windowHeight,
            keyboardHeight: keyboardMetricsRef.current.height,
            keyboardScreenY: keyboardMetricsRef.current.screenY
        });
        setKeyboardOffset(overlap);
    }, []);

    useEffect(() => {
        const onKeyboardShow = (event: KeyboardEvent) => {
            keyboardMetricsRef.current = {
                height: event.endCoordinates?.height ?? 0,
                screenY: event.endCoordinates?.screenY ?? 0
            };
            setIsKeyboardVisible(true);
            recalculateKeyboardOffset();
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 80);
        };

        const onKeyboardHide = () => {
            keyboardMetricsRef.current = { height: 0, screenY: 0 };
            setIsKeyboardVisible(false);
            setKeyboardOffset(0);
        };

        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
        const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [recalculateKeyboardOffset]);

    const handleContainerLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const { y, height } = event.nativeEvent.layout;
            viewBottomYRef.current = y + height;
            if (keyboardMetricsRef.current.height > 0) {
                recalculateKeyboardOffset();
            }
        },
        [recalculateKeyboardOffset]
    );

    // Load persisted chat history from SQLite
    const loadChatHistory = useCallback(async () => {
        try {
            const db = await getDatabase();
            const stored = await getStoredChatMessages(db, 100);
            if (stored.length > 0) {
                setMessages(
                    stored.map((m) => ({
                        id: m.id,
                        sender: m.sender,
                        text: m.text,
                        status: m.status,
                        source: m.source,
                        timestamp: m.timestamp,
                        created_at: m.created_at
                    }))
                );
            }
        } catch (err) {
            console.error('Failed to load chat history from SQLite:', err);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadChatHistory();
        }, [loadChatHistory])
    );

    const timelineItems = useMemo(() => buildChatTimelineItems(messages), [messages]);

    const handleSend = async (textToSend?: string) => {
        const prompt = (textToSend || input).trim();
        if (!prompt || loading) return;

        const nowIso = new Date().toISOString();
        const userTimestamp = formatTime12(new Date());

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: prompt,
            timestamp: userTimestamp,
            created_at: nowIso
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const db = await getDatabase();
            // Persist user message to SQLite
            await saveChatMessage(db, userMessage);

            let botMessage: ChatMessage;
            const botCreatedAt = new Date().toISOString();
            const botTimestamp = formatTime12(new Date());

            if (chatMode === 'gemini') {
                // 1. Try Gemini Online AI first when Gemini mode is toggled ON
                try {
                    const geminiRes = await queryGeminiAdvisor(db, prompt, { timeoutMs: 20000, maxRetries: 1 });
                    botMessage = {
                        id: `bot-${Date.now()}`,
                        sender: 'bot',
                        text: geminiRes.text,
                        status: geminiRes.status,
                        source: 'gemini',
                        timestamp: botTimestamp,
                        created_at: botCreatedAt
                    };
                } catch (geminiErr: any) {
                    console.log('Gemini request failed/timed out, falling back to offline engine:', geminiErr);

                    // 2. Fallback seamlessly to local offline chatEngine
                    const offlineRes = await evaluateChatPrompt(db, prompt);
                    const reasonText = geminiErr?.message ? ` (${geminiErr.message})` : '';
                    botMessage = {
                        id: `bot-${Date.now()}`,
                        sender: 'bot',
                        text: `${offlineRes.text}\n\n*(⚡ Offline fallback: Gemini AI was unreachable${reasonText})*`,
                        status: offlineRes.status,
                        source: 'offline',
                        timestamp: botTimestamp,
                        created_at: botCreatedAt
                    };
                }
            } else {
                // Offline mode explicitly selected by user
                const offlineRes = await evaluateChatPrompt(db, prompt);
                botMessage = {
                    id: `bot-${Date.now()}`,
                    sender: 'bot',
                    text: offlineRes.text,
                    status: offlineRes.status,
                    source: 'offline',
                    timestamp: botTimestamp,
                    created_at: botCreatedAt
                };
            }

            // Persist bot message to SQLite
            await saveChatMessage(db, botMessage);
            setMessages((prev) => [...prev, botMessage]);
        } catch (err: any) {
            console.error('Critical assistant failure:', err);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                sender: 'bot',
                text: `⚠️ An error occurred while computing your query: ${err?.message || 'Database unavailable'}. Please try again.`,
                status: 'tight',
                source: 'offline',
                timestamp: formatTime12(new Date()),
                created_at: new Date().toISOString()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = () => {
        Alert.alert('Clear Conversation', 'Are you sure you want to clear your conversation history? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const db = await getDatabase();
                        await clearChatStorage(db);
                        setMessages([
                            {
                                id: `welcome-${Date.now()}`,
                                sender: 'bot',
                                text: `✨ Conversation history cleared. Ask me a question or tap a prompt chip below!`,
                                status: 'info',
                                source: chatMode,
                                timestamp: formatTime12(new Date()),
                                created_at: new Date().toISOString()
                            }
                        ]);
                    } catch (err) {
                        console.error('Failed to clear chat storage:', err);
                    }
                }
            }
        ]);
    };

    const handleSwitchMode = async (targetMode: 'gemini' | 'offline') => {
        if (targetMode === chatMode || loading || isConnecting) return;

        if (targetMode === 'offline') {
            setChatMode('offline');
            return;
        }

        // Switching to Gemini AI: test connectivity first to give transparent feedback
        setIsConnecting(true);
        try {
            const check = await verifyGeminiConnection();
            if (check.ok) {
                setChatMode('gemini');
            } else {
                Alert.alert(
                    'Gemini AI Unavailable',
                    `Unable to connect to Gemini AI servers (${check.error || 'Internet unreachable'}). Remaining in Offline Engine mode.`,
                    [{ text: 'OK' }]
                );
            }
        } catch (err: any) {
            Alert.alert(
                'Connection Check Failed',
                `Failed to reach Gemini AI: ${err?.message || 'Network error'}. Remaining in Offline Engine mode.`,
                [{ text: 'OK' }]
            );
        } finally {
            setIsConnecting(false);
        }
    };

    // Scroll to bottom when messages update or when loading state starts
    useEffect(() => {
        const timer = setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [timelineItems.length, loading]);

    return (
        <View onLayout={handleContainerLayout} className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            <View className="flex-1" style={{ paddingBottom: keyboardOffset }}>
                {/* Header with Engine Mode Toggle Underneath Title */}
                <View className="px-4 pt-3 pb-3 border-b border-stone-200/80 bg-white">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                            <View className="w-9 h-9 rounded-full bg-[#BBD583] items-center justify-center shadow-xs">
                                <Bot size={20} color="#18342B" />
                            </View>
                            <View className="ml-2.5 flex-1">
                                <Text className="text-base font-bold text-stone-900">PocketBot</Text>
                                <Text className="text-[11px] text-stone-400" numberOfLines={1}>
                                    {isConnecting
                                        ? 'Connecting to Gemini AI servers...'
                                        : chatMode === 'gemini'
                                          ? 'Gemini AI active (auto-offline fallback)'
                                          : 'Offline SQLite engine only'}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={handleClearHistory}
                            disabled={loading || isConnecting}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Clear conversation history"
                            className={`p-2 rounded-full active:bg-stone-100 ${loading || isConnecting ? 'opacity-40' : ''}`}
                        >
                            <Trash2 size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    {/* Interactive Gemini AI vs Offline Toggle Placed Underneath Title */}
                    <View className="flex-row items-center mt-2.5 pt-2 border-t border-stone-100">
                        <Text className="text-[11px] font-semibold text-stone-500 mr-2">Mode:</Text>
                        <View className="flex-row bg-stone-100 p-0.5 rounded-full border border-stone-200 flex-1 max-w-[240px]">
                            <Pressable
                                onPress={() => handleSwitchMode('gemini')}
                                disabled={loading || isConnecting}
                                accessibilityRole="button"
                                accessibilityLabel="Switch to Gemini AI mode"
                                className={`flex-1 flex-row items-center justify-center px-3 py-1.5 rounded-full ${
                                    chatMode === 'gemini' ? 'bg-[#18342B]' : ''
                                } ${isConnecting ? 'opacity-90' : ''}`}
                            >
                                {isConnecting ? (
                                    <ActivityIndicator size="small" color={chatMode === 'gemini' ? '#BBD583' : '#18342B'} />
                                ) : (
                                    <Sparkles size={12} color={chatMode === 'gemini' ? '#BBD583' : '#78716C'} />
                                )}
                                <Text className={`text-[11px] font-bold ml-1.5 ${chatMode === 'gemini' ? 'text-white' : 'text-stone-600'}`}>
                                    {isConnecting ? 'Connecting...' : 'Gemini AI'}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => handleSwitchMode('offline')}
                                disabled={loading || isConnecting}
                                accessibilityRole="button"
                                accessibilityLabel="Switch to Offline engine mode"
                                className={`flex-1 flex-row items-center justify-center px-3 py-1.5 rounded-full ${
                                    chatMode === 'offline' ? 'bg-[#18342B]' : ''
                                } ${isConnecting ? 'opacity-50' : ''}`}
                            >
                                <Zap size={12} color={chatMode === 'offline' ? '#BBD583' : '#78716C'} />
                                <Text className={`text-[11px] font-bold ml-1.5 ${chatMode === 'offline' ? 'text-white' : 'text-stone-600'}`}>
                                    Offline
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Messages Feed Grouped by Day */}
                <FlatList
                    ref={listRef}
                    data={timelineItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        if (item.type === 'date_header') {
                            return (
                                <View className="items-center my-3 px-4">
                                    <View className="flex-row items-center bg-stone-200/75 px-3 py-1 rounded-full">
                                        <Calendar size={11} color="#57534E" />
                                        <Text className="text-[11px] font-bold text-stone-600 ml-1.5">{item.label}</Text>
                                    </View>
                                </View>
                            );
                        }
                        return <ChatMessageBubble message={item.message} />;
                    }}
                    ListFooterComponent={loading ? <ChatTypingIndicator mode={chatMode} /> : undefined}
                    contentContainerStyle={{ paddingVertical: 14 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                />

                {/* Prompt Suggestion Chips */}
                <PromptSuggestionChips onSelectPrompt={(p) => handleSend(p)} disabled={loading || isConnecting} />

                {/* Input Bar */}
                <View
                    className="px-4 py-2.5 bg-white border-t border-stone-200/80 flex-row items-end space-x-2"
                    style={{
                        paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12)
                    }}
                >
                    <View className="flex-1 bg-stone-100 rounded-2xl px-4 py-2 border border-stone-200/80 mr-2 justify-center">
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            editable={!loading && !isConnecting}
                            multiline={true}
                            textAlignVertical="center"
                            scrollEnabled={true}
                            placeholder={
                                isConnecting
                                    ? 'Connecting to Gemini AI servers, please wait...'
                                    : loading
                                      ? chatMode === 'gemini'
                                          ? 'Gemini AI is generating response...'
                                          : 'PocketBot is evaluating records...'
                                      : chatMode === 'gemini'
                                        ? "Ask Gemini AI 'Can I afford ₱15,000?'..."
                                        : "Ask Offline Engine 'Can I afford ₱15,000?'..."
                            }
                            placeholderTextColor="#A8A29E"
                            className={`text-sm leading-5 p-0 ${loading || isConnecting ? 'text-stone-400' : 'text-stone-900'}`}
                            style={{
                                maxHeight: 120,
                                minHeight: 24,
                                paddingTop: Platform.OS === 'android' ? 2 : 0,
                                paddingBottom: Platform.OS === 'android' ? 2 : 0
                            }}
                        />
                    </View>

                    <Pressable
                        onPress={() => handleSend()}
                        disabled={!input.trim() || loading || isConnecting}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={isConnecting ? 'Connecting to Gemini AI...' : loading ? 'Generating response...' : 'Send message'}
                        className={`w-11 h-11 rounded-2xl items-center justify-center shadow-xs mb-0.5 ${
                            loading || isConnecting
                                ? 'bg-stone-100 border border-stone-200'
                                : input.trim()
                                  ? 'bg-[#18342B] active:opacity-90'
                                  : 'bg-stone-200'
                        }`}
                    >
                        {loading || isConnecting ? (
                            <ActivityIndicator size="small" color="#18342B" />
                        ) : (
                            <Send size={18} color={input.trim() ? '#BBD583' : '#A8A29E'} />
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
