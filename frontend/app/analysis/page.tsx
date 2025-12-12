'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AnalysisPage() {
    const [report, setReport] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

                const res = await fetch(`${API_URL}/api/market/analysis`);
                if (!res.ok) throw new Error("Failed to fetch analysis");

                const data = await res.json();
                setReport(data.analysis);
            } catch (err) {
                console.error(err);
                setError("분석 리포트를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, []);

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => window.location.href = '/'}
                    className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                    ← Home
                </button>

                <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8 shadow-2xl">
                    <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Today's Market Briefing
                    </h1>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                            <p className="text-gray-400 animate-pulse">AI is analyzing global markets...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-200">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="prose prose-invert max-w-none prose-headings:text-emerald-300 prose-a:text-blue-400">
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
