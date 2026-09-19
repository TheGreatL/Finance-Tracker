import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  Input,
  Button,
  Badge,
  Chip,
  Progress,
} from 'panelui-native';
import {
  Calculator,
  Sparkles,
  TrendingUp,
  CreditCard,
  Target,
  ShieldAlert,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';
import {
  calculateSafeToSpend,
  SafeToSpendBreakdown,
  projectSavings,
  SavingsProjectionResult,
  calculateDebtPayoff,
  DebtPayoffResult,
  getCreditCardUtilization,
  CreditUtilizationSummary,
} from '../../src/services/calculatorService';

export default function CalculatorsScreen() {
  const insets = useSafeAreaInsets();
  const { currency, refreshAll } = useFinance();

  const [activeTool, setActiveTool] = useState<
    'safe_spend' | 'savings_proj' | 'debt_payoff' | 'affordability' | 'credit_util'
  >('safe_spend');
  const [refreshing, setRefreshing] = useState(false);

  // Safe-to-Spend state
  const [safeSpendData, setSafeSpendData] = useState<SafeToSpendBreakdown | null>(null);

  // Savings Projection state
  const [projTarget, setProjTarget] = useState('100000');
  const [projCurrent, setProjCurrent] = useState('20000');
  const [projMonthly, setProjMonthly] = useState('10000');
  const [projResult, setProjResult] = useState<SavingsProjectionResult | null>(null);

  // Debt Payoff state
  const [debtPrincipal, setDebtPrincipal] = useState('50000');
  const [debtRate, setDebtRate] = useState('12');
  const [debtMonthly, setDebtMonthly] = useState('3000');
  const [debtResult, setDebtResult] = useState<DebtPayoffResult | null>(null);

  // Purchase Affordability state
  const [purchaseCost, setPurchaseCost] = useState('15000');

  // Credit Utilization state
  const [creditSummary, setCreditSummary] = useState<CreditUtilizationSummary | null>(null);

  const loadCalculatorData = async () => {
    const safeData = await calculateSafeToSpend();
    setSafeSpendData(safeData);

    const creditData = await getCreditCardUtilization();
    setCreditSummary(creditData);

    // Initial calculations
    setProjResult(
      projectSavings(parseFloat(projTarget) || 0, parseFloat(projCurrent) || 0, parseFloat(projMonthly) || 0)
    );
    setDebtResult(
      calculateDebtPayoff(
        parseFloat(debtPrincipal) || 0,
        parseFloat(debtRate) || 0,
        parseFloat(debtMonthly) || 0
      )
    );
  };

  useEffect(() => {
    loadCalculatorData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    await loadCalculatorData();
    setRefreshing(false);
  };

  const formatMoney = (amount: number) => {
    return `${currency}${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleUpdateSavings = (target: string, current: string, monthly: string) => {
    setProjTarget(target);
    setProjCurrent(current);
    setProjMonthly(monthly);
    setProjResult(
      projectSavings(parseFloat(target) || 0, parseFloat(current) || 0, parseFloat(monthly) || 0)
    );
  };

  const handleUpdateDebt = (principal: string, rate: string, monthly: string) => {
    setDebtPrincipal(principal);
    setDebtRate(rate);
    setDebtMonthly(monthly);
    setDebtResult(
      calculateDebtPayoff(parseFloat(principal) || 0, parseFloat(rate) || 0, parseFloat(monthly) || 0)
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 40,
        paddingHorizontal: 16,
        gap: 18,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="gap-0.5">
        <Text size="sm" muted weight="medium">
          Financial Intelligence
        </Text>
        <Text size="2xl" weight="bold">
          Interactive Calculators
        </Text>
      </View>

      {/* Tool Selector Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          <Chip
            selected={activeTool === 'safe_spend'}
            onPress={() => setActiveTool('safe_spend')}
          >
            Safe-to-Spend
          </Chip>
          <Chip
            selected={activeTool === 'savings_proj'}
            onPress={() => setActiveTool('savings_proj')}
          >
            Savings Projector
          </Chip>
          <Chip
            selected={activeTool === 'debt_payoff'}
            onPress={() => setActiveTool('debt_payoff')}
          >
            Debt Payoff
          </Chip>
          <Chip
            selected={activeTool === 'affordability'}
            onPress={() => setActiveTool('affordability')}
          >
            Affordability Simulator
          </Chip>
          <Chip
            selected={activeTool === 'credit_util'}
            onPress={() => setActiveTool('credit_util')}
          >
            Credit Card Utilization
          </Chip>
        </View>
      </ScrollView>

      {/* 1. SAFE-TO-SPEND RUNWAY */}
      {activeTool === 'safe_spend' && safeSpendData && (
        <View className="gap-3">
          <Card className="p-5 bg-card border border-border rounded-2xl gap-3">
            <View className="flex-row items-center gap-2">
              <Sparkles size={20} color="#4F46E5" />
              <Text size="base" weight="bold">
                Safe-to-Spend Runway
              </Text>
            </View>

            <Text size="3xl" weight="bold" className="text-primary">
              {formatMoney(safeSpendData.safeToSpend)}
            </Text>

            <Text size="xs" muted>
              This is your true discretionary money right now. It reserves cash for all your active recurring subscriptions, loan amortizations, and savings commitments before allowing spend.
            </Text>

            <View className="p-3 bg-muted/20 rounded-xl flex-row items-center justify-between mt-1">
              <Text size="sm" weight="medium">
                Daily Discretionary Budget:
              </Text>
              <Text size="base" weight="bold" className="text-emerald-600">
                {formatMoney(safeSpendData.dailyDiscretionaryBudget)} / day
              </Text>
            </View>
          </Card>

          <Card className="p-4 bg-card border border-border rounded-xl gap-2.5">
            <Text size="sm" weight="semibold" muted className="uppercase tracking-wider">
              Calculation Breakdown
            </Text>

            <View className="flex-row justify-between">
              <Text size="sm" muted>
                Current Liquid Cash:
              </Text>
              <Text size="sm" weight="semibold">
                +{formatMoney(safeSpendData.liquidCash)}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text size="sm" muted>
                Upcoming Recurring Bills:
              </Text>
              <Text size="sm" weight="semibold" className="text-rose-500">
                -{formatMoney(safeSpendData.upcomingBills)}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text size="sm" muted>
                Upcoming Loan Installments:
              </Text>
              <Text size="sm" weight="semibold" className="text-rose-500">
                -{formatMoney(safeSpendData.upcomingLoanPayments)}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text size="sm" muted>
                Savings Goal Allocations:
              </Text>
              <Text size="sm" weight="semibold" className="text-blue-500">
                -{formatMoney(safeSpendData.savingsCommitments)}
              </Text>
            </View>

            <View className="pt-2 border-t border-border flex-row justify-between">
              <Text size="sm" weight="bold">
                Net Safe-to-Spend:
              </Text>
              <Text size="base" weight="bold" className="text-primary">
                {formatMoney(safeSpendData.safeToSpend)}
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* 2. SAVINGS PROJECTOR */}
      {activeTool === 'savings_proj' && (
        <View className="gap-3">
          <Card className="p-4 bg-card border border-border rounded-xl gap-3">
            <Text size="base" weight="bold">
              Savings Goal Timeline Projector
            </Text>

            <View className="gap-1">
              <Text size="xs" muted>
                Target Goal Amount ({currency}):
              </Text>
              <Input
                value={projTarget}
                onChangeText={t => handleUpdateSavings(t, projCurrent, projMonthly)}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Current Saved Amount ({currency}):
              </Text>
              <Input
                value={projCurrent}
                onChangeText={c => handleUpdateSavings(projTarget, c, projMonthly)}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Monthly Savings Contribution ({currency}):
              </Text>
              <Input
                value={projMonthly}
                onChangeText={m => handleUpdateSavings(projTarget, projCurrent, m)}
                keyboardType="decimal-pad"
              />
            </View>
          </Card>

          {projResult && (
            <Card className="p-5 bg-card border border-border rounded-2xl gap-3">
              <View className="flex-row items-center gap-2">
                <Clock size={18} color="#10B981" />
                <Text size="base" weight="bold">
                  Projected Goal Completion
                </Text>
              </View>

              <View className="p-4 bg-emerald-500/10 rounded-xl items-center gap-1">
                <Text size="sm" muted>
                  Target Achieved In
                </Text>
                <Text size="3xl" weight="bold" className="text-emerald-600">
                  {projResult.monthsToReach === Infinity ? 'Never' : `${projResult.monthsToReach} Months`}
                </Text>
                <Text size="sm" weight="semibold">
                  Estimated Date: {projResult.targetAchievedDate}
                </Text>
              </View>

              <View className="flex-row justify-between pt-1">
                <Text size="xs" muted>
                  Remaining to Save:
                </Text>
                <Text size="sm" weight="bold">
                  {formatMoney(projResult.remainingAmount)}
                </Text>
              </View>
            </Card>
          )}
        </View>
      )}

      {/* 3. DEBT PAYOFF ACCELERATOR */}
      {activeTool === 'debt_payoff' && (
        <View className="gap-3">
          <Card className="p-4 bg-card border border-border rounded-xl gap-3">
            <Text size="base" weight="bold">
              Debt Payoff & Interest Calculator
            </Text>

            <View className="gap-1">
              <Text size="xs" muted>
                Principal / Loan Balance ({currency}):
              </Text>
              <Input
                value={debtPrincipal}
                onChangeText={p => handleUpdateDebt(p, debtRate, debtMonthly)}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Annual Interest Rate (%):
              </Text>
              <Input
                value={debtRate}
                onChangeText={r => handleUpdateDebt(debtPrincipal, r, debtMonthly)}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="gap-1">
              <Text size="xs" muted>
                Monthly Payment ({currency}):
              </Text>
              <Input
                value={debtMonthly}
                onChangeText={m => handleUpdateDebt(debtPrincipal, debtRate, m)}
                keyboardType="decimal-pad"
              />
            </View>
          </Card>

          {debtResult && (
            <Card className="p-5 bg-card border border-border rounded-2xl gap-3">
              <View className="flex-row items-center gap-2">
                <Flame size={18} color="#EF4444" />
                <Text size="base" weight="bold">
                  Payoff Schedule Summary
                </Text>
              </View>

              <View className="p-4 bg-rose-500/10 rounded-xl items-center gap-1">
                <Text size="sm" muted>
                  Months to Debt Freedom
                </Text>
                <Text size="3xl" weight="bold" className="text-rose-600">
                  {debtResult.monthsToPayoff === Infinity ? 'Never' : `${debtResult.monthsToPayoff} Months`}
                </Text>
                <Text size="sm" weight="semibold">
                  Debt-Free Date: {debtResult.payoffDate}
                </Text>
              </View>

              <View className="flex-row justify-between pt-1">
                <Text size="xs" muted>
                  Total Interest Paid:
                </Text>
                <Text size="sm" weight="bold" className="text-rose-500">
                  {formatMoney(debtResult.totalInterestPaid)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text size="xs" muted>
                  Total Repaid (Principal + Interest):
                </Text>
                <Text size="sm" weight="bold">
                  {formatMoney(debtResult.totalPaid)}
                </Text>
              </View>
            </Card>
          )}
        </View>
      )}

      {/* 4. PURCHASE AFFORDABILITY SIMULATOR */}
      {activeTool === 'affordability' && safeSpendData && (
        <View className="gap-3">
          <Card className="p-4 bg-card border border-border rounded-xl gap-3">
            <Text size="base" weight="bold">
              Purchase Affordability Simulator
            </Text>
            <Text size="xs" muted>
              Check whether a planned expense will cause a cash crunch before your next income.
            </Text>

            <View className="gap-1">
              <Text size="xs" muted>
                Item Cost ({currency}):
              </Text>
              <Input
                value={purchaseCost}
                onChangeText={setPurchaseCost}
                keyboardType="decimal-pad"
              />
            </View>
          </Card>

          {(() => {
            const cost = parseFloat(purchaseCost) || 0;
            const remainingSafe = safeSpendData.safeToSpend - cost;
            const isAffordable = remainingSafe >= 0;
            const pct = safeSpendData.safeToSpend > 0 ? Math.round((cost / safeSpendData.safeToSpend) * 100) : 100;

            return (
              <Card className="p-5 bg-card border border-border rounded-2xl gap-3">
                <View className="flex-row items-center justify-between">
                  <Text size="base" weight="bold">
                    Verdict
                  </Text>
                  <Badge
                    variant="outline"
                    className={isAffordable ? 'border-emerald-500' : 'border-rose-500'}
                  >
                    <Text
                      size="xs"
                      weight="bold"
                      className={isAffordable ? 'text-emerald-500' : 'text-rose-500'}
                    >
                      {isAffordable ? (pct <= 40 ? '✓ Confident Buy' : '⚠ Stretch Buy') : '✕ Unaffordable'}
                    </Text>
                  </Badge>
                </View>

                <View className="flex-row justify-between items-center py-1">
                  <Text size="sm" muted>
                    Safe Cash After Purchase:
                  </Text>
                  <Text
                    size="lg"
                    weight="bold"
                    className={remainingSafe >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                  >
                    {formatMoney(remainingSafe)}
                  </Text>
                </View>

                <Progress value={Math.min(100, pct)} className="h-2" />
                <Text size="xs" muted>
                  This purchase represents {pct}% of your current safe-to-spend runway.
                </Text>
              </Card>
            );
          })()}
        </View>
      )}

      {/* 5. CREDIT CARD UTILIZATION MONITOR */}
      {activeTool === 'credit_util' && creditSummary && (
        <View className="gap-3">
          <Card className="p-5 bg-card border border-border rounded-2xl gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <CreditCard size={18} color="#8B5CF6" />
                <Text size="base" weight="bold">
                  Aggregate Credit Utilization
                </Text>
              </View>

              <Badge
                variant="outline"
                className={creditSummary.hasHighUtilization ? 'border-rose-500' : 'border-emerald-500'}
              >
                <Text
                  size="xs"
                  weight="bold"
                  className={creditSummary.hasHighUtilization ? 'text-rose-500' : 'text-emerald-500'}
                >
                  {creditSummary.aggregateUtilizationRate}% Total
                </Text>
              </Badge>
            </View>

            <Progress value={Math.min(100, creditSummary.aggregateUtilizationRate)} className="h-2" />

            <View className="flex-row justify-between text-xs pt-1">
              <Text size="xs" muted>
                Total Debt: {formatMoney(creditSummary.totalBalance)}
              </Text>
              <Text size="xs" muted>
                Total Credit Limit: {formatMoney(creditSummary.totalLimit)}
              </Text>
            </View>

            {creditSummary.hasHighUtilization ? (
              <View className="p-3 bg-rose-500/10 rounded-xl flex-row items-center gap-2">
                <ShieldAlert size={18} color="#EF4444" />
                <Text size="xs" className="text-rose-600 flex-1">
                  Alert: Keeping utilization above 30% negatively affects credit scores. Aim to pay down balances.
                </Text>
              </View>
            ) : null}
          </Card>

          <View className="gap-2">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Individual Cards
            </Text>
            {creditSummary.cards.map(card => (
              <Card key={card.cardId} className="p-4 bg-card border border-border rounded-xl gap-2">
                <View className="flex-row justify-between items-center">
                  <Text size="sm" weight="semibold">
                    {card.name}
                  </Text>
                  <Text
                    size="sm"
                    weight="bold"
                    className={card.isHighRisk ? 'text-rose-500' : 'text-foreground'}
                  >
                    {card.utilizationRate}%
                  </Text>
                </View>
                <Progress value={Math.min(100, card.utilizationRate)} className="h-1.5" />
                <View className="flex-row justify-between">
                  <Text size="xs" muted>
                    Balance: {formatMoney(card.balance)}
                  </Text>
                  <Text size="xs" muted>
                    Limit: {formatMoney(card.limit)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

