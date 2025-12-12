'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PortfolioItem {
    id: number;
    ticker: string;
    shares: number;
    average_cost: number;
    current_price: number;
    current_value: number;
    gain_loss: number;
    gain_loss_percent: number;
}

interface DividendItem {
    ticker: string;
    shares: number;
    div_yield: number;
    annual_income: number;
    frequency: string;
    last_payment_date: string;
    last_payment_amount: number;
}

interface DividendProjection {
    total_annual_income: number;
    monthly_average: number;
    items: DividendItem[];
}

export default function PortfolioPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'holdings' | 'analysis' | 'dividends'>('holdings');

    // Data States
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [dividendData, setDividendData] = useState<DividendProjection | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);

    // UI States
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [loadingDiv, setLoadingDiv] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [ticker, setTicker] = useState('');
    const [shares, setShares] = useState('');
    const [avgCost, setAvgCost] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchPortfolio();
    }, []);

    // Effect to fetch dividends when tab is active
    useEffect(() => {
        if (activeTab === 'dividends' && !dividendData) {
            fetchDividendData();
        }
    }, [activeTab]);

    const getApiUrl = () => {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        return process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;
    };

    const fetchPortfolio = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch portfolio');
            const data = await res.json();
            setItems(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDividendData = async () => {
        setLoadingDiv(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio/dividends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDividendData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDiv(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setAnalysis(null);
        setActiveTab('analysis'); // Force switch to analysis tab
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio/analyze`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            setAnalysis(data.analysis);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ticker,
                    shares: parseFloat(shares),
                    average_cost: parseFloat(avgCost)
                })
            });

            if (!res.ok) throw new Error('Failed to add item');

            fetchPortfolio();
            // Invalidate dividend data so it refetches next time
            setDividendData(null);
            setTicker('');
            setShares('');
            setAvgCost('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (ticker: string) => {
        if (!confirm('Are you sure you want to remove this stock?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio/${ticker}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete item');
            fetchPortfolio();
            setDividendData(null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Calculate totals
    const totalValue = items.reduce((acc, item) => acc + item.current_value, 0);
    const totalCost = items.reduce((acc, item) => acc + (item.shares * item.average_cost), 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    My Portfolio
                </h1>

                {/* TAB NAVIGATION */}
                <div className="flex space-x-2 mb-8 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('holdings')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'holdings'
                            ? 'border-b-2 border-blue-500 text-blue-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        📊 Holdings
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'analysis'
                            ? 'border-b-2 border-purple-500 text-purple-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        🤖 AI Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('dividends')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'dividends'
                            ? 'border-b-2 border-emerald-500 text-emerald-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        💰 Dividends
                    </button>
                </div>

                {/* CONTENT AREA */}

                {/* 1. HOLDINGS TAB */}
                {activeTab === 'holdings' && (
                    <div className="animate-fade-in">
                        {/* Summary Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">Total Value</p>
                                <p className="text-3xl font-mono font-bold text-white">${totalValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">Total Cost</p>
                                <p className="text-3xl font-mono font-bold text-gray-300">${totalCost.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">Total Gain/Loss</p>
                                <p className={`text-3xl font-mono font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)} ({totalGainPercent.toFixed(2)}%)
                                </p>
                            </div>
                        </div>

                        {/* Add Form */}
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8 backdrop-blur-sm">
                            <h2 className="text-lg font-semibold mb-4 text-gray-300">Add Transaction (Manual)</h2>
                            <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="text" placeholder="Ticker (e.g. AAPL)"
                                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1 transition-colors"
                                    value={ticker} onChange={(e) => setTicker(e.target.value)} required
                                />
                                <input
                                    type="number" placeholder="Shares" step="0.0001"
                                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1 transition-colors"
                                    value={shares} onChange={(e) => setShares(e.target.value)} required
                                />
                                <input
                                    type="number" placeholder="Avg Cost ($)" step="0.01"
                                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1 transition-colors"
                                    value={avgCost} onChange={(e) => setAvgCost(e.target.value)} required
                                />
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-all hover:scale-105 shadow-lg">
                                    Add Position
                                </button>
                            </form>
                        </div>

                        {/* Table */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-400">
                                    <thead className="bg-gray-900 text-gray-200 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Ticker</th>
                                            <th className="px-6 py-4">Shares</th>
                                            <th className="px-6 py-4">Avg Cost</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Value</th>
                                            <th className="px-6 py-4">Gain/Loss</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-white">
                                                    <a href={`/stocks/${item.ticker}`} className="hover:text-blue-400 hover:underline decoration-blue-400/50">{item.ticker}</a>
                                                </td>
                                                <td className="px-6 py-4 font-mono">{item.shares}</td>
                                                <td className="px-6 py-4 font-mono">${item.average_cost.toFixed(2)}</td>
                                                <td className="px-6 py-4 font-mono text-gray-300">${item.current_price.toFixed(2)}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-white">${item.current_value.toFixed(2)}</td>
                                                <td className={`px-6 py-4 font-mono font-medium ${item.gain_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {item.gain_loss >= 0 ? '+' : ''}{item.gain_loss.toFixed(2)} ({item.gain_loss_percent.toFixed(2)}%)
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => handleDelete(item.ticker)} className="text-red-500 hover:text-red-300 hover:bg-red-900/20 px-3 py-1 rounded transition-colors text-sm">
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                                                    No holdings yet. Add your first stock above!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. AI ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-white">Portfolio Health Check</h2>
                                <p className="text-gray-400 text-sm">Powered by Gemini AI with Real-time Data</p>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing || items.length === 0}
                                className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${analyzing || items.length === 0
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105'
                                    }`}
                            >
                                {analyzing ? (
                                    <>
                                        <span className="animate-spin">🔄</span> Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span> Generate Report
                                    </>
                                )}
                            </button>
                        </div>

                        {analysis && (
                            <div className="bg-gray-800/90 backdrop-blur border border-purple-500/30 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl text-purple-500 select-none">AI</div>
                                <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed whitespace-pre-wrap relative z-10">
                                    {analysis}
                                </div>
                            </div>
                        )}

                        {!analysis && !analyzing && (
                            <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-gray-700/50 border-dashed">
                                <p className="text-gray-500 text-lg">Click the button above to receive a comprehensive strategy report.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. DIVIDENDS TAB */}
                {activeTab === 'dividends' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Annual Income Card */}
                            <div className="bg-gradient-to-br from-emerald-900/50 to-gray-800 p-8 rounded-xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-emerald-200 mb-2 font-medium">Estimated Annual Income</p>
                                    <h3 className="text-4xl font-bold text-white tracking-tight">
                                        ${dividendData?.total_annual_income.toFixed(2) || '0.00'}
                                    </h3>
                                    <p className="text-sm text-emerald-400 mt-2">Based on TTM Yield & Frequency</p>
                                </div>
                                <div className="absolute -right-4 -bottom-4 bg-emerald-500/20 blur-3xl w-48 h-48 rounded-full"></div>
                            </div>

                            {/* Monthly Avg Card */}
                            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-center">
                                <p className="text-gray-400 mb-2 font-medium">Monthly Average (Est.)</p>
                                <h3 className="text-4xl font-bold text-white">
                                    ${dividendData?.monthly_average.toFixed(2) || '0.00'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">Before Tax</p>
                            </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-gray-700 bg-gray-800/80 backdrop-blur">
                                <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                                    <span>💰</span> Income Breakdown
                                </h2>
                            </div>

                            {loadingDiv ? (
                                <div className="p-12 text-center text-gray-400">
                                    <span className="animate-pulse">Loading dividend data...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4">Ticker</th>
                                                <th className="px-6 py-4">Share Frequency</th>
                                                <th className="px-6 py-4">Yield</th>
                                                <th className="px-6 py-4">Latest Payout</th>
                                                <th className="px-6 py-4">Last Payment Date</th>
                                                <th className="px-6 py-4 text-emerald-400">Est. Income (Yr)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {dividendData?.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-white">{item.ticker}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-300 capitalize">
                                                        <span className="px-2 py-1 bg-gray-700 rounded text-xs">{item.frequency || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-emerald-400">{item.div_yield}%</td>
                                                    <td className="px-6 py-4 font-mono text-gray-300">
                                                        {item.last_payment_amount > 0 ? `$${item.last_payment_amount}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400 text-sm">{item.last_payment_date}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-emerald-300 bg-emerald-900/10">
                                                        ${item.annual_income.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!dividendData?.items || dividendData?.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                        No dividend estimates available. Add dividend stocks (like O, KO) to see data.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
