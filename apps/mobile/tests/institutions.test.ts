import { describe, it, expect } from 'vitest';
import {
  PHILIPPINE_INSTITUTIONS,
  getInstitutionConfig,
  INSTITUTION_OPTIONS,
} from '../src/constants/institutions';

describe('institutions', () => {
  it('PHILIPPINE_INSTITUTIONS contains expected providers with brand metadata', () => {
    // Test popular Philippine digital banks and e-wallets
    expect(PHILIPPINE_INSTITUTIONS['maya']).toBeDefined();
    expect(PHILIPPINE_INSTITUTIONS['maya'].color).toBe('#00D665');
    expect(PHILIPPINE_INSTITUTIONS['maya'].type).toBe('ewallet');
    expect(PHILIPPINE_INSTITUTIONS['maya'].supportsInterest).toBe(true);
    expect(PHILIPPINE_INSTITUTIONS['maya'].defaultInterestRate).toBe(4.5);

    expect(PHILIPPINE_INSTITUTIONS['gotyme']).toBeDefined();
    expect(PHILIPPINE_INSTITUTIONS['gotyme'].color).toBe('#00B4D8');
    expect(PHILIPPINE_INSTITUTIONS['gotyme'].type).toBe('bank');
    expect(PHILIPPINE_INSTITUTIONS['gotyme'].supportsInterest).toBe(true);

    expect(PHILIPPINE_INSTITUTIONS['gcash']).toBeDefined();
    expect(PHILIPPINE_INSTITUTIONS['gcash'].color).toBe('#007DFE');
    expect(PHILIPPINE_INSTITUTIONS['gcash'].type).toBe('ewallet');
    expect(PHILIPPINE_INSTITUTIONS['gcash'].supportsInterest).toBe(false);

    expect(PHILIPPINE_INSTITUTIONS['bpi']).toBeDefined();
    expect(PHILIPPINE_INSTITUTIONS['bpi'].color).toBe('#B11116');
    expect(PHILIPPINE_INSTITUTIONS['bpi'].type).toBe('bank');

    expect(PHILIPPINE_INSTITUTIONS['cash']).toBeDefined();
    expect(PHILIPPINE_INSTITUTIONS['cash'].type).toBe('cash');
  });

  it('getInstitutionConfig normalizes codes and returns matching config', () => {
    const maya = getInstitutionConfig('MAYA');
    expect(maya.code).toBe('maya');
    expect(maya.name).toBe('Maya');

    const bpi = getInstitutionConfig('  bpi  ');
    expect(bpi.code).toBe('bpi');
    expect(bpi.name).toBe('BPI');
  });

  it('getInstitutionConfig falls back gracefully for unknown codes', () => {
    const fallback = getInstitutionConfig('unknown_random_bank');
    expect(fallback.type).toBe('other');
    expect(fallback.color).toBeTruthy();
    expect(fallback.name).toContain('UNKNOWN');
  });

  it('INSTITUTION_OPTIONS lists all available catalog options', () => {
    expect(Array.isArray(INSTITUTION_OPTIONS)).toBe(true);
    expect(INSTITUTION_OPTIONS.length).toBeGreaterThanOrEqual(10);
    const codes = INSTITUTION_OPTIONS.map((item) => item.code);
    expect(codes).toContain('maya');
    expect(codes).toContain('bpi');
    expect(codes).toContain('gcash');
    expect(codes).toContain('cash');
    expect(codes).toContain('tiktok');
    expect(codes).toContain('lazada');
    expect(codes).toContain('billease');
  });
});
