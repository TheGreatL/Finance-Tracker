# Multiline Chat Input Design Specification

**Created:** 2026-10-31 15:44 (Local Time)

## 1. Problem Statement & Motivation

In the financial assistant / chatbot screen ([`apps/mobile/app/(tabs)/assistant.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx>)), users interact with both the Gemini GenAI model and the offline SQLite finance engine.

Currently, the chat `TextInput` is configured as a single-line input field. When composing complex or multi-part financial inquiries (e.g., asking for budget breakdown scenarios, explaining multiple upcoming purchases, or providing detailed constraints), the text scrolls horizontally off-screen. Users cannot see what they previously typed or structure their questions with line breaks, leading to poor usability for longer prompts.

## 2. User Experience Goals

1. **Dynamic Expansion**: The input field expands vertically as the user types, gracefully growing from 1 line to up to 4–5 lines (`maxHeight: 120`).
2. **Scrollable for Extended Text**: When a prompt exceeds 4–5 lines, internal vertical scrolling is enabled so the input box doesn't dominate the screen while preserving visibility of the conversation history.
3. **Aligned Action Controls**: The Send button aligns to the bottom-right (`items-end`), preserving standard chat ergonomics (like WhatsApp, iMessage, and ChatGPT mobile).
4. **Platform Consistency**: Proper `textAlignVertical="center"` and platform-specific padding on Android to eliminate unwanted vertical jumping or clipping.

---

## 3. Component Architecture & Implementation

### 3.1. Input Bar Updates in `assistant.tsx`

```tsx
{
    /* Input Bar */
}
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
            multiline={true}
            textAlignVertical="center"
            scrollEnabled={true}
            placeholder={chatMode === 'gemini' ? "Ask Gemini AI 'Can I afford ₱15,000?'..." : "Ask Offline Engine 'Can I afford ₱15,000?'..."}
            placeholderTextColor="#A8A29E"
            className="text-sm text-stone-900 p-0 leading-5"
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
        disabled={!input.trim() || loading}
        hitSlop={8}
        className={`w-11 h-11 rounded-2xl items-center justify-center shadow-xs mb-0.5 ${
            input.trim() && !loading ? 'bg-[#18342B] active:opacity-90' : 'bg-stone-200'
        }`}
    >
        <Send size={18} color={input.trim() && !loading ? '#BBD583' : '#A8A29E'} />
    </Pressable>
</View>;
```

---

## 4. Verification Plan

1. Run `npm run typecheck` across all workspaces.
2. Run `npm run test --workspace=@finance-tracker/mobile`.
3. Format with Prettier.
