'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    // Dynamically determine API URL based on current hostname
    // This allows it to work on localhost and EC2 without ENV changes
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
      .then((data) => setWatchlist(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Personal Investment Assistant
        </h1>
      </div>

      <div className="relative flex place-items-center">
        <div className={`p-6 rounded-lg border ${error ? 'border-red-500 bg-red-900/20' : 'border-emerald-500 bg-emerald-900/20'}`}>
          <h2 className="text-2xl font-semibold mb-2">Backend Status</h2>
          <p className="text-lg">
            Response: <span className={`font-mono font-bold ${error ? 'text-red-400' : 'text-emerald-400'}`}>{status}</span>
          </p>
        </div>
      </div>

      <div className="mt-12 w-full max-w-5xl">
        <h2 className="text-2xl font-bold mb-4 px-4 text-emerald-400">Your Watchlist</h2>

        {watchlist.length === 0 ? (
          <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700">
            <p className="text-gray-400 mb-4">No stocks in your watchlist yet.</p>
            <p className="text-sm text-gray-500">Search for a stock (e.g. /stocks/AAPL) to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {watchlist.map((item) => (
              <a
                key={item.id}
                href={`/stocks/${item.ticker}`}
                className="block p-6 rounded-lg border border-gray-700 bg-gray-800/40 hover:bg-gray-700 transition-colors group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-white group-hover:text-emerald-400">{item.ticker}</span>
                  <span className="text-xs px-2 py-1 bg-gray-900 rounded text-gray-500">Stock</span>
                </div>
                <p className="text-sm text-gray-400">Click to view details &rarr;</p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-2 lg:text-left gap-4">

        <a href="/portfolio" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Portfolio{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            View your holdings and performance.
          </p>
        </a>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Analysis{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            AI-powered insights and summaries.
          </p>
        </div>
      </div>
    </main>
  );
}
