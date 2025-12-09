'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FullStockData } from '@/types/stock';

export default function StockDetailPage() {
    const params = useParams();
    const ticker = params.ticker as string;

    const [data, setData] = useState<FullStockData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ticker) return;

        // Use Environment variable or default to localhost for development
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        fetch(`${API_URL}/api/stocks/${ticker}/full`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch stock data');
                return res.json();
            })
            .then((jsonData) => {
                setData(jsonData);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    }, [ticker]);

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
    if (error) return <div className="min-h-screen bg-gray-900 text-red-400 flex items-center justify-center">Error: {error}</div>;
    if (!data) return null;

    const { profile, price, dividends } = data;
    const isPositive = price.change >= 0;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold">{profile.ticker}</h1>
                            <span className="text-sm px-2 py-1 bg-gray-800 rounded text-gray-400">{profile.sector}</span>
                        </div>
                        <h2 className="text-xl text-gray-400 mt-1">{profile.name}</h2>
                    </div>
                    <div className="text-right mt-4 md:mt-0">
                        <div className="text-4xl font-mono font-bold">${price.price.toFixed(2)}</div>
                        <div className={`text-lg font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{price.change.toFixed(2)} ({price.change_percent.toFixed(2)}%)
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="mb-10 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 text-gray-300">Company Profile</h3>
                    <p className="text-gray-400 leading-relaxed">{profile.description}</p>
                    <div className="mt-4 text-sm text-gray-500">
                        Market Cap: <span className="text-gray-300">${(profile.market_cap / 1e9).toFixed(2)}B</span>
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Dividend Card */}
                    <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/30">
                        <h3 className="text-xl font-bold mb-4 text-blue-400">💰 Dividend Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                < p className="text-sm text-gray-500">Yield</p>
                                <p className="text-2xl font-mono font-semibold">{dividends.div_yield.toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Frequency</p>
                                <p className="text-lg font-semibold">{dividends.frequency}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">5Y Growth</p>
                                <p className="text-lg font-semibold text-emerald-400">+{dividends.growth_rate_5y}%</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Payments</h4>
                            <div className="space-y-2">
                                {dividends.history.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm border-b border-gray-700 pb-2 last:border-0">
                                        <span className="text-gray-500">{item.date}</span>
                                        <span className="font-mono text-emerald-300">${item.amount.toFixed(3)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Placeholder (To be implemented) */}
                    <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/30 flex flex-col justify-center items-center text-center">
                        <h3 className="text-xl font-bold mb-2 text-purple-400">🤖 AI Analysis</h3>
                        <p className="text-gray-500 mb-6">Deep analysis and summary will be generated by LLM here.</p>
                        <button
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                            disabled
                        >
                            Generate Report (Coming Soon)
                        </button>
                    </div>

                </div>
            </div>
        </main>
    );
}
