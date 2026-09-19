import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Button,
  Badge,
  Chip,
} from 'panelui-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  CreditCard,
  Repeat,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useFinance } from '../context/FinanceContext';
import { TransactionWithDetails } from '../types/database';

interface FinancialCalendarViewProps {
  onSelectTransaction?: (tx: TransactionWithDetails) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FinancialCalendarView({ onSelectTransaction }: FinancialCalendarViewProps) {
  const {
    currency,
    recentTransactions,
    accounts,
    recurringRules,
    loans,
  } = useFinance();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'due'>('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Map transactions by YYYY-MM-DD
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, TransactionWithDetails[]>();
    for (const tx of recentTransactions) {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [recentTransactions]);

  // Aggregate monthly stats
  const monthlyStats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    for (const tx of recentTransactions) {
      if (tx.date.startsWith(currentMonthPrefix)) {
        if (tx.type === 'income') inflow += tx.amount;
        if (tx.type === 'expense') outflow += tx.amount;
      }
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [recentTransactions, year, month]);

  // Find recurring & credit card due dates for any given day of month (1-31)
  const getDueEventsForDay = (dayNum: number, fullDateStr: string) => {
    const events: Array<{
      title: string;
      type: 'cutoff' | 'due' | 'recurring' | 'loan';
      description: string;
      ruleId?: string;
      isSalary?: boolean;
      cutoff?: 'first' | 'second';
    }> = [];

    // Credit cards statement cutoffs and payment dues
    for (const acc of accounts) {
      if (acc.type === 'credit_card' && !acc.is_archived) {
        if (acc.statement_day === dayNum) {
          events.push({
            title: `${acc.name} Cutoff`,
            type: 'cutoff',
            description: `Statement closes today (billing cycle ends)`,
          });
        }
        if (acc.due_day === dayNum) {
          events.push({
            title: `${acc.name} Payment Due`,
            type: 'due',
            description: `Card payment deadline`,
          });
        }
      }
    }

    // Recurring subscriptions/income
    for (const rule of recurringRules) {
      if (rule.is_active) {
        const nextDate = rule.next_due_date ? rule.next_due_date.split('T')[0] : '';
        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
        const startDay = rule.start_date ? parseInt(rule.start_date.split('-')[2], 10) : 1;

        let isMatch = nextDate === fullDateStr;

        if (!isMatch) {
          if (rule.frequency === 'semi_monthly') {
            const d1 = rule.payout_day_1 && rule.payout_day_1 >= 1 && rule.payout_day_1 <= 31 ? rule.payout_day_1 : 15;
            const d2 = rule.payout_day_2 && rule.payout_day_2 >= 1 && rule.payout_day_2 <= 31 ? rule.payout_day_2 : 30;
            const effectiveD2 = Math.min(d2, daysInCurrentMonth);
            isMatch = dayNum === d1 || dayNum === effectiveD2;
          } else if (rule.frequency === 'monthly') {
            // Monthly matches start day of month (or last day if month is shorter)
            const targetDay = Math.min(startDay, daysInCurrentMonth);
            isMatch = dayNum === targetDay;
          }
        }

        if (isMatch) {
          let deductionsText = '';
          let cutoffPrefix = '';
          let displayAmount = rule.amount;
          let chosenCutoff: 'first' | 'second' | undefined = undefined;

          if (rule.frequency === 'semi_monthly') {
            const d1 = rule.payout_day_1 && rule.payout_day_1 >= 1 && rule.payout_day_1 <= 31 ? rule.payout_day_1 : 15;
            const isFirstCutoff = dayNum === d1;
            chosenCutoff = isFirstCutoff ? 'first' : 'second';
            cutoffPrefix = isFirstCutoff ? '[1st Cutoff] ' : '[2nd Cutoff] ';

            if (rule.deductions_json) {
              try {
                const deds: Array<{ name: string; amount: number; cutoff?: string }> = JSON.parse(rule.deductions_json);
                if (deds.length > 0) {
                  const activeDeds = deds.filter(d => {
                    if (!d.cutoff || d.cutoff === 'both') return true;
                    return isFirstCutoff ? d.cutoff === 'first' : d.cutoff === 'second';
                  });
                  const activeTotal = activeDeds.reduce((s, d) => s + d.amount, 0);
                  if (activeTotal > 0) {
                    deductionsText = ` (Deductions: -${currency}${activeTotal.toLocaleString()})`;
                  }
                  if (rule.gross_amount) {
                    displayAmount = Math.max(0, rule.gross_amount - activeTotal);
                  }
                }
              } catch (e) {}
            }
          } else if (rule.deductions_json) {
            try {
              const deds: Array<{ name: string; amount: number }> = JSON.parse(rule.deductions_json);
              if (deds.length > 0) {
                deductionsText = ` (Deductions: -${currency}${deds.reduce((s, d) => s + d.amount, 0).toLocaleString()})`;
              }
            } catch (e) {}
          }

          events.push({
            title: `${cutoffPrefix}${rule.notes || (rule.type === 'income' ? 'Recurring Salary' : 'Recurring Bill')}`,
            type: 'recurring',
            description: `${rule.type === 'income' ? 'Take-Home Pay' : 'Recurring Bill'}: ${currency}${displayAmount.toLocaleString()}${deductionsText}`,
            ruleId: rule.id,
            isSalary: rule.type === 'income',
            cutoff: chosenCutoff,
          });
        }
      }
    }

    // Active Loans due on this date
    for (const loan of loans) {
      if (loan.status === 'active' && loan.due_date === fullDateStr) {
        events.push({
          title: loan.title,
          type: 'loan',
          description: `Final maturity due date (${currency}${loan.remaining_balance.toLocaleString()})`,
        });
      }
    }

    return events;
  };

  // Generate calendar grid cells (6 rows * 7 days)
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      inflow: number;
      outflow: number;
      hasIncome: boolean;
      hasExpense: boolean;
      hasTransfer: boolean;
      dueEvents: Array<{
        title: string;
        type: 'cutoff' | 'due' | 'recurring' | 'loan';
        description: string;
        ruleId?: string;
        isSalary?: boolean;
        cutoff?: 'first' | 'second';
      }>;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const txs = transactionsByDate.get(dStr) || [];
      const hasIncome = txs.some(t => t.type === 'income');
      const hasExpense = txs.some(t => t.type === 'expense');
      const hasTransfer = txs.some(t => t.type === 'transfer');
      const dueEvents = getDueEventsForDay(d, dStr);

      cells.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        inflow: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        outflow: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        hasIncome,
        hasExpense,
        hasTransfer,
        dueEvents,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const txs = transactionsByDate.get(dStr) || [];
      const hasIncome = txs.some(t => t.type === 'income');
      const hasExpense = txs.some(t => t.type === 'expense');
      const hasTransfer = txs.some(t => t.type === 'transfer');
      const dueEvents = getDueEventsForDay(d, dStr);

      cells.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        inflow: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        outflow: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        hasIncome,
        hasExpense,
        hasTransfer,
        dueEvents,
      });
    }

    // Trailing days from next month to fill grid
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length > 0 ? 42 - cells.length : 0);
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const txs = transactionsByDate.get(dStr) || [];
      const hasIncome = txs.some(t => t.type === 'income');
      const hasExpense = txs.some(t => t.type === 'expense');
      const hasTransfer = txs.some(t => t.type === 'transfer');
      const dueEvents = getDueEventsForDay(d, dStr);

      cells.push({
        dayNumber: d,
        dateString: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        inflow: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        outflow: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        hasIncome,
        hasExpense,
        hasTransfer,
        dueEvents,
      });
    }

    return cells;
  }, [year, month, selectedDateStr, todayStr, transactionsByDate, accounts, recurringRules, loans]);

  // Data for currently selected date
  const selectedDayData = useMemo(() => {
    const txs = transactionsByDate.get(selectedDateStr) || [];
    const dayNum = parseInt(selectedDateStr.split('-')[2], 10);
    const dueEvents = getDueEventsForDay(dayNum, selectedDateStr);
    const inflow = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const outflow = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const parsedDate = new Date(selectedDateStr + 'T00:00:00');
    const displayDate = parsedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      dateString: selectedDateStr,
      displayDate,
      inflow,
      outflow,
      net: inflow - outflow,
      transactions: txs,
      dueEvents,
    };
  }, [selectedDateStr, transactionsByDate, accounts, recurringRules, loans]);

  return (
    <View className="gap-4">
      {/* Calendar Header & Month Navigation */}
      <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <CalendarIcon size={20} color="#6366F1" />
            <Text size="lg" weight="bold">
              {monthLabel}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Button size="sm" variant="ghost" onPress={handleGoToday}>
              Today
            </Button>
            <TouchableOpacity
              onPress={handlePrevMonth}
              className="p-2 rounded-xl bg-muted/20 active:opacity-75"
            >
              <ChevronLeft size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMonth}
              className="p-2 rounded-xl bg-muted/20 active:opacity-75"
            >
              <ChevronRight size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Summary Bar */}
        <View className="flex-row justify-between items-center pt-2 border-t border-border">
          <View>
            <Text size="xs" muted>
              Inflow
            </Text>
            <Text size="xs" weight="bold" className="text-emerald-500">
              +{currency}{monthlyStats.inflow.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text size="xs" muted>
              Outflow
            </Text>
            <Text size="xs" weight="bold" className="text-rose-500">
              -{currency}{monthlyStats.outflow.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text size="xs" muted>
              Net Movement
            </Text>
            <Text
              size="xs"
              weight="bold"
              className={monthlyStats.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            >
              {monthlyStats.net >= 0 ? '+' : ''}{currency}{monthlyStats.net.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {/* Marker Legend & Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          <Chip
            selected={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          >
            All Dates
          </Chip>
          <Chip
            selected={activeFilter === 'income'}
            onPress={() => setActiveFilter('income')}
          >
            🟢 Income Days
          </Chip>
          <Chip
            selected={activeFilter === 'expense'}
            onPress={() => setActiveFilter('expense')}
          >
            🔴 Expense Days
          </Chip>
          <Chip
            selected={activeFilter === 'due'}
            onPress={() => setActiveFilter('due')}
          >
            🟣 Bills & Cutoffs
          </Chip>
        </View>
      </ScrollView>

      {/* Calendar Month Grid */}
      <Card className="p-3 bg-card border border-border rounded-2xl gap-2">
        {/* Weekday Column Headers */}
        <View className="flex-row justify-between pb-1 border-b border-border">
          {WEEKDAYS.map((wd, i) => (
            <View key={i} className="flex-1 items-center justify-center">
              <Text size="xs" weight="bold" muted className="uppercase tracking-wider">
                {wd}
              </Text>
            </View>
          ))}
        </View>

        {/* 7-Column Days Grid */}
        <View className="flex-row flex-wrap">
          {calendarCells.map((cell, index) => {
            const hasIncome = cell.hasIncome && (activeFilter === 'all' || activeFilter === 'income');
            const hasExpense = cell.hasExpense && (activeFilter === 'all' || activeFilter === 'expense');
            const hasTransfer = cell.hasTransfer && activeFilter === 'all';
            const hasDue = cell.dueEvents.length > 0 && (activeFilter === 'all' || activeFilter === 'due');

            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDateStr(cell.dateString)}
                style={{ width: '14.28%', height: 50 }}
                className={`items-center justify-center p-0.5 rounded-xl ${
                  cell.isSelected
                    ? 'bg-primary'
                    : cell.isToday
                    ? 'bg-primary/10 border border-primary/40'
                    : 'bg-transparent'
                }`}
              >
                <Text
                  size="xs"
                  weight={cell.isSelected || cell.isToday ? 'bold' : 'normal'}
                  className={
                    cell.isSelected
                      ? 'text-primary-foreground font-bold'
                      : !cell.isCurrentMonth
                      ? 'text-muted-foreground/40'
                      : 'text-foreground'
                  }
                >
                  {cell.dayNumber}
                </Text>

                {/* Marked dots */}
                <View className="flex-row gap-0.5 mt-1 h-1.5 items-center justify-center">
                  {hasIncome ? (
                    <View className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  ) : null}
                  {hasExpense ? (
                    <View className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                  ) : null}
                  {hasTransfer ? (
                    <View className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                  ) : null}
                  {hasDue ? (
                    <View className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-purple-500'}`} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Selected Day Inspector */}
      <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text size="sm" weight="bold">
              {selectedDayData.displayDate}
            </Text>
            <Text size="xs" muted>
              {selectedDayData.transactions.length} movement{selectedDayData.transactions.length === 1 ? '' : 's'} recorded
            </Text>
          </View>
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push(`/modal-transaction?date=${selectedDayData.dateString}` as any)}
            className="flex-row items-center gap-1"
          >
            <Plus size={14} color="#6366F1" />
            <Text size="xs" weight="semibold">
              Add on Date
            </Text>
          </Button>
        </View>

        {/* Day Financial Totals */}
        <View className="flex-row justify-between items-center p-2.5 bg-muted/20 rounded-xl">
          <View>
            <Text size="xs" muted>
              Inflow
            </Text>
            <Text size="xs" weight="bold" className="text-emerald-500">
              +{currency}{selectedDayData.inflow.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text size="xs" muted>
              Outflow
            </Text>
            <Text size="xs" weight="bold" className="text-rose-500">
              -{currency}{selectedDayData.outflow.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text size="xs" muted>
              Net
            </Text>
            <Text
              size="xs"
              weight="bold"
              className={selectedDayData.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            >
              {selectedDayData.net >= 0 ? '+' : ''}{currency}{selectedDayData.net.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Scheduled Obligations on this Day */}
        {selectedDayData.dueEvents.length > 0 ? (
          <View className="gap-2 pt-1 border-t border-border">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Bills & Deadlines on This Day
            </Text>
            {selectedDayData.dueEvents.map((evt, idx) => (
              <View
                key={idx}
                className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 gap-2"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                    {evt.type === 'cutoff' || evt.type === 'due' ? (
                      <CreditCard size={16} color="#8B5CF6" />
                    ) : evt.type === 'recurring' ? (
                      <Repeat size={16} color="#8B5CF6" />
                    ) : (
                      <Clock size={16} color="#8B5CF6" />
                    )}
                    <View className="flex-1 min-w-0">
                      <Text size="xs" weight="bold" className="text-foreground" numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <Text size="xs" muted numberOfLines={1}>
                        {evt.description}
                      </Text>
                    </View>
                  </View>
                  <Badge variant="outline">
                    {evt.type === 'cutoff' ? 'Cutoff' : evt.type === 'due' ? 'Payment' : 'Recurring'}
                  </Badge>
                </View>

                {evt.isSalary && evt.ruleId ? (
                  <View className="flex-row justify-end pt-1.5 border-t border-purple-500/20">
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: '/modal-transaction',
                          params: {
                            type: 'income',
                            recurring_rule_id: evt.ruleId,
                            cutoff: evt.cutoff,
                            date: selectedDateStr,
                          },
                        });
                      }}
                      className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:opacity-75"
                    >
                      <Sparkles size={12} color="#10B981" />
                      <Text size="xs" weight="bold" className="text-emerald-700 dark:text-emerald-300">
                        Claim / Log Payday with Overtime & Absences
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Day Transactions List */}
        <View className="gap-2 pt-1 border-t border-border">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Ledger Movements
          </Text>
          {selectedDayData.transactions.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text size="xs" muted>
                No financial movements recorded on this date.
              </Text>
            </View>
          ) : (
            selectedDayData.transactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                onPress={() => onSelectTransaction?.(tx)}
                className="flex-row items-center justify-between p-2.5 bg-card border border-border rounded-xl active:opacity-75"
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/15'
                        : tx.type === 'expense'
                        ? 'bg-rose-500/15'
                        : 'bg-blue-500/15'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp size={16} color="#10B981" />
                    ) : tx.type === 'expense' ? (
                      <TrendingDown size={16} color="#EF4444" />
                    ) : (
                      <ArrowRightLeft size={16} color="#3B82F6" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text size="xs" weight="bold">
                      {tx.category_name || (tx.type === 'transfer' ? 'Account Transfer' : 'Uncategorized')}
                    </Text>
                    <Text size="xs" muted numberOfLines={1}>
                      {tx.account_name} {tx.to_account_name ? `→ ${tx.to_account_name}` : ''} {tx.notes ? `• ${tx.notes}` : ''}
                    </Text>
                  </View>
                </View>
                <Text
                  size="xs"
                  weight="bold"
                  className={
                    tx.type === 'income'
                      ? 'text-emerald-500'
                      : tx.type === 'expense'
                      ? 'text-rose-500'
                      : 'text-blue-500'
                  }
                >
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                  {currency}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Card>
    </View>
  );
}
