import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  initialDate?: string; // YYYY-MM-DD format
  title?: string;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseISODate(dateStr?: string): Date {
  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }
  return new Date();
}

function formatToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DatePickerModal({
  visible,
  initialDate,
  title = 'Select Date',
  onClose,
  onSelectDate,
}: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => parseISODate(initialDate));
  const [viewYear, setViewYear] = useState<number>(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate.getMonth());

  useEffect(() => {
    if (visible) {
      const parsed = parseISODate(initialDate);
      setSelectedDate(parsed);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [visible, initialDate]);

  const todayStr = useMemo(() => formatToISO(new Date()), []);
  const selectedStr = useMemo(() => formatToISO(selectedDate), [selectedDate]);

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Leading empty / padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      cells.push({
        day,
        dateStr: `${viewYear}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    if (!dateStr) return;
    const parsed = parseISODate(dateStr);
    setSelectedDate(parsed);
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleApplyEndOfMonth = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setSelectedDate(endOfMonth);
    setViewYear(endOfMonth.getFullYear());
    setViewMonth(endOfMonth.getMonth());
  };

  const handleConfirm = () => {
    onSelectDate(selectedStr);
    onClose();
  };

  const formattedDisplay = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-white rounded-3xl w-full max-w-sm p-5 border border-stone-100 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-stone-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-[#18342B]/10 items-center justify-center mr-2">
                <CalendarIcon size={16} color="#18342B" />
              </View>
              <Text className="text-base font-bold text-stone-900">{title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-7 h-7 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200">
              <X size={15} color="#78716C" />
            </Pressable>
          </View>

          {/* Quick Preset Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row py-1 mb-3">
            <Pressable
              onPress={() => handleApplyPreset(0)}
              className="bg-stone-100 px-2.5 py-1 rounded-lg mr-1.5 active:bg-stone-200">
              <Text className="text-[11px] font-semibold text-stone-700">Today</Text>
            </Pressable>
            <Pressable
              onPress={() => handleApplyPreset(15)}
              className="bg-stone-100 px-2.5 py-1 rounded-lg mr-1.5 active:bg-stone-200">
              <Text className="text-[11px] font-semibold text-stone-700">+15 Days</Text>
            </Pressable>
            <Pressable
              onPress={() => handleApplyPreset(30)}
              className="bg-stone-100 px-2.5 py-1 rounded-lg mr-1.5 active:bg-stone-200">
              <Text className="text-[11px] font-semibold text-stone-700">+30 Days</Text>
            </Pressable>
            <Pressable
              onPress={handleApplyEndOfMonth}
              className="bg-stone-100 px-2.5 py-1 rounded-lg active:bg-stone-200">
              <Text className="text-[11px] font-semibold text-stone-700">End of Month</Text>
            </Pressable>
          </ScrollView>

          {/* Month & Year Navigation */}
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200">
              <ChevronLeft size={16} color="#44403C" />
            </Pressable>
            <Text className="text-sm font-bold text-stone-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable
              onPress={handleNextMonth}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200">
              <ChevronRight size={16} color="#44403C" />
            </Pressable>
          </View>

          {/* Days of Week Row */}
          <View className="flex-row justify-between mb-1.5 px-1">
            {DAY_LABELS.map((dayLabel, idx) => (
              <View key={idx} className="w-10 items-center">
                <Text className="text-[11px] font-bold text-stone-400">{dayLabel}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid (7 columns) */}
          <View className="flex-row flex-wrap justify-between px-1">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return <View key={idx} className="w-10 h-9 mb-1" />;
              }

              const isSelected = item.dateStr === selectedStr;
              const isToday = item.dateStr === todayStr;

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectDay(item.dateStr)}
                  className={`w-10 h-9 mb-1 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-[#18342B]'
                      : isToday
                      ? 'bg-emerald-50 border border-emerald-300'
                      : 'active:bg-stone-100'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-white font-bold'
                        : isToday
                        ? 'text-emerald-800 font-bold'
                        : 'text-stone-800'
                    }`}>
                    {item.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Selected Date Preview & Action Buttons */}
          <View className="mt-4 pt-3 border-t border-stone-100">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-xs text-stone-500 font-medium">Selected Date:</Text>
              <Text className="text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                {formattedDisplay} ({selectedStr})
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={onClose}
                className="flex-1 py-3 rounded-xl bg-stone-100 items-center active:bg-stone-200">
                <Text className="text-xs font-semibold text-stone-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-[#18342B] flex-row items-center justify-center active:opacity-90">
                <Check size={14} color="#FFFFFF" className="mr-1" />
                <Text className="text-xs font-bold text-white ml-1">Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

