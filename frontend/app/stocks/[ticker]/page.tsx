'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FullStockData } from '@/types/stock';
import StockChart from '@/components/StockChart';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function StockDetailPage() {
    const params = useParams();
    const ticker = params.ticker as string;

    const [data, setData] = useState<FullStockData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [report, setReport] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);

    const handleGenerateReport = async () => {
        setIsAnalyzing(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${API_URL}/api/stocks/${ticker}/analyze`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to generate report');
            const data = await res.json();
            setReport(data.report);
        } catch (err) {
            console.error(err);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleWatchlist = async () => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            if (isInWatchlist) {
                await fetch(`${API_URL}/api/watchlist/${ticker}`, { method: 'DELETE' });
                setIsInWatchlist(false);
            } else {
                await fetch(`${API_URL}/api/watchlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticker }),
                });
                setIsInWatchlist(true);
            }
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
            alert('Failed to update watchlist');
        }
    };

    const checkWatchlistStatus = async () => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${API_URL}/api/watchlist`);
            if (res.ok) {
                const list = await res.json();
                const exists = list.some((item: any) => item.ticker === ticker);
                setIsInWatchlist(exists);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [avgCost, setAvgCost] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!ticker) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Fetch Stock Data
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

        checkWatchlistStatus();
        fetchPortfolioItem(); // Check for ownership/avg cost
    }, [ticker]);

    const fetchPortfolioItem = async () => {
        // Simple way: Fetch all and find. 
        // Optimization: Create specific endpoint later if needed.
        const token = localStorage.getItem('token');
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${API_URL}/api/portfolio`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                const item = list.find((p: any) => p.ticker === ticker);
                if (item) {
                    setAvgCost(item.average_cost);
                }
            }
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
    // ... error handling ...
    if (!data && !loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">No Data Found</div>;
    if (!data) return null;

    const { profile, price, dividends } = data;
    const isPositive = price.change >= 0;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => window.location.href = '/portfolio'}
                    className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                    ← Back to Dashboard
                </button>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold">{profile.ticker}</h1>
                            <span className="text-sm px-2 py-1 bg-gray-800 rounded text-gray-400">{profile.sector}</span>
                            <button
                                onClick={toggleWatchlist}
                                className="ml-2 text-2xl focus:outline-none transition-transform hover:scale-110"
                                title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                            >
                                {isInWatchlist ? "⭐" : "☆"}
                            </button>
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

                {/* Chart Section */}
                <div className="mb-8 bg-gray-800/30 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-300">Price History</h3>
                        {avgCost && (
                            <span className="text-sm text-yellow-500 font-mono bg-yellow-900/20 px-2 py-1 rounded">
                                My Avg Cost: ${avgCost.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <StockChart ticker={ticker} averageCost={avgCost} />
                </div>

                {/* Description */}
                <div className="mb-10 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-300">Company Profile</h3>
                        {data.sec_filings_url && (
                            <a
                                href={data.sec_filings_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full border border-gray-600 transition-colors flex items-center gap-1"
                                title="Official SEC Filings (10-K, 10-Q)"
                            >
                                🏛️ Verify on SEC EDGAR
                            </a>
                        )}
                    </div>
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
                    <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/30 flex flex-col items-start min-h-[300px]">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">🤖 AI Analysis</h3>

                        {!report && (
                            <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
                                <p className="text-gray-500 mb-6">Deep analysis and summary will be generated by LLM here.</p>
                                <button
                                    onClick={handleGenerateReport}
                                    className={`px-4 py-2 rounded-md transition-colors ${isAnalyzing
                                        ? 'bg-purple-800 text-gray-300 cursor-wait'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                        }`}
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? 'Analyzing...' : 'Generate Report'}
                                </button>
                            </div>
                        )}

                        {report && (
                            <div className="w-full relative z-10">
                                <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed font-sans">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {report}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </main>
    );
}
