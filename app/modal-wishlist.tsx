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
import { X } from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createWishlistItem } from '../src/services/wishlistService';
import { WishlistPriority } from '../src/types/database';
import {
  wishlistFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async () => {
    const formData = {
      title,
      cost,
      targetDate,
      url,
      notes,
    };

    const validation = validateForm(wishlistFormSchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.show({
        variant: 'destructive',
        label: 'Validation Error',
        description: firstError || 'Please check highlighted fields.',
      });
      return;
    }

    setErrors({});
    const costNum = parseFloat(cleanNumericString(cost));

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

        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label="Item Description"
            isRequired
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              clearFieldError('title');
            }}
            errorMessage={errors.title}
            placeholder="e.g. Sony WH-1000XM5, Espresso Machine"
          />

          <Input
            label={`Estimated Price (${currency})`}
            isRequired
            value={cost}
            onChangeText={(val) => {
              setCost(val);
              clearFieldError('cost');
            }}
            errorMessage={errors.cost}
            keyboardType="decimal-pad"
            placeholder="15000.00"
          />

          <Input
            label="Target Date (Optional)"
            description="Format: YYYY-MM-DD (e.g. 2026-12-25)"
            value={targetDate}
            onChangeText={(val) => {
              setTargetDate(val);
              clearFieldError('targetDate');
            }}
            errorMessage={errors.targetDate}
            placeholder="2026-12-25"
          />

          <Input
            label="Product URL / Store Link"
            value={url}
            onChangeText={(val) => {
              setUrl(val);
              clearFieldError('url');
            }}
            errorMessage={errors.url}
            placeholder="https://..."
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Color option, coupon discount, etc."
          />
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
