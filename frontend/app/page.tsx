'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    // 1. Strict Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login'; // Force redirect using window.location to avoid flash
      return;
    }

    // Dynamically determine API URL based on current hostname
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const API_URL = `${protocol}//${hostname}:8000`;

    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.message);
        setError(false);
      })
      .catch((err) => {
        console.error(err);
        setStatus('Error connecting to backend');
        setError(true);
      });

    // Fetch Watchlist
    fetch(`${API_URL}/api/watchlist`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch watchlist');
      })
    // Fetch Dashboard Data
    const fetchData = async () => {
      try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;

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
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 bg-[#050505]">
      {/* Header Section */}
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm lg:flex border-b border-gray-800 pb-6 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Personal Investment Assistant
          </h1>
          <p className="text-gray-500 text-xs">AI-Powered Market Intelligence</p>
        </div>

        {/* Right Header: Clock & Exchange Rate */}
        <div className="flex items-center gap-6 mt-4 lg:mt-0">
          {dashboardData && (
            <div className="text-right">
              <p className="text-xs text-gray-500">USD/KRW</p>
              <p className="text-xl font-bold text-yellow-500">
                ₩{dashboardData.exchange_rate?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
            </div>
          )}
          <LiveClock />
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Market Map (Spans 2 cols usually, or full width if preferred) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Market Heatmap
              </h2>
              <span className="text-xs text-gray-500">Real-time (Top 15)</span>
            </div>

            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
                Loading Market Data...
              </div>
            ) : (
              <MarketMap data={dashboardData?.heatmap || []} />
            )}
          </div>

          {/* Quick Actions / Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/portfolio" className="group p-5 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.02]">
              <h3 className="text-emerald-400 font-bold mb-1 group-hover:text-emerald-300">Portfolio &rarr;</h3>
              <p className="text-xs text-gray-400">View holdings, dividends & performance.</p>
            </Link>
            <Link href="/watchlist" className="group p-5 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.02]">
              <h3 className="text-blue-400 font-bold mb-1 group-hover:text-blue-300">Watchlist &rarr;</h3>
              <p className="text-xs text-gray-400">Track interested stocks & alerts.</p>
            </Link>
            <Link href="/analysis" className="group p-5 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.02]">
              <h3 className="text-purple-400 font-bold mb-1 group-hover:text-purple-300">AI Analysis &rarr;</h3>
              <p className="text-xs text-gray-400">Daily market briefing & smart insights.</p>
            </Link>
          </div>
        </div>

        {/* Right Col: AI Highlights / Feeds (Placeholder for future or quick stats) */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full min-h-[400px]">
            <h3 className="text-lg font-semibold text-white mb-4">Market Pulse</h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-800/50 rounded border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-1">Nasdaq (QQQ)</p>
                <div className="flex justify-between items-end">
                  <span className="text-lg font-mono font-bold text-white">
                    ${dashboardData?.heatmap?.find((x: any) => x.ticker === 'QQQ')?.price?.toFixed(2) || '---'}
                  </span>
                  {/* We didn't fetch QQQ in heatmap strict list, handled in generic */}
                </div>
              </div>
              {/* Add more widgets here later */}
              <div className="text-xs text-gray-500 italic">
                AI Signal: "Market is showing resilience in tech sector..."
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
