import { describe, it, expect } from 'vitest';
import { sidebarReducer, type SidebarState, type SidebarAction } from '../src/context/SidebarContext';

describe('SidebarContext reducer', () => {
    const initialState: SidebarState = { isOpen: false };

    it('opens sidebar when OPEN action is dispatched', () => {
        const nextState = sidebarReducer(initialState, { type: 'OPEN' });
        expect(nextState.isOpen).toBe(true);
    });

    it('keeps sidebar open if already open', () => {
        const openState: SidebarState = { isOpen: true };
        const nextState = sidebarReducer(openState, { type: 'OPEN' });
        expect(nextState.isOpen).toBe(true);
    });

    it('closes sidebar when CLOSE action is dispatched', () => {
        const openState: SidebarState = { isOpen: true };
        const nextState = sidebarReducer(openState, { type: 'CLOSE' });
        expect(nextState.isOpen).toBe(false);
    });

    it('keeps sidebar closed if already closed', () => {
        const nextState = sidebarReducer(initialState, { type: 'CLOSE' });
        expect(nextState.isOpen).toBe(false);
    });

    it('toggles sidebar state back and forth', () => {
        const state1 = sidebarReducer(initialState, { type: 'TOGGLE' });
        expect(state1.isOpen).toBe(true);

        const state2 = sidebarReducer(state1, { type: 'TOGGLE' });
        expect(state2.isOpen).toBe(false);
    });
});
