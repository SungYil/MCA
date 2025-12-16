'use client';

import { useState, useEffect, useRef } from 'react';

interface TickerResult {
    ticker: string;
    name: string;
    description?: string;
    exchangeCode?: string;
}

interface TickerSearchProps {
    onSelect: (ticker: string) => void;
}

export default function TickerSearch({ onSelect }: TickerSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TickerResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 1) {
                setResults([]);
                return;
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            try {
                // Determine API URL (same logic as page)
                const res = await fetch(`${API_URL}/api/stocks/search?query=${query}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error("Search failed", error);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchResults();
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelect = (ticker: string) => {
        setQuery(ticker);
        onSelect(ticker);
        setShowDropdown(false);
    };

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <input
                type="text"
                placeholder="티커 검색 (예: AA -> AAPL)"
                className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none transition-colors uppercase"
                value={query}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setQuery(val);
                    onSelect(val); // Propagate text input immediately to parent
                    setShowDropdown(true);
                }}
                required
            />

            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map((item) => (
                        <div
                            key={item.ticker}
                            className="p-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700/50 last:border-0"
                            onClick={() => handleSelect(item.ticker)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white">{item.ticker}</span>
                                <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded">{item.exchangeCode || 'US'}</span>
                            </div>
                            <div className="text-xs text-gray-400 truncate">{item.name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
