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

export default function PortfolioPage() {
    const router = useRouter();
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
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

    const fetchPortfolio = async () => {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/api/portfolio`, {
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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/api/portfolio`, {
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

            // Refresh list and clear form
            fetchPortfolio();
            setTicker('');
            setShares('');
            setAvgCost('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (ticker: string) => {
        if (!confirm('Are you sure you want to remove this stock?')) return;

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/api/portfolio/${ticker}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete item');
            fetchPortfolio();
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
                <h1 className="text-3xl font-bold mb-8 text-emerald-400">My Portfolio</h1>

                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <p className="text-gray-400 text-sm">Total Value</p>
                        <p className="text-3xl font-mono font-bold">${totalValue.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <p className="text-gray-400 text-sm">Total Cost</p>
                        <p className="text-3xl font-mono font-bold text-gray-300">${totalCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                        <p className={`text-3xl font-mono font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)} ({totalGainPercent.toFixed(2)}%)
                        </p>
                    </div>
                </div>

                {/* Add New Item Form */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mb-12">
                    <h2 className="text-xl font-semibold mb-4 text-gray-300">Add Transaction (Manual)</h2>
                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Ticker (e.g. AAPL)"
                            className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-emerald-500 outline-none flex-1"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Shares"
                            step="0.0001"
                            className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-emerald-500 outline-none flex-1"
                            value={shares}
                            onChange={(e) => setShares(e.target.value)}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Avg Cost ($)"
                            step="0.01"
                            className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-emerald-500 outline-none flex-1"
                            value={avgCost}
                            onChange={(e) => setAvgCost(e.target.value)}
                            required
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded transition-colors">
                            Add / Update
                        </button>
                    </form>
                </div>

                {/* Holdings Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-400">
                        <thead className="bg-gray-800 text-gray-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Ticker</th>
                                <th className="px-6 py-3">Shares</th>
                                <th className="px-6 py-3">Avg Cost</th>
                                <th className="px-6 py-3">Current Price</th>
                                <th className="px-6 py-3">Market Value</th>
                                <th className="px-6 py-3">Gain/Loss</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {items.map((item) => (
                                <tr key={item.id} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white">
                                        <a href={`/stocks/${item.ticker}`} className="hover:text-emerald-400 underline">{item.ticker}</a>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{item.shares}</td>
                                    <td className="px-6 py-4 font-mono">${item.average_cost.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-mono">${item.current_price.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-white">${item.current_value.toFixed(2)}</td>
                                    <td className={`px-6 py-4 font-mono ${item.gain_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.gain_loss >= 0 ? '+' : ''}{item.gain_loss.toFixed(2)} ({item.gain_loss_percent.toFixed(2)}%)
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(item.ticker)}
                                            className="text-red-500 hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                                        No holdings yet. Add your first stock above!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
