'use client';

import { useState, useEffect } from 'react';

export default function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return <div className="h-8 w-32 bg-gray-800 animate-pulse rounded"></div>;

    // Format: 12:45:30 PM (US) or 14:30 (KR)
    // User asked for "Current Time". 
    // Showing NYC time and Local time is usually best for traders.

    const kstOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Seoul',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const estOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'America/New_York',
        hour: '2-digit', minute: '2-digit',
        hour12: true
    };

    return (
        <div className="flex items-center gap-4 text-sm font-mono text-gray-300">
            <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500">SEOUL (KST)</span>
                <span className="font-bold text-white text-lg">
                    {time.toLocaleTimeString('en-US', kstOptions)}
                </span>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div className="flex flex-col items-start">
                <span className="text-xs text-gray-500">NEW YORK (EST)</span>
                <span className="font-bold text-emerald-400 text-lg">
                    {time.toLocaleTimeString('en-US', estOptions)}
                </span>
            </div>
        </div>
    );
}
