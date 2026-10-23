import type { InstitutionType } from '../types/database';

export interface InstitutionConfig {
  code: string;
  name: string;
  type: InstitutionType;
  color: string;
  icon: string;
  defaultPocketName: string;
  supportsInterest: boolean;
  defaultInterestRate?: number;
}

export const PHILIPPINE_INSTITUTIONS: Record<string, InstitutionConfig> = {
  maya: {
    code: 'maya',
    name: 'Maya',
    type: 'ewallet',
    color: '#00D665',
    icon: 'Smartphone',
    defaultPocketName: 'Wallet',
    supportsInterest: true,
    defaultInterestRate: 4.5,
  },
  gotyme: {
    code: 'gotyme',
    name: 'GoTyme Bank',
    type: 'bank',
    color: '#00B4D8',
    icon: 'Building2',
    defaultPocketName: 'Everyday Account',
    supportsInterest: true,
    defaultInterestRate: 4.0,
  },
  seabank: {
    code: 'seabank',
    name: 'SeaBank',
    type: 'bank',
    color: '#FF5722',
    icon: 'Building2',
    defaultPocketName: 'Savings Account',
    supportsInterest: true,
    defaultInterestRate: 4.5,
  },
  gcash: {
    code: 'gcash',
    name: 'GCash',
    type: 'ewallet',
    color: '#007DFE',
    icon: 'Smartphone',
    defaultPocketName: 'GCash Balance',
    supportsInterest: false,
  },
  grabpay: {
    code: 'grabpay',
    name: 'GrabPay',
    type: 'ewallet',
    color: '#00B14F',
    icon: 'Smartphone',
    defaultPocketName: 'Wallet',
    supportsInterest: false,
  },
  shopeepay: {
    code: 'shopeepay',
    name: 'ShopeePay',
    type: 'ewallet',
    color: '#EE4D2D',
    icon: 'ShoppingBag',
    defaultPocketName: 'ShopeePay Balance',
    supportsInterest: false,
  },
  lazada: {
    code: 'lazada',
    name: 'Lazada Wallet',
    type: 'ewallet',
    color: '#0F146D',
    icon: 'ShoppingBag',
    defaultPocketName: 'Lazada Balance',
    supportsInterest: false,
  },
  tiktok: {
    code: 'tiktok',
    name: 'TikTok Shop / Wallet',
    type: 'ewallet',
    color: '#010101',
    icon: 'Smartphone',
    defaultPocketName: 'TikTok Wallet',
    supportsInterest: false,
  },
  billease: {
    code: 'billease',
    name: 'BillEase',
    type: 'ewallet',
    color: '#0052FF',
    icon: 'Smartphone',
    defaultPocketName: 'BillEase Account',
    supportsInterest: false,
  },
  cimb: {
    code: 'cimb',
    name: 'CIMB Bank',
    type: 'bank',
    color: '#ED1C24',
    icon: 'Building2',
    defaultPocketName: 'FastPlus Account',
    supportsInterest: true,
    defaultInterestRate: 4.0,
  },
  tonik: {
    code: 'tonik',
    name: 'Tonik',
    type: 'bank',
    color: '#6F2DBD',
    icon: 'Building2',
    defaultPocketName: 'Tonik Account',
    supportsInterest: true,
    defaultInterestRate: 4.0,
  },
  bpi: {
    code: 'bpi',
    name: 'BPI',
    type: 'bank',
    color: '#B11116',
    icon: 'Building2',
    defaultPocketName: 'Checking/Savings',
    supportsInterest: false,
  },
  bdo: {
    code: 'bdo',
    name: 'BDO Unibank',
    type: 'bank',
    color: '#002B7F',
    icon: 'Building2',
    defaultPocketName: 'Savings Account',
    supportsInterest: false,
  },
  unionbank: {
    code: 'unionbank',
    name: 'UnionBank',
    type: 'bank',
    color: '#F58220',
    icon: 'Building2',
    defaultPocketName: 'Regular Savings',
    supportsInterest: false,
  },
  metrobank: {
    code: 'metrobank',
    name: 'Metrobank',
    type: 'bank',
    color: '#003882',
    icon: 'Building2',
    defaultPocketName: 'Savings Account',
    supportsInterest: false,
  },
  rcbc: {
    code: 'rcbc',
    name: 'RCBC',
    type: 'bank',
    color: '#0066B2',
    icon: 'Building2',
    defaultPocketName: 'OneAccount',
    supportsInterest: false,
  },
  security_bank: {
    code: 'security_bank',
    name: 'Security Bank',
    type: 'bank',
    color: '#005596',
    icon: 'Building2',
    defaultPocketName: 'All Access Account',
    supportsInterest: false,
  },
  cash: {
    code: 'cash',
    name: 'Cash Wallet',
    type: 'cash',
    color: '#10B981',
    icon: 'Banknote',
    defaultPocketName: 'Physical Cash',
    supportsInterest: false,
  },
  custom: {
    code: 'custom',
    name: 'Other Bank / Account',
    type: 'other',
    color: '#5C6E63',
    icon: 'Wallet',
    defaultPocketName: 'Main Pocket',
    supportsInterest: false,
  },
};

export function getInstitutionConfig(code: string): InstitutionConfig {
  const normalized = (code || '').toLowerCase().trim();
  return (
    PHILIPPINE_INSTITUTIONS[normalized] ?? {
      code: normalized || 'custom',
      name: code ? code.trim().toUpperCase() : 'Custom Account',
      type: 'other',
      color: '#5C6E63',
      icon: 'Wallet',
      defaultPocketName: 'Main Pocket',
      supportsInterest: false,
    }
  );
}

export const INSTITUTION_OPTIONS = Object.values(PHILIPPINE_INSTITUTIONS);

