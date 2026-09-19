import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Button,
  Badge,
  Chip,
  Progress,
  Dialog,
  Input,
  useToast,
} from 'panelui-native';
import {
  Target,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Plus,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Repeat,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { contributeToGoal } from '../../src/services/goalService';
import { recordLoanRepayment } from '../../src/services/loanService';
import { updateWishlistItem } from '../../src/services/wishlistService';
import { deleteRecurringRule } from '../../src/services/recurringService';

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const {
    currency,
    savingsGoals,
    loans,
    wishlist,
    accounts,
    recurringRules,
    dashboardSummary,
    refreshAll,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'goals' | 'recurring' | 'loans' | 'wishlist'>('goals');
  const [refreshing, setRefreshing] = useState(false);

  // Contribution Modal State
  const [contributeGoal, setContributeGoal] = useState<any>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribAccountId, setContribAccountId] = useState(accounts[0]?.id || '');

  // Loan Repayment Modal State
  const [repayLoan, setRepayLoan] = useState<any>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState(accounts[0]?.id || '');

  const [processing, setProcessing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const formatMoney = (amount: number) => {
    return `${currency}${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const safeToSpend = dashboardSummary?.safeToSpend ?? 0;

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const num = parseFloat(contribAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid contribution amount.');
      return;
    }
    setProcessing(true);
    try {
      await contributeToGoal(contributeGoal.id, num, contribAccountId);
      await refreshAll();
      setContributeGoal(null);
      setContribAmount('');
      toast.show({
        variant: 'success',
        label: 'Goal Funded!',
        description: `Contributed ${formatMoney(num)} to ${contributeGoal.name}.`,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to contribute');
    } finally {
      setProcessing(false);
    }
  };

  const handleRepay = async () => {
    if (!repayLoan) return;
    const num = parseFloat(repayAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid repayment amount.');
      return;
    }
    setProcessing(true);
    try {
      await recordLoanRepayment(repayLoan.id, num, repayAccountId);
      await refreshAll();
      setRepayLoan(null);
      setRepayAmount('');
      toast.show({
        variant: 'success',
        label: 'Repayment Recorded',
        description: `Paid ${formatMoney(num)} towards ${repayLoan.title}.`,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record repayment');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRecurring = async (id: string, name: string) => {
    Alert.alert('Remove Rule', `Are you sure you want to remove recurring "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecurringRule(id);
            await refreshAll();
            toast.show({
              variant: 'info',
              label: 'Rule Removed',
              description: `"${name}" removed from recurring schedule.`,
            });
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete rule');
          }
        },
      },
    ]);
  };

  const getAffordabilityBadge = (cost: number) => {
    if (safeToSpend <= 0) {
      return (
        <Badge variant="outline" className="border-rose-500 bg-rose-500/10">
          <Text size="xs" className="text-rose-500 text-[10px] font-bold">
            Tight / No Runway
          </Text>
        </Badge>
      );
    }
    const ratio = (cost / safeToSpend) * 100;
    if (ratio <= 40) {
      return (
        <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10">
          <Text size="xs" className="text-emerald-600 text-[10px] font-bold">
            ✓ Affordable
          </Text>
        </Badge>
      );
    } else if (ratio <= 85) {
      return (
        <Badge variant="outline" className="border-amber-500 bg-amber-500/10">
          <Text size="xs" className="text-amber-600 text-[10px] font-bold">
            ⚠ Stretch
          </Text>
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-rose-500 bg-rose-500/10">
          <Text size="xs" className="text-rose-500 text-[10px] font-bold">
            ✕ Exceeds Safe Cash
          </Text>
        </Badge>
      );
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 16,
          gap: 18,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text size="sm" muted weight="medium">
              Savings, Loans & Wishlist
            </Text>
            <Text size="2xl" weight="bold">
              Planning & Goals
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (activeTab === 'goals') router.push('/modal-goal');
              else if (activeTab === 'recurring') router.push('/modal-recurring');
              else if (activeTab === 'loans') router.push('/modal-loan');
              else router.push('/modal-wishlist');
            }}
            className="flex-row items-center bg-primary px-3 py-2 rounded-xl gap-1.5 active:opacity-80"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text size="sm" weight="semibold" className="text-white">
              {activeTab === 'goals'
                ? 'New Goal'
                : activeTab === 'recurring'
                ? 'New Rule'
                : activeTab === 'loans'
                ? 'New Loan'
                : 'New Wish'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Segment Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row p-1 bg-card border border-border rounded-2xl gap-1">
            <TouchableOpacity
              onPress={() => setActiveTab('goals')}
              className={`px-3 py-2 rounded-xl items-center ${
                activeTab === 'goals' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                size="xs"
                weight="semibold"
                className={activeTab === 'goals' ? 'text-white' : 'text-muted-foreground'}
              >
                Goals ({savingsGoals.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('recurring')}
              className={`px-3 py-2 rounded-xl items-center ${
                activeTab === 'recurring' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                size="xs"
                weight="semibold"
                className={activeTab === 'recurring' ? 'text-white' : 'text-muted-foreground'}
              >
                Recurring / Salary ({recurringRules.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('loans')}
              className={`px-3 py-2 rounded-xl items-center ${
                activeTab === 'loans' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                size="xs"
                weight="semibold"
                className={activeTab === 'loans' ? 'text-white' : 'text-muted-foreground'}
              >
                Loans ({loans.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('wishlist')}
              className={`px-3 py-2 rounded-xl items-center ${
                activeTab === 'wishlist' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                size="xs"
                weight="semibold"
                className={activeTab === 'wishlist' ? 'text-white' : 'text-muted-foreground'}
              >
                Wishlist ({wishlist.length})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* TAB 1: SAVINGS GOALS */}
        {activeTab === 'goals' && (
          <View className="gap-3">
            {savingsGoals.length === 0 ? (
              <Card className="p-8 bg-card border border-border rounded-xl items-center gap-3">
                <Target size={32} color="#9CA3AF" />
                <Text size="sm" muted>
                  You have not set any savings goals yet.
                </Text>
                <Button size="sm" onPress={() => router.push('/modal-goal')}>
                  Create a Savings Goal
                </Button>
              </Card>
            ) : (
              savingsGoals.map(goal => {
                const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                const isComplete = pct >= 100;
                return (
                  <Card key={goal.id} className="p-4 bg-card border border-border rounded-xl gap-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="p-2 rounded-lg bg-emerald-500/10">
                          <Target size={18} color="#10B981" />
                        </View>
                        <View>
                          <Text size="base" weight="semibold">
                            {goal.name}
                          </Text>
                          {goal.target_date ? (
                            <Text size="xs" muted>
                              Target: {goal.target_date}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <Badge
                        variant="outline"
                        className={isComplete ? 'border-emerald-500' : 'border-border'}
                      >
                        <Text
                          size="xs"
                          weight="semibold"
                          className={isComplete ? 'text-emerald-500' : 'text-muted-foreground'}
                        >
                          {pct}%
                        </Text>
                      </Badge>
                    </View>

                    <Progress value={pct} className="h-2" />

                    <View className="flex-row items-center justify-between pt-1">
                      <View>
                        <Text size="sm" weight="bold">
                          {formatMoney(goal.current_amount)}
                        </Text>
                        <Text size="xs" muted>
                          of {formatMoney(goal.target_amount)}
                        </Text>
                      </View>

                      {!isComplete ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => {
                            setContributeGoal(goal);
                            setContribAmount('');
                          }}
                        >
                          + Contribute
                        </Button>
                      ) : (
                        <View className="flex-row items-center gap-1">
                          <CheckCircle2 size={16} color="#10B981" />
                          <Text size="xs" weight="semibold" className="text-emerald-500">
                            Goal Reached!
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* TAB: RECURRING RULES & SALARY */}
        {activeTab === 'recurring' && (
          <View className="gap-3">
            {recurringRules.length === 0 ? (
              <Card className="p-8 bg-card border border-border rounded-xl items-center gap-3">
                <Repeat size={32} color="#9CA3AF" />
                <Text size="base" weight="semibold">
                  No Recurring Salary or Bills Yet
                </Text>
                <Text size="xs" muted className="text-center px-4">
                  Put your regular monthly salary or bills here! The app will automatically track your paydays and credit them to your ledger.
                </Text>
                <Button size="sm" onPress={() => router.push('/modal-recurring')}>
                  Set Up Monthly Salary
                </Button>
              </Card>
            ) : (
              recurringRules.map((rule) => {
                const isIncome = rule.type === 'income';
                const nextDueDate = rule.next_due_date ? rule.next_due_date.split('T')[0] : '';
                const getOrdinal = (n: number) => {
                  const s = ['th', 'st', 'nd', 'rd'];
                  const v = n % 100;
                  return n + (s[(v - 20) % 10] || s[v] || s[0]);
                };

                const freqLabel =
                  rule.frequency === 'semi_monthly'
                    ? `Twice a Month (${getOrdinal(rule.payout_day_1 ?? 15)} & ${getOrdinal(rule.payout_day_2 ?? 30)})`
                    : rule.frequency === 'biweekly'
                    ? 'Bi-Weekly (Every 2 Weeks)'
                    : rule.frequency === 'monthly'
                    ? 'Monthly'
                    : rule.frequency === 'weekly'
                    ? 'Weekly'
                    : rule.frequency.toUpperCase();

                let ruleDeductions: Array<{ name: string; amount: number; cutoff?: 'first' | 'second' | 'both' }> = [];
                if (rule.deductions_json) {
                  try {
                    ruleDeductions = JSON.parse(rule.deductions_json);
                  } catch (e) {}
                }
                const ruleDeductionsTotal = ruleDeductions.reduce((sum, d) => sum + d.amount, 0);

                return (
                  <Card key={rule.id} className="p-4 bg-card border border-border rounded-xl gap-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2.5 flex-1">
                        <View
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            isIncome ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp size={18} color="#10B981" />
                          ) : (
                            <TrendingDown size={18} color="#EF4444" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text size="sm" weight="bold">
                            {rule.notes || (isIncome ? 'Recurring Salary' : 'Recurring Bill')}
                          </Text>
                          <Text size="xs" muted>
                            {freqLabel} • Next: {nextDueDate}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end gap-1">
                        <Text
                          size="base"
                          weight="bold"
                          className={isIncome ? 'text-emerald-500' : 'text-rose-500'}
                        >
                          {isIncome ? '+' : '-'}{formatMoney(rule.amount)}
                        </Text>
                        <Badge variant="outline">
                          {rule.auto_create ? 'Auto-Post' : 'Reminder'}
                        </Badge>
                      </View>
                    </View>

                    {/* Payslip deduction breakdown if configured */}
                    {isIncome && ruleDeductions.length > 0 && (
                      <View className="bg-muted/20 p-2.5 rounded-lg gap-1.5 border border-border/50">
                        <View className="flex-row justify-between items-center">
                          <Text size="xs" muted>
                            Gross: {formatMoney(rule.gross_amount ?? (rule.amount + ruleDeductionsTotal))}
                          </Text>
                          <Text size="xs" className="text-rose-500 font-medium">
                            Total Deductions: -{formatMoney(ruleDeductionsTotal)}
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-1">
                          {ruleDeductions.map((d, dIdx) => {
                            const cutoffBadge =
                              rule.frequency === 'semi_monthly' && d.cutoff
                                ? d.cutoff === 'first'
                                  ? `[1st: ${getOrdinal(rule.payout_day_1 ?? 15)}]`
                                  : d.cutoff === 'second'
                                  ? `[2nd: ${getOrdinal(rule.payout_day_2 ?? 30)}]`
                                  : '[Both Cutoffs]'
                                : null;

                            return (
                              <View
                                key={dIdx}
                                className="bg-card/70 border border-border/40 px-2 py-0.5 rounded-md flex-row items-center gap-1"
                              >
                                {cutoffBadge && (
                                  <Text size="xs" className="text-[10px] font-bold text-primary">
                                    {cutoffBadge}
                                  </Text>
                                )}
                                <Text size="xs" muted className="text-[11px]">
                                  {d.name}:
                                </Text>
                                <Text size="xs" weight="semibold" className="text-[11px] text-rose-500">
                                  -{formatMoney(d.amount)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between pt-2 border-t border-border">
                      <View className="flex-1 min-w-0 pr-2">
                        <Text size="xs" muted numberOfLines={1}>
                          Account: {accounts.find(a => a.id === rule.account_id)?.name || 'Linked Account'}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-2 shrink-0">
                        {isIncome && (
                          <TouchableOpacity
                            onPress={() => {
                              router.push({
                                pathname: '/modal-transaction',
                                params: {
                                  type: 'income',
                                  recurring_rule_id: rule.id,
                                },
                              });
                            }}
                            className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:opacity-75"
                          >
                            <Sparkles size={12} color="#10B981" />
                            <Text size="xs" weight="bold" className="text-emerald-700 dark:text-emerald-300">
                              Claim / Log Payday
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeleteRecurring(rule.id, rule.notes || 'Recurring Rule')}
                          className="p-1 rounded-lg bg-rose-500/10 active:opacity-75"
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: LOANS & DEBTS */}
        {activeTab === 'loans' && (
          <View className="gap-3">
            {loans.length === 0 ? (
              <Card className="p-8 bg-card border border-border rounded-xl items-center gap-3">
                <HeartHandshake size={32} color="#9CA3AF" />
                <Text size="sm" muted>
                  No active loans or payable obligations recorded.
                </Text>
                <Button size="sm" onPress={() => router.push('/modal-loan')}>
                  Track a Loan
                </Button>
              </Card>
            ) : (
              loans.map(loan => {
                const isPaidOff = loan.remaining_balance <= 0 || loan.status === 'paid_off';
                return (
                  <Card key={loan.id} className="p-4 bg-card border border-border rounded-xl gap-3">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text size="base" weight="semibold">
                          {loan.title}
                        </Text>
                        <Text size="xs" muted>
                          {loan.lender_or_borrower} • Due: {loan.due_date}
                        </Text>
                      </View>

                      <Badge
                        variant="outline"
                        className={isPaidOff ? 'border-emerald-500' : 'border-rose-500'}
                      >
                        <Text
                          size="xs"
                          weight="semibold"
                          className={isPaidOff ? 'text-emerald-500 uppercase' : 'text-rose-500 uppercase'}
                        >
                          {isPaidOff ? 'Paid Off' : 'Active'}
                        </Text>
                      </Badge>
                    </View>

                    <View className="flex-row justify-between items-center py-1">
                      <View>
                        <Text size="xs" muted>
                          Remaining Balance
                        </Text>
                        <Text size="lg" weight="bold" className="text-rose-500">
                          {formatMoney(loan.remaining_balance)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text size="xs" muted>
                          Installment ({loan.payment_frequency})
                        </Text>
                        <Text size="sm" weight="semibold">
                          {formatMoney(loan.installment_amount)}
                        </Text>
                      </View>
                    </View>

                    {!isPaidOff ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => {
                          setRepayLoan(loan);
                          setRepayAmount(String(loan.installment_amount || ''));
                        }}
                      >
                        Record Repayment
                      </Button>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: WISHLIST */}
        {activeTab === 'wishlist' && (
          <View className="gap-3">
            {wishlist.length === 0 ? (
              <Card className="p-8 bg-card border border-border rounded-xl items-center gap-3">
                <Sparkles size={32} color="#9CA3AF" />
                <Text size="sm" muted>
                  Your wishlist is empty. Add items you dream of purchasing!
                </Text>
                <Button size="sm" onPress={() => router.push('/modal-wishlist')}>
                  Add Wishlist Item
                </Button>
              </Card>
            ) : (
              wishlist.map(item => (
                <Card key={item.id} className="p-4 bg-card border border-border rounded-xl gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text size="base" weight="semibold">
                        {item.title}
                      </Text>
                      <Text size="xs" muted className="capitalize">
                        Priority: {item.priority}
                      </Text>
                    </View>
                    {getAffordabilityBadge(item.estimated_cost)}
                  </View>

                  <View className="flex-row items-center justify-between pt-1">
                    <View>
                      <Text size="xs" muted>
                        Estimated Cost
                      </Text>
                      <Text size="lg" weight="bold">
                        {formatMoney(item.estimated_cost)}
                      </Text>
                    </View>

                    <Button
                      size="sm"
                      variant="outline"
                      onPress={async () => {
                        await updateWishlistItem({ id: item.id, status: 'purchased' });
                        await refreshAll();
                        toast.show({ variant: 'success', label: 'Marked as Purchased!' });
                      }}
                    >
                      Mark Purchased
                    </Button>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Contribute to Goal Dialog */}
      {contributeGoal ? (
        <Dialog open={!!contributeGoal} onOpenChange={open => !open && setContributeGoal(null)}>
          <Dialog.Content className="p-5 gap-4">
            <Text size="lg" weight="bold">
              Contribute to {contributeGoal.name}
            </Text>
            <View className="gap-2">
              <Text size="xs" muted>
                Contribution Amount ({currency}):
              </Text>
              <Input
                value={contribAmount}
                onChangeText={setContribAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Source Account:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {accounts
                    .filter(a => a.type !== 'credit_card')
                    .map(a => (
                      <Chip
                        key={a.id}
                        selected={contribAccountId === a.id}
                        onPress={() => setContribAccountId(a.id)}
                      >
                        {a.name} ({formatMoney(a.current_balance)})
                      </Chip>
                    ))}
                </View>
              </ScrollView>
            </View>

            <View className="flex-row gap-2 pt-2">
              <Button
                className="flex-1"
                loading={processing}
                onPress={handleContribute}
              >
                Confirm Deposit
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setContributeGoal(null)}
              >
                Cancel
              </Button>
            </View>
          </Dialog.Content>
        </Dialog>
      ) : null}

      {/* Repay Loan Dialog */}
      {repayLoan ? (
        <Dialog open={!!repayLoan} onOpenChange={open => !open && setRepayLoan(null)}>
          <Dialog.Content className="p-5 gap-4">
            <Text size="lg" weight="bold">
              Record Repayment for {repayLoan.title}
            </Text>
            <View className="gap-2">
              <Text size="xs" muted>
                Repayment Amount ({currency}):
              </Text>
              <Input
                value={repayAmount}
                onChangeText={setRepayAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Payment Account:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {accounts.map(a => (
                    <Chip
                      key={a.id}
                      selected={repayAccountId === a.id}
                      onPress={() => setRepayAccountId(a.id)}
                    >
                      {a.name}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="flex-row gap-2 pt-2">
              <Button
                className="flex-1"
                loading={processing}
                onPress={handleRepay}
              >
                Confirm Payment
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setRepayLoan(null)}
              >
                Cancel
              </Button>
            </View>
          </Dialog.Content>
        </Dialog>
      ) : null}
    </View>
  );
}
