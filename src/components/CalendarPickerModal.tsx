import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Dialog, Calendar, Text, Button } from 'panelui-native';
import { X } from 'lucide-react-native';

interface CalendarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  title?: string;
}

export default function CalendarPickerModal({
  open,
  onOpenChange,
  selectedDate,
  onSelectDate,
  title = 'Pick a Date',
}: CalendarPickerModalProps) {
  const [picked, setPicked] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  );

  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setPicked(new Date(selectedDate + 'T00:00:00'));
    }
  }, [selectedDate]);

  const handleSelect = (date: Date | undefined) => {
    setPicked(date);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      onSelectDate(`${y}-${m}-${d}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="p-4 gap-3">
        <View className="flex-row items-center justify-between pb-2 border-b border-border">
          <Text size="base" weight="bold">
            {title}
          </Text>
          <TouchableOpacity
            onPress={() => onOpenChange(false)}
            className="p-1.5 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View className="items-center justify-center">
          <Calendar
            mode="single"
            selected={picked}
            onSelect={handleSelect}
            bordered={false}
          />
        </View>

        <Button variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
      </Dialog.Content>
    </Dialog>
  );
}

