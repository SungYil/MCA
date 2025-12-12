'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const fetchWatchlist = async () => {
            try {
                const protocol = window.location.protocol;
                const hostname = window.location.hostname;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;

                const res = await fetch(`${API_URL}/api/watchlist`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setWatchlist(data);
                }
            } catch (error) {
                console.error("Failed to fetch watchlist", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWatchlist();
    }, []);

    return (
        <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block transition-colors">
                    ← Back to Dashboard
                </Link>

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Your Watchlist
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : watchlist.length === 0 ? (
                    <div className="text-center p-12 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-gray-400 mb-4">No stocks tracked yet.</p>
                        <Link href="/" className="text-emerald-400 hover:underline">
                            Search stocks on the Home Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {watchlist.map((item: any) => (
                            <Link
                                key={item.id}
                                href={`/stocks/${item.ticker}`}
                                className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-all hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">{item.ticker}</h3>
                                        {/* Ideally fetch name/price here too, but for MVP just ticker */}
                                        <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">Stock</span>
                                    </div>
                                    <div className="text-right">
                                        {/* Placeholder for real-time price if available in item */}
                                        <p className="text-gray-500 text-sm">View Details &rarr;</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
