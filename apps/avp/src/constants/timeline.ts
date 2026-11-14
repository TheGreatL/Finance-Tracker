export interface SceneSpec {
    id: string;
    number: number;
    title: string;
    badge: string;
    subtitle: string;
    startFrame: number;
    durationInFrames: number;
    screenFile: string;
    activeTab: 'dashboard' | 'accounts' | 'obligations' | 'advisor' | 'ledger' | 'analytics';
}

export const SCENE_DURATION_FRAMES = 105; // 3.5s @ 30fps

export const SCENES: ReadonlyArray<SceneSpec> = [
    {
        id: 'scene-1-dashboard',
        number: 1,
        title: 'Track Every Peso. 100% Offline.',
        badge: 'DASHBOARD HERO',
        subtitle: 'Net worth counter, cashflow pulse & instant quick actions',
        startFrame: 0,
        durationInFrames: 105, // 3.5s (0 - 104)
        screenFile: '01-dashboard.png',
        activeTab: 'dashboard'
    },
    {
        id: 'scene-2-sidebar',
        number: 2,
        title: '100% On-Device Privacy.',
        badge: 'SECURE ARCHITECTURE',
        subtitle: 'Encrypted local SQLite storage • Zero cloud account linking',
        startFrame: 105,
        durationInFrames: 105, // 3.5s (105 - 209)
        screenFile: '02-sidebar.png',
        activeTab: 'dashboard'
    },
    {
        id: 'scene-3-accounts',
        number: 3,
        title: 'All Your PH Banks & Wallets.',
        badge: 'ACCOUNTS & INSTITUTIONS',
        subtitle: 'BPI, BDO, Maya, GCash, GoTyme & SeaBank supported out of the box',
        startFrame: 210,
        durationInFrames: 105, // 3.5s (210 - 314)
        screenFile: '03-accounts.png',
        activeTab: 'accounts'
    },
    {
        id: 'scene-4-pockets',
        number: 4,
        title: 'Nested High-Yield Pockets.',
        badge: 'SMART SAVINGS',
        subtitle: 'Separate everyday spending wallets from 4.5% p.a. savings pockets',
        startFrame: 315,
        durationInFrames: 105, // 3.5s (315 - 419)
        screenFile: '04-institution-detail.png',
        activeTab: 'accounts'
    },
    {
        id: 'scene-5-salary',
        number: 5,
        title: 'Multi-Job Payroll & Streams.',
        badge: 'SALARY & JOBS',
        subtitle: 'Variable paydays, OT tracking & automated cutoff projections',
        startFrame: 420,
        durationInFrames: 105, // 3.5s (420 - 524)
        screenFile: '05-obligations-salary.png',
        activeTab: 'obligations'
    },
    {
        id: 'scene-6-deductions',
        number: 6,
        title: 'Automated Tax & Deductions.',
        badge: 'STATUTORY BREAKDOWN',
        subtitle: 'Instant SSS, PhilHealth, Pag-IBIG & withholding tax computation',
        startFrame: 525,
        durationInFrames: 105, // 3.5s (525 - 629)
        screenFile: '05-obligations-salary.png',
        activeTab: 'obligations'
    },
    {
        id: 'scene-7-loans',
        number: 7,
        title: 'Crush Debt & Claim Cashback.',
        badge: 'LOANS & UTANG',
        subtitle: 'GLoan, Maya Credit & spot utang with early payoff rebate alerts',
        startFrame: 630,
        durationInFrames: 105, // 3.5s (630 - 734)
        screenFile: '06-obligations-loans.png',
        activeTab: 'obligations'
    },
    {
        id: 'scene-8-subscriptions',
        number: 8,
        title: 'Never Miss a Renewal.',
        badge: 'RECURRING BILLS',
        subtitle: 'Auto-debit catch-up, billing cycles & offline payment reminders',
        startFrame: 735,
        durationInFrames: 105, // 3.5s (735 - 839)
        screenFile: '07-obligations-subscriptions.png',
        activeTab: 'obligations'
    },
    {
        id: 'scene-9-transfers',
        number: 9,
        title: 'Atomic Inter-Pocket Transfers.',
        badge: 'TRANSACTION LEDGER',
        subtitle: 'Instant reallocations between payroll & high-yield savings',
        startFrame: 840,
        durationInFrames: 105, // 3.5s (840 - 944)
        screenFile: '09-analytics.png',
        activeTab: 'ledger'
    },
    {
        id: 'scene-10-advisor',
        number: 10,
        title: 'Ask PocketBot Before You Spend.',
        badge: 'AI ADVISOR & OUTRO',
        subtitle: 'Taglish affordability checks • 100% Free & Open Source',
        startFrame: 945,
        durationInFrames: 105, // 3.5s (945 - 1049)
        screenFile: '10-advisor.png',
        activeTab: 'advisor'
    }
] as const;
