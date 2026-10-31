import { describe, it, expect } from 'vitest';
import { filterSelectOptions, type SelectOption } from '../src/components/common/SearchableSelectModal';

const SAMPLE_OPTIONS: SelectOption[] = [
  { id: 'gcash', label: 'GCash', subtitle: 'E-Wallet', keywords: 'globe g-cash' },
  { id: 'bdo', label: 'BDO Unibank', subtitle: 'Traditional Bank', keywords: 'banco de oro' },
  { id: 'netflix', label: 'Netflix', subtitle: 'Entertainment', badge: '₱549/mo' },
  { id: 'spotify', label: 'Spotify', subtitle: 'Entertainment', keywords: 'music streaming' },
];

describe('filterSelectOptions', () => {
  it('returns all options when search query is empty or whitespace', () => {
    expect(filterSelectOptions(SAMPLE_OPTIONS, '')).toHaveLength(4);
    expect(filterSelectOptions(SAMPLE_OPTIONS, '   ')).toHaveLength(4);
  });

  it('filters options case-insensitively by label, subtitle, badge, or keywords', () => {
    expect(filterSelectOptions(SAMPLE_OPTIONS, 'bdo').map((o) => o.id)).toEqual(['bdo']);
    expect(filterSelectOptions(SAMPLE_OPTIONS, 'ENTERTAINMENT').map((o) => o.id)).toEqual([
      'netflix',
      'spotify',
    ]);
    expect(filterSelectOptions(SAMPLE_OPTIONS, 'music').map((o) => o.id)).toEqual(['spotify']);
    expect(filterSelectOptions(SAMPLE_OPTIONS, '549').map((o) => o.id)).toEqual(['netflix']);
  });

  it('returns empty array when no options match', () => {
    expect(filterSelectOptions(SAMPLE_OPTIONS, 'nonexistent-bank')).toEqual([]);
  });
});

