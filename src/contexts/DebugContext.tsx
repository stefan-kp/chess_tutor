"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DebugEntry {
    id: string;
    timestamp: number;
    type: 'tutor' | 'analysis';
    action: string; // e.g., "Best Move", "Hint", "General Question", "Move Analysis"
    prompt: string;
    response?: string;
    metadata?: Record<string, any>;
}

interface DebugContextType {
    isDebugMode: boolean;
    entries: DebugEntry[];
    addEntry: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
    clearEntries: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
    // Check if debug mode is enabled via environment variable
    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';
    const [entries, setEntries] = useState<DebugEntry[]>([]);

    const addEntry = (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => {
        if (!isDebugMode) return; // Don't track if debug mode is off
        
        const newEntry: DebugEntry = {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };
        
        setEntries(prev => [...prev, newEntry]);
    };

    const clearEntries = () => {
        setEntries([]);
    };

    return (
        <DebugContext.Provider value={{ isDebugMode, entries, addEntry, clearEntries }}>
            {children}
        </DebugContext.Provider>
    );
}

export function useDebug() {
    const context = useContext(DebugContext);
    if (context === undefined) {
        throw new Error('useDebug must be used within a DebugProvider');
    }
    return context;
}

