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

// Keep existing codes such as `chatgpt`, `disney`, and `prime` stable because
// they are stored in the local subscriptions table.
export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  { code: 'netflix', name: 'Netflix', color: '#E50914', defaultCategory: 'Entertainment' },
  { code: 'spotify', name: 'Spotify', color: '#1DB954', defaultCategory: 'Entertainment' },
  { code: 'youtube', name: 'YouTube Premium', color: '#FF0000', defaultCategory: 'Entertainment' },
  { code: 'youtube_music', name: 'YouTube Music', color: '#FF0000', defaultCategory: 'Entertainment' },
  { code: 'disney', name: 'Disney+', color: '#0063E5', defaultCategory: 'Entertainment' },
  { code: 'crunchyroll', name: 'Crunchyroll', color: '#F47521', defaultCategory: 'Entertainment' },
  { code: 'max', name: 'Max', color: '#5822B4', defaultCategory: 'Entertainment' },
  { code: 'prime', name: 'Amazon Prime Video', color: '#00A8E1', defaultCategory: 'Entertainment' },
  { code: 'apple', name: 'iCloud+', color: '#1D1D1F', defaultCategory: 'Cloud Storage' },
  { code: 'google_one', name: 'Google One', color: '#4285F4', defaultCategory: 'Cloud Storage' },
  { code: 'dropbox', name: 'Dropbox', color: '#0061FF', defaultCategory: 'Cloud Storage' },
  { code: 'chatgpt', name: 'ChatGPT Plus', color: '#10A37F', defaultCategory: 'Software' },
  { code: 'anthropic', name: 'Claude Pro', color: '#D97757', defaultCategory: 'Software' },
  { code: 'gemini', name: 'Google AI Pro', color: '#8E75B2', defaultCategory: 'Software' },
  { code: 'perplexity', name: 'Perplexity Pro', color: '#1FB8CD', defaultCategory: 'Software' },
  { code: 'deepseek', name: 'DeepSeek', color: '#5786FE', defaultCategory: 'Software' },
  { code: 'github_copilot', name: 'GitHub Copilot', color: '#24292F', defaultCategory: 'Software' },
  { code: 'cursor', name: 'Cursor Pro', color: '#111111', defaultCategory: 'Software' },
  { code: 'midjourney', name: 'Midjourney', color: '#111111', defaultCategory: 'Software' },
  { code: 'canva', name: 'Canva Pro', color: '#7D2AE8', defaultCategory: 'Software' },
  { code: 'microsoft_365', name: 'Microsoft 365', color: '#D83B01', defaultCategory: 'Software' },
  { code: 'adobe', name: 'Adobe Creative Cloud', color: '#EB1000', defaultCategory: 'Software' },
  { code: 'notion', name: 'Notion', color: '#000000', defaultCategory: 'Software' },
  { code: 'duolingo', name: 'Duolingo Super', color: '#58CC02', defaultCategory: 'News & Education' },
  { code: 'strava', name: 'Strava', color: '#FC4C02', defaultCategory: 'Fitness & Health' },
  { code: 'gym', name: 'Gym / Fitness', color: '#F97316', defaultCategory: 'Fitness & Health' },
  { code: 'internet', name: 'Fiber Internet', color: '#0284C7', defaultCategory: 'Utilities' },
  { code: 'custom', name: 'Custom Service', color: '#18342B', defaultCategory: 'Entertainment' },
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
