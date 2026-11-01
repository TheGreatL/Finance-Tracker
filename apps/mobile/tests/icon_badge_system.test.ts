import { describe, it, expect } from 'vitest';
import React from 'react';
import { getCategoryVisualConfig, CategoryIcon } from '../src/components/common/CategoryIcon';
import { PocketBadge } from '../src/components/accounts/PocketBadge';

describe('CategoryIcon resolver', () => {
    it('maps food and dining to Utensils and terracotta tint', () => {
        const config = getCategoryVisualConfig('Food & Dining');
        expect(config.color).toBe('#C2410C');
        expect(config.backgroundColor).toBe('#FFEDD5');
    });

    it('maps groceries and shopping to ShoppingBag and amber tint', () => {
        const config = getCategoryVisualConfig('Groceries');
        expect(config.color).toBe('#D97706');
        expect(config.backgroundColor).toBe('#FEF3C7');
    });

    it('maps transportation and gas to Car and violet tint', () => {
        const config = getCategoryVisualConfig('Transportation');
        expect(config.color).toBe('#7C3AED');
        expect(config.backgroundColor).toBe('#EDE9FE');
    });

    it('maps utilities and bills to Zap and blue tint', () => {
        const config = getCategoryVisualConfig('Bills & Utilities');
        expect(config.color).toBe('#2563EB');
        expect(config.backgroundColor).toBe('#DBEAFE');
    });

    it('maps salary to Briefcase and emerald tint', () => {
        const config = getCategoryVisualConfig('Salary', 'income');
        expect(config.color).toBe('#18342B');
        expect(config.backgroundColor).toBe('#D1FAE5');
    });

    it('maps transfer to Repeat with neutral stone tint', () => {
        const config = getCategoryVisualConfig('', 'transfer');
        expect(config.color).toBe('#57534E');
        expect(config.backgroundColor).toBe('#F5F5F4');
    });

    it('falls back to Tag and warm gray for unrecognized categories', () => {
        const config = getCategoryVisualConfig('Random Miscellaneous');
        expect(config.color).toBe('#78716C');
        expect(config.backgroundColor).toBe('#F5F5F4');
    });

    it('renders CategoryIcon without crashing with and without background', () => {
        const iconWithBg = CategoryIcon({ category: 'Food & Dining', size: 24, showBackground: true });
        expect(iconWithBg).toBeDefined();

        const iconWithoutBg = CategoryIcon({ category: 'Transportation', size: 20, showBackground: false });
        expect(iconWithoutBg).toBeDefined();
    });

    it('renders PocketBadge correctly with institution code and fallback types', () => {
        const institutionBadge = PocketBadge({ institutionCode: 'bdo', size: 20 });
        expect(institutionBadge).toBeDefined();

        const savingsBadge = PocketBadge({ pocketType: 'savings', size: 20 });
        expect(savingsBadge).toBeDefined();

        const walletBadge = PocketBadge({ pocketType: 'wallet', size: 20 });
        expect(walletBadge).toBeDefined();
    });
});
