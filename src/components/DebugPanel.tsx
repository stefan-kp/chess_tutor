"use client";

import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useDebug, DebugEntry } from '@/contexts/DebugContext';

interface DebugPanelProps {
    /** Optional: Filter to show only specific entry ID */
    entryId?: string;
    /** Optional: Show inline next to content (default: false, shows as floating panel) */
    inline?: boolean;
}

export default function DebugPanel({ entryId, inline = false }: DebugPanelProps) {
    const { isDebugMode, entries, clearEntries } = useDebug();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<DebugEntry | null>(null);

    if (!isDebugMode) return null;

    const displayEntries = entryId 
        ? entries.filter(e => e.id === entryId)
        : entries;

    const latestEntry = displayEntries[displayEntries.length - 1];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    // Inline mode: Show icon next to content
    if (inline && latestEntry) {
        return (
            <div className="inline-flex items-center ml-2">
                <button
                    onClick={() => setSelectedEntry(selectedEntry?.id === latestEntry.id ? null : latestEntry)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400"
                    title="Show debug info"
                >
                    <Bug size={16} />
                </button>
                
                {selectedEntry?.id === latestEntry.id && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEntry(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                            <DebugEntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Floating panel mode: Show all entries
    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <div className="bg-purple-600 dark:bg-purple-700 text-white rounded-lg shadow-lg">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-purple-700 dark:hover:bg-purple-800 rounded-t-lg"
                >
                    <div className="flex items-center gap-2">
                        <Bug size={20} />
                        <span className="font-semibold">Debug Mode</span>
                        <span className="text-xs bg-purple-800 dark:bg-purple-900 px-2 py-1 rounded">
                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>

                {isExpanded && (
                    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-b-lg max-h-96 overflow-auto">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-semibold">LLM Interactions</span>
                            <button
                                onClick={clearEntries}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                title="Clear all entries"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        {entries.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                No debug entries yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {entries.map((entry) => (
                                    <button
                                        key={entry.id}
                                        onClick={() => setSelectedEntry(entry)}
                                        className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-sm">{entry.action}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatTimestamp(entry.timestamp)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {entry.type === 'tutor' ? '🎓 Tutor' : '📊 Analysis'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEntry(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <DebugEntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
                    </div>
                </div>
            )}
        </div>
    );
}

function DebugEntryDetail({ entry, onClose }: { entry: DebugEntry; onClose: () => void }) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold">{entry.action}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.type === 'tutor' ? '🎓 Tutor' : '📊 Analysis'} • {new Date(entry.timestamp).toLocaleString()}
                    </p>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    ✕
                </button>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Prompt</h4>
                    <button
                        onClick={() => copyToClipboard(entry.prompt)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1 text-sm"
                    >
                        <Copy size={14} /> Copy
                    </button>
                </div>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                    {entry.prompt}
                </pre>
            </div>

            {entry.response && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Response</h4>
                        <button
                            onClick={() => copyToClipboard(entry.response!)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1 text-sm"
                        >
                            <Copy size={14} /> Copy
                        </button>
                    </div>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                        {entry.response}
                    </pre>
                </div>
            )}

            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div>
                    <h4 className="font-semibold mb-2">Metadata</h4>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

