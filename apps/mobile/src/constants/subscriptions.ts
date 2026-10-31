export interface SubscriptionPreset {
  code: string;
  name: string;
  color: string;
  defaultCategory: string;
}

export const SUBSCRIPTION_CATEGORIES: string[] = [
  'Entertainment',
  'Software',
  'Cloud Storage',
  'Utilities',
  'Fitness & Health',
  'Gaming',
  'News & Education',
  'Other',
];

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  {
    code: 'netflix',
    name: 'Netflix',
    color: '#E50914',
    defaultCategory: 'Entertainment',
  },
  {
    code: 'spotify',
    name: 'Spotify',
    color: '#1DB954',
    defaultCategory: 'Entertainment',
  },
  {
    code: 'youtube',
    name: 'YouTube Premium',
    color: '#FF0000',
    defaultCategory: 'Entertainment',
  },
  {
    code: 'disney',
    name: 'Disney+',
    color: '#0063E5',
    defaultCategory: 'Entertainment',
  },
  {
    code: 'apple',
    name: 'iCloud+',
    color: '#1D1D1F',
    defaultCategory: 'Cloud Storage',
  },
  {
    code: 'google_one',
    name: 'Google One',
    color: '#4285F4',
    defaultCategory: 'Cloud Storage',
  },
  {
    code: 'chatgpt',
    name: 'ChatGPT Plus',
    color: '#10A37F',
    defaultCategory: 'Software',
  },
  {
    code: 'canva',
    name: 'Canva Pro',
    color: '#7D2AE8',
    defaultCategory: 'Software',
  },
  {
    code: 'microsoft_365',
    name: 'Microsoft 365',
    color: '#D83B01',
    defaultCategory: 'Software',
  },
  {
    code: 'prime',
    name: 'Amazon Prime',
    color: '#00A8E1',
    defaultCategory: 'Entertainment',
  },
  {
    code: 'gym',
    name: 'Gym / Fitness',
    color: '#F97316',
    defaultCategory: 'Fitness & Health',
  },
  {
    code: 'internet',
    name: 'Fiber Internet',
    color: '#0284C7',
    defaultCategory: 'Utilities',
  },
  {
    code: 'custom',
    name: 'Custom Service',
    color: '#18342B',
    defaultCategory: 'Entertainment',
  },
];

export function getSubscriptionPreset(codeOrName?: string): SubscriptionPreset {
  const fallback = SUBSCRIPTION_PRESETS[SUBSCRIPTION_PRESETS.length - 1];
  if (!codeOrName) return fallback;

  const norm = codeOrName.toLowerCase().trim();
  const byCode = SUBSCRIPTION_PRESETS.find((p) => p.code === norm);
  if (byCode) return byCode;

  const byName = SUBSCRIPTION_PRESETS.find(
    (p) =>
      p.code !== 'custom' &&
      (norm.includes(p.code.replace('_', ' ')) ||
        norm.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(norm))
  );
  return byName ?? fallback;
}

