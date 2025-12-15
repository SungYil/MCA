'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LiveClock from '../components/LiveClock';
import MarketMap from '../components/MarketMap';

export default function Home() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login'); // Use router.push for navigation
      return;
    }

    // Fetch Dashboard Data
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const res = await fetch(`${API_URL}/api/market/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (e) {
        console.error("Dashboard fetch failed", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds for semi-realtime feel without quota kill
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);

  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              MCA Global
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
            {[
              { name: 'Dashboard', path: '/', active: true },
              { name: 'Portfolio', path: '/portfolio', active: false },
              { name: 'Watchlist', path: '/watchlist', active: false },
              { name: 'AI Analysis', path: '/analysis', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${item.active
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {dashboardData?.exchange_rate && (
              <div className="hidden lg:flex items-center gap-2 text-sm bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                <span className="text-gray-500">USD/KRW</span>
                <span className="text-emerald-400 font-mono">₩{dashboardData.exchange_rate.toFixed(1)}</span>
              </div>
            )}
            <div className="hidden md:block">
              <LiveClock />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Main Content Grid: Heatmap (Left) | Pulse (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)] min-h-[600px]">

          {/* Left: Market Heatmap (Expanded) */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl p-1 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 left-6 z-10 pointer-events-none flex items-center gap-2 bg-gray-900/80 px-3 py-1 rounded-full backdrop-blur-sm border border-gray-800">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-white tracking-tight">Market Map</span>
            </div>

            {/* Heatmap Container - Takes full remaining height */}
            <div className="w-full h-full">
              {dashboardData?.heatmap ? (
                <MarketMap data={dashboardData.heatmap} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 animate-pulse">
                  Loading Market Data...
                </div>
              )}
            </div>
          </div>

          {/* Right: Market Pulse & Widgets */}
          <div className="space-y-4 flex flex-col h-full">
            {/* Pulse Widget */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                <span className="text-blue-400">⚡</span> Market Pulse
              </h3>

              <div className="space-y-4 flex-1">
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Nasdaq / S&P 500</p>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-mono font-bold text-white tracking-tighter">
                      {(() => {
                        const qqq = dashboardData?.heatmap?.find((x: any) => x.ticker === 'QQQ');
                        const spy = dashboardData?.heatmap?.find((x: any) => x.ticker === 'SPY');
                        const item = qqq || spy;
                        return item ? (
                          <span className={item.change_percent >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                          </span>
                        ) : <span className="text-gray-600">...</span>;
                      })()}
                    </span>
                    <span className="text-xs text-gray-400">QQQ/SPY</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">USD/KRW</p>
                  <div className="flex justify-between items-end">
                    <span className="text-xl font-mono text-white">
                      ₩{dashboardData?.exchange_rate?.toFixed(1) || '---'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 italic leading-relaxed">
                  "The stock market is designed to transfer money from the Active to the Patient."
                </p>
              </div>
            </div>

            {/* Mobile Navigation (Visible only on small screens) */}
            <div className="lg:hidden grid grid-cols-3 gap-2">
              <button onClick={() => router.push('/portfolio')} className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-xs text-emerald-400 font-bold">Portfolio</button>
              <button onClick={() => router.push('/watchlist')} className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-xs text-blue-400 font-bold">Watchlist</button>
              <button onClick={() => router.push('/analysis')} className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-xs text-purple-400 font-bold">Analysis</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
