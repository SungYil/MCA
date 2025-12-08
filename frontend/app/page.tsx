'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
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

      <div className="mt-12 grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Watchlist{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Track your favorite stocks.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Portfolio{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            View your holdings and performance.
          </p>
        </div>

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
