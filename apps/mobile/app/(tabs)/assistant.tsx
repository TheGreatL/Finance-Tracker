import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bot, Send, Trash2, Sparkles, ShieldCheck } from 'lucide-react-native';
import { getDatabase } from '../../src/database/db';
import { evaluateChatPrompt } from '../../src/services/chatEngine';
import { queryGeminiAdvisor } from '../../src/services/geminiService';
import {
  saveChatMessage,
  getStoredChatMessages,
  clearChatStorage,
} from '../../src/services/chatStorageService';
import {
  ChatMessageBubble,
  type ChatMessage,
} from '../../src/components/chat/ChatMessageBubble';
import { PromptSuggestionChips } from '../../src/components/chat/PromptSuggestionChips';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: `👋 **Welcome! I'm your personal financial assistant.**\n\nI combine **Google Gemini AI** for smart financial reasoning when online, with an **instant offline calculation engine** when you're without internet.\n\nAsk me scenario questions like:\n• **"Can I afford ₱15,000?"**\n• **"How much will I have if I buy a phone for 25k?"**\n• **"How much do I owe right now?"**\n• **"How much in Maya?"**`,
  status: 'info',
  source: 'gemini',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);

  // Load persisted chat history from SQLite
  const loadChatHistory = useCallback(async () => {
    try {
      const db = await getDatabase();
      const stored = await getStoredChatMessages(db, 60);
      if (stored.length > 0) {
        setMessages(
          stored.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            status: m.status,
            source: m.source,
            timestamp: m.timestamp,
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

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    const userTimestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const db = await getDatabase();
      // Persist user message to SQLite
      await saveChatMessage(db, userMessage);

      let botMessage: ChatMessage;

      // 1. Try Gemini Online AI first
      try {
        const geminiRes = await queryGeminiAdvisor(db, prompt, { timeoutMs: 8000 });
        botMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: geminiRes.text,
          status: geminiRes.status,
          source: 'gemini',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } catch (geminiErr) {
        console.log('Gemini request failed/timed out, falling back to offline engine:', geminiErr);

        // 2. Fallback seamlessly to local offline chatEngine
        const offlineRes = await evaluateChatPrompt(db, prompt);
        botMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: offlineRes.text,
          status: offlineRes.status,
          source: 'offline',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear your conversation history? This cannot be undone.',
      [
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
                  source: 'gemini',
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
              ]);
            } catch (err) {
              console.error('Failed to clear chat storage:', err);
            }
          },
        },
      ]
    );
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-stone-50"
      style={{ paddingTop: Math.max(insets.top, 12) }}>
      {/* Header */}
      <View className="px-5 py-3 border-b border-stone-200/80 bg-white flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-9 h-9 rounded-full bg-[#BBD583] items-center justify-center shadow-xs">
            <Bot size={20} color="#18342B" />
          </View>
          <View className="ml-2">
            <View className="flex-row items-center">
              <Text className="text-base font-bold text-stone-900">PocketBot</Text>
              <View className="flex-row items-center bg-emerald-100/70 px-1.5 py-0.5 rounded-full ml-2">
                <Sparkles size={10} color="#065F46" />
                <Text className="text-[10px] font-semibold text-emerald-800 ml-0.5">
                  Gemini + Offline
                </Text>
              </View>
            </View>
            <Text className="text-xs text-stone-400">Smart Financial Advisor</Text>
          </View>
        </View>

        <Pressable
          onPress={handleClearHistory}
          hitSlop={8}
          className="p-2 rounded-full active:bg-stone-100">
          <Trash2 size={18} color="#78716C" />
        </Pressable>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessageBubble message={item} />}
        contentContainerStyle={{ paddingVertical: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Prompt Suggestion Chips */}
      <PromptSuggestionChips onSelectPrompt={(p) => handleSend(p)} />

      {/* Input Bar */}
      <View
        className="px-4 py-2.5 bg-white border-t border-stone-200/80 flex-row items-center space-x-2"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View className="flex-1 bg-stone-100 rounded-2xl px-4 py-2.5 flex-row items-center border border-stone-200/80 mr-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask 'Can I afford ₱15,000?'..."
            placeholderTextColor="#A8A29E"
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            className="flex-1 text-sm text-stone-900 p-0"
          />
        </View>

        <Pressable
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
          hitSlop={8}
          className={`w-11 h-11 rounded-2xl items-center justify-center shadow-xs ${
            input.trim() && !loading ? 'bg-[#18342B] active:opacity-90' : 'bg-stone-200'
          }`}>
          <Send size={18} color={input.trim() && !loading ? '#BBD583' : '#A8A29E'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
