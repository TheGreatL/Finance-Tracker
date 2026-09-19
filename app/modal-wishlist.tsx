import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  Chip,
  useToast,
} from 'panelui-native';
import { X, Sparkles } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createWishlistItem } from '../src/services/wishlistService';
import { WishlistPriority } from '../src/types/database';

export default function ModalWishlistScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { currency, refreshAll } = useFinance();

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for this wishlist item.');
      return;
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid estimated cost.');
      return;
    }

    setSubmitting(true);
    try {
      const id = `wish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await createWishlistItem({
        id,
        title: title.trim(),
        estimated_cost: costNum,
        priority,
        target_date: targetDate.trim() || null,
        url: url.trim(),
        notes: notes.trim(),
        status: 'wishing',
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Wish Added',
        description: `"${title}" added to wishlist.`,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add wishlist item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingHorizontal: 16,
          gap: 18,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text size="2xl" weight="bold">
            Add Wishlist Item
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Priority Selector */}
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Priority Level
          </Text>
          <View className="flex-row gap-2">
            <Chip
              selected={priority === 'low'}
              onPress={() => setPriority('low')}
            >
              Low Priority
            </Chip>
            <Chip
              selected={priority === 'medium'}
              onPress={() => setPriority('medium')}
            >
              Medium Priority
            </Chip>
            <Chip
              selected={priority === 'high'}
              onPress={() => setPriority('high')}
            >
              High Priority
            </Chip>
          </View>
        </View>

        <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
          <View className="gap-1">
            <Text size="xs" muted>
              Item Description:
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sony WH-1000XM5, Espresso Machine"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Estimated Price ({currency}):
            </Text>
            <Input
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholder="15000.00"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Target Date (Optional, YYYY-MM-DD):
            </Text>
            <Input
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="2026-12-25"
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Product URL / Store Link:
            </Text>
            <Input
              value={url}
              onChangeText={setUrl}
              placeholder="https://..."
            />
          </View>

          <View className="gap-1">
            <Text size="xs" muted>
              Notes:
            </Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Color option, coupon discount, etc."
            />
          </View>
        </Card>

        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Add to Wishlist
        </Button>
      </ScrollView>
    </View>
  );
}
