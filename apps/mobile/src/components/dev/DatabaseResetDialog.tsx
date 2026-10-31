import React, { useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

interface DatabaseResetDialogProps {
    visible: boolean;
    onClose: () => void;
    onConfirmReset: () => Promise<void>;
}

export function DatabaseResetDialog({ visible, onClose, onConfirmReset }: DatabaseResetDialogProps) {
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        try {
            setResetting(true);
            await onConfirmReset();
            onClose();
        } finally {
            setResetting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 bg-black/60 items-center justify-center p-5">
                <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-stone-200">
                    <View className="w-12 h-12 rounded-2xl bg-red-100 items-center justify-center mb-4">
                        <AlertTriangle size={24} color="#DC2626" />
                    </View>

                    <Text className="text-lg font-bold text-stone-900 mb-1">Reset Database?</Text>
                    <Text className="text-xs text-stone-500 leading-relaxed mb-6">
                        This will permanently erase all institutions, pockets, and transactions. You will start with a completely empty, zero-balance
                        database.
                    </Text>

                    <View className="space-y-2">
                        <Pressable onPress={handleReset} disabled={resetting} className="bg-red-600 py-3.5 rounded-xl items-center active:bg-red-700">
                            <Text className="text-white font-bold text-sm">{resetting ? 'Resetting...' : 'Yes, Wipe All Data'}</Text>
                        </Pressable>

                        <Pressable
                            onPress={onClose}
                            disabled={resetting}
                            className="bg-stone-100 py-3 rounded-xl items-center active:bg-stone-200 mt-2"
                        >
                            <Text className="text-stone-700 font-semibold text-sm">Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
