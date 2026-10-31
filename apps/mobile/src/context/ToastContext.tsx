import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react-native';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastAction {
    label: string;
    onPress: () => void;
}

export interface ToastOptions {
    message: string;
    type?: ToastType;
    action?: ToastAction;
    durationMs?: number;
}

export interface ToastContextValue {
    showToast: (options: ToastOptions | string) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function normalizeToastOptions(options: ToastOptions | string): ToastOptions {
    if (typeof options === 'string') {
        return { message: options, type: 'success' };
    }
    return { type: 'success', ...options };
}

export function computeToastDuration(options: ToastOptions): number {
    return options.durationMs || (options.action ? 4500 : 3200);
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
    const animValue = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const hideToast = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        Animated.timing(animValue, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true
        }).start(() => {
            setCurrentToast(null);
        });
    }, [animValue]);

    const showToast = useCallback(
        (options: ToastOptions | string) => {
            const config = normalizeToastOptions(options);

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            setCurrentToast(config);
            animValue.setValue(0);

            Animated.spring(animValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 80,
                friction: 10
            }).start();

            const duration = computeToastDuration(config);
            timerRef.current = setTimeout(() => {
                hideToast();
            }, duration);
        },
        [animValue, hideToast]
    );

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const opacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0]
    });

    // Position toast just above the bottom tab bar (default height ~56 + insets)
    const bottomPosition = Math.max(insets.bottom, 12) + 68;

    const renderIcon = (type: ToastType = 'success') => {
        switch (type) {
            case 'error':
                return <AlertCircle size={16} color="#F87171" />;
            case 'info':
                return <Info size={16} color="#BBD583" />;
            case 'success':
            default:
                return <CheckCircle2 size={16} color="#BBD583" />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            {currentToast ? (
                <View
                    pointerEvents="box-none"
                    style={{ position: 'absolute', bottom: bottomPosition, left: 16, right: 16, alignItems: 'center', zIndex: 99999 }}
                >
                    <Animated.View
                        style={{
                            opacity,
                            transform: [{ translateY }],
                            maxWidth: Dimensions.get('window').width - 32
                        }}
                        className="bg-[#18342B] border border-[#BBD583]/25 px-4 py-3 rounded-full flex-row items-center shadow-lg"
                    >
                        <View className="mr-2 flex-shrink-0">{renderIcon(currentToast.type)}</View>

                        <Text className="text-xs font-semibold text-white flex-1" numberOfLines={2}>
                            {currentToast.message}
                        </Text>

                        {currentToast.action ? (
                            <Pressable
                                onPress={() => {
                                    const actionFn = currentToast.action?.onPress;
                                    hideToast();
                                    actionFn?.();
                                }}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={currentToast.action.label}
                                className="ml-3 px-3 py-1 bg-[#BBD583]/20 rounded-full active:bg-[#BBD583]/30"
                            >
                                <Text className="text-xs font-bold text-[#BBD583]">{currentToast.action.label}</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={hideToast}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Dismiss notification"
                                className="ml-2.5 p-1 rounded-full active:bg-white/10"
                            >
                                <X size={14} color="#A8A29E" />
                            </Pressable>
                        )}
                    </Animated.View>
                </View>
            ) : null}
        </ToastContext.Provider>
    );
}
