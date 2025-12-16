'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TickerSearch from '@/components/TickerSearch';
import OnboardingModal from '@/components/OnboardingModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ... interfaces ...
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
    next_payment_date: string;
    next_payment_amount: number;
}

interface DividendProjection {
    total_annual_income: number;
    monthly_average: number;
    this_month_income: number;
    items: DividendItem[];
}

export default function PortfolioPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'holdings' | 'analysis' | 'dividends'>('holdings');
    const [showOnboarding, setShowOnboarding] = useState(false);

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
    const [editingTicker, setEditingTicker] = useState<string | null>(null);

    // Check Onboarding
    useEffect(() => {
        const checkProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${API_URL}/api/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const profile = data.investment_profile || {};
                    if (!profile.primary_goal) {
                        setShowOnboarding(true);
                    }
                }
            } catch (e) {
                console.error("Profile check failed", e);
            }
        };
        checkProfile();
    }, []);

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
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    };

    const handleAuthError = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    const fetchPortfolio = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                handleAuthError();
                return;
            }

            if (!res.ok) throw new Error('포트폴리오 불러오기 실패');
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

            if (res.status === 401) {
                handleAuthError();
                return;
            }

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
        setActiveTab('analysis');
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio/analyze`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                handleAuthError();
                return;
            }

            if (!res.ok) throw new Error('분석 실패');
            const data = await res.json();
            setAnalysis(data.analysis);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAddOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const method = editingTicker ? 'PUT' : 'POST';
            const url = editingTicker
                ? `${getApiUrl()}/api/portfolio/${editingTicker}`
                : `${getApiUrl()}/api/portfolio`;

            const res = await fetch(url, {
                method: method,
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

            if (res.status === 401) {
                handleAuthError();
                return;
            }

            if (!res.ok) throw new Error(editingTicker ? '수정 실패' : '추가 실패');

            fetchPortfolio();
            setDividendData(null); // Reset dividends to force refetch

            // Reset Form and Mode
            resetForm();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleEdit = (item: PortfolioItem) => {
        setTicker(item.ticker);
        setShares(item.shares.toString());
        setAvgCost(item.average_cost.toString());
        setEditingTicker(item.ticker);
        // Optional: Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setTicker('');
        setShares('');
        setAvgCost('');
        setEditingTicker(null);
    };

    const handleDelete = async (ticker: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${getApiUrl()}/api/portfolio/${ticker}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                handleAuthError();
                return;
            }

            if (!res.ok) throw new Error('삭제 실패');
            fetchPortfolio();
            setDividendData(null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    // Calculate totals
    const totalValue = items.reduce((acc, item) => acc + item.current_value, 0);
    const totalCost = items.reduce((acc, item) => acc + (item.shares * item.average_cost), 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">로딩 중...</div>;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 cursor-pointer" onClick={() => router.push('/')}>
                        내 포트폴리오
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-700 font-medium"
                        >
                            🏠 홈으로
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded-lg transition-colors border border-red-900/50 font-medium"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex space-x-2 mb-8 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('holdings')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'holdings'
                            ? 'border-b-2 border-blue-500 text-blue-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        📊 보유 주식
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'analysis'
                            ? 'border-b-2 border-purple-500 text-purple-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        🤖 AI 분석
                    </button>
                    <button
                        onClick={() => setActiveTab('dividends')}
                        className={`pb-3 px-6 font-medium transition-all ${activeTab === 'dividends'
                            ? 'border-b-2 border-emerald-500 text-emerald-400'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t'}`}
                    >
                        💰 배당금
                    </button>
                </div>

                {/* CONTENT AREA */}

                {/* 1. HOLDINGS TAB */}
                {activeTab === 'holdings' && (
                    <div className="animate-fade-in">
                        {/* Summary Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">총 평가액</p>
                                <p className="text-3xl font-mono font-bold text-white">${totalValue.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">총 매입금액</p>
                                <p className="text-3xl font-mono font-bold text-gray-300">${totalCost.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-sm mb-1">총 손익</p>
                                <p className={`text-3xl font-mono font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)} ({totalGainPercent.toFixed(2)}%)
                                </p>
                            </div>
                        </div>

                        {/* Add/Edit Form */}
                        <div className={`p-6 rounded-xl border mb-8 backdrop-blur-sm transition-colors ${editingTicker ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
                            <h2 className="text-lg font-semibold mb-4 text-gray-300">
                                {editingTicker ? `매수 기록 수정 (${editingTicker})` : '주식 추가 (수동)'}
                            </h2>
                            <form onSubmit={handleAddOrUpdate} className="flex flex-col md:flex-row gap-4 items-start">
                                {/* Ticker Search - Disabled in Edit Mode */}
                                {editingTicker ? (
                                    <div className="flex-1 w-full md:w-auto p-3 bg-gray-800 rounded border border-gray-600 text-gray-400 font-mono">
                                        {editingTicker}
                                    </div>
                                ) : (
                                    <TickerSearch onSelect={(t) => setTicker(t)} />
                                )}

                                <input
                                    type="number" placeholder="보유 수량" step="0.0001"
                                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1 transition-colors w-full md:w-auto"
                                    value={shares} onChange={(e) => setShares(e.target.value)} required
                                />
                                <input
                                    type="number" placeholder="평단가 ($)" step="0.01"
                                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1 transition-colors w-full md:w-auto"
                                    value={avgCost} onChange={(e) => setAvgCost(e.target.value)} required
                                />

                                <div className="flex gap-2 w-full md:w-auto">
                                    <button type="submit" className={`${editingTicker ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-3 px-6 rounded transition-all hover:scale-105 shadow-lg flex-1`}>
                                        {editingTicker ? '수정하기' : '추가하기'}
                                    </button>
                                    {editingTicker && (
                                        <button type="button" onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 px-4 rounded transition-all">
                                            취소
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Table */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-400">
                                    <thead className="bg-gray-900 text-gray-200 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">티커</th>
                                            <th className="px-6 py-4">수량</th>
                                            <th className="px-6 py-4">평단가</th>
                                            <th className="px-6 py-4">현재가</th>
                                            <th className="px-6 py-4">평가금액</th>
                                            <th className="px-6 py-4">손익</th>
                                            <th className="px-6 py-4">관리</th>
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
                                                <td className="px-6 py-4 flex gap-2">
                                                    <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-300 hover:bg-blue-900/20 px-3 py-1 rounded transition-colors text-sm">
                                                        수정
                                                    </button>
                                                    <button onClick={() => handleDelete(item.ticker)} className="text-red-500 hover:text-red-300 hover:bg-red-900/20 px-3 py-1 rounded transition-colors text-sm">
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                                                    보유 중인 주식이 없습니다. 주식을 추가해보세요!
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
                                <h2 className="text-xl font-bold text-white">포트폴리오 정밀 진단</h2>
                                <p className="text-gray-400 text-sm">Gemini AI가 실시간 데이터를 기반으로 분석합니다.</p>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${analyzing
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105'
                                    }`}
                            >
                                {analyzing ? (
                                    <>
                                        <span className="animate-spin">🔄</span> 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span> {items.length === 0 ? 'AI 추천 포트폴리오 받기' : 'AI 보고서 생성'}
                                    </>
                                )}
                            </button>
                        </div>

                        {analysis && (
                            <div className="bg-gray-800/90 backdrop-blur border border-purple-500/30 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl text-purple-500 select-none">AI</div>
                                <div className="relative z-10">
                                    <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {analysis}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!analysis && !analyzing && (
                            <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-gray-700/50 border-dashed">
                                <p className="text-gray-500 text-lg">위 버튼을 눌러 상세한 전략 보고서를 받아보세요.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. DIVIDENDS TAB */}
                {activeTab === 'dividends' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Annual Income Card */}
                            <div className="bg-gradient-to-br from-emerald-900/50 to-gray-800 p-8 rounded-xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-emerald-200 mb-2 font-medium">예상 연 배당금</p>
                                    <h3 className="text-4xl font-bold text-white tracking-tight">
                                        ${dividendData?.total_annual_income.toFixed(2) || '0.00'}
                                    </h3>
                                    <p className="text-sm text-emerald-400 mt-2">최근 1년 배당 히스토리 기준</p>
                                </div>
                                <div className="absolute -right-4 -bottom-4 bg-emerald-500/20 blur-3xl w-48 h-48 rounded-full"></div>
                            </div>

                            {/* This Month Estimate Card */}
                            <div className="bg-gradient-to-br from-blue-900/30 to-gray-800 p-8 rounded-xl border border-blue-500/30 shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-blue-200 mb-2 font-medium">이번 달(12월) 예상 수령액</p>
                                    <h3 className="text-4xl font-bold text-white tracking-tight">
                                        ${dividendData?.this_month_income.toFixed(2) || '0.00'}
                                    </h3>
                                    <p className="text-sm text-blue-400 mt-2">지급 예정일 기준</p>
                                </div>
                            </div>

                            {/* Monthly Avg Card */}
                            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-center">
                                <p className="text-gray-400 mb-2 font-medium">월 평균 수령액 (추정)</p>
                                <h3 className="text-4xl font-bold text-white">
                                    ${dividendData?.monthly_average.toFixed(2) || '0.00'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">세전 기준</p>
                            </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-gray-700 bg-gray-800/80 backdrop-blur">
                                <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                                    <span>💰</span> 배당 상세 내역
                                </h2>
                            </div>

                            {loadingDiv ? (
                                <div className="p-12 text-center text-gray-400">
                                    <span className="animate-pulse">배당 데이터를 분석하고 있습니다...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4">티커</th>
                                                <th className="px-6 py-4">지급 주기</th>
                                                <th className="px-6 py-4">배당률</th>
                                                <th className="px-6 py-4">최근 지급액</th>
                                                <th className="px-6 py-4">최근 지급일</th>
                                                <th className="px-6 py-4 text-blue-400">다음 배당일 (예상)</th>
                                                <th className="px-6 py-4 text-emerald-400">예상 연 배당금</th>
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
                                                    <td className="px-6 py-4 text-blue-300 text-sm font-bold">
                                                        {item.next_payment_date}
                                                        {item.next_payment_amount > 0 && <span className="block text-xs font-normal text-gray-500">($ {item.next_payment_amount})</span>}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-emerald-300 bg-emerald-900/10">
                                                        ${item.annual_income.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!dividendData?.items || dividendData?.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                        배당 데이터가 없습니다. 배당주(예: O, KO, AAPL)를 추가해보세요.
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
            <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        </main>
    );
}
