import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

export interface SidebarState {
    isOpen: boolean;
}

export type SidebarAction = { type: 'OPEN' } | { type: 'CLOSE' } | { type: 'TOGGLE' };

export function sidebarReducer(state: SidebarState, action: SidebarAction): SidebarState {
    switch (action.type) {
        case 'OPEN':
            return state.isOpen ? state : { isOpen: true };
        case 'CLOSE':
            return !state.isOpen ? state : { isOpen: false };
        case 'TOGGLE':
            return { isOpen: !state.isOpen };
        default:
            return state;
    }
}

export interface SidebarContextValue {
    isOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export interface SidebarProviderProps {
    children: ReactNode;
    initialOpen?: boolean;
}

export function SidebarProvider({ children, initialOpen = false }: SidebarProviderProps) {
    const [state, dispatch] = useReducer(sidebarReducer, { isOpen: initialOpen });

    const openSidebar = useCallback(() => {
        dispatch({ type: 'OPEN' });
    }, []);

    const closeSidebar = useCallback(() => {
        dispatch({ type: 'CLOSE' });
    }, []);

    const toggleSidebar = useCallback(() => {
        dispatch({ type: 'TOGGLE' });
    }, []);

    const value: SidebarContextValue = {
        isOpen: state.isOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar
    };

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
