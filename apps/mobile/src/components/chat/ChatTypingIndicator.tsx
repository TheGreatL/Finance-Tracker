import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Bot, Sparkles, Zap } from 'lucide-react-native';

export type ChatEngineMode = 'gemini' | 'offline';

export interface ChatTypingIndicatorProps {
    mode?: ChatEngineMode;
    statusText?: string;
}

/**
 * Returns dynamic status text representing what the engine is doing.
 */
export function getTypingStatusText(mode: ChatEngineMode): string {
    return mode === 'gemini' ? 'Gemini AI is analyzing & generating response...' : 'PocketBot is evaluating SQLite records...';
}

/**
 * Visual indicator shown while the AI or offline bot is actively generating a response.
 * Displays PocketBot avatar, engine badge, animated bouncing wave dots, and status description.
 */
export function ChatTypingIndicator({ mode = 'gemini', statusText }: ChatTypingIndicatorProps) {
    const isGemini = mode === 'gemini';
    const displayStatus = statusText || getTypingStatusText(mode);

    // Staggered animated values for 3 bouncing dots
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createDotAnimation = (animValue: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: 350,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: 350,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.delay(Math.max(0, 450 - delay))
                ])
            );
        };

        const anim1 = createDotAnimation(dot1, 0);
        const anim2 = createDotAnimation(dot2, 150);
        const anim3 = createDotAnimation(dot3, 300);

        anim1.start();
        anim2.start();
        anim3.start();

        return () => {
            anim1.stop();
            anim2.stop();
            anim3.stop();
        };
    }, [dot1, dot2, dot3]);

    const getDotStyle = (animValue: Animated.Value) => {
        const translateY = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4]
        });
        const opacity = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1]
        });
        const scale = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1.15]
        });

        return {
            opacity,
            transform: [{ translateY }, { scale }]
        };
    };

    return (
        <View className="flex-row items-start mb-3.5 px-4">
            {/* Bot Avatar */}
            <View className="w-8 h-8 rounded-full bg-[#BBD583] items-center justify-center mr-2.5 mt-0.5 shadow-xs">
                <Bot size={18} color="#18342B" />
            </View>

            {/* Bubble Content */}
            <View className="bg-white px-4 py-3 rounded-2xl rounded-tl-xs border border-stone-200/90 shadow-xs max-w-[85%]">
                {/* Header Tag */}
                <View className="flex-row items-center space-x-1.5 mb-2 pb-1 border-b border-stone-100">
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

                {/* Animated Typing Dots + Status Caption */}
                <View className="flex-row items-center py-1">
                    <View className="flex-row items-center h-5 mr-2.5 px-0.5">
                        <Animated.View style={getDotStyle(dot1)} className="w-2 h-2 rounded-full bg-[#18342B] mr-1.5" />
                        <Animated.View style={getDotStyle(dot2)} className="w-2 h-2 rounded-full bg-[#18342B] mr-1.5" />
                        <Animated.View style={getDotStyle(dot3)} className="w-2 h-2 rounded-full bg-[#18342B]" />
                    </View>
                    <Text className="text-xs text-stone-500 font-medium italic">{displayStatus}</Text>
                </View>
            </View>
        </View>
    );
}
