'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Label
} from 'recharts';

interface PricePoint {
    date: string;
    close: number;
    volume: number;
}

interface StockChartProps {
    ticker: string;
    data?: PricePoint[];
    averageCost?: number;
}

// Helper to filter data based on range
const filterData = (data: PricePoint[], range: '1M' | '3M' | '6M' | '1Y') => {
    if (!data || data.length === 0) return [];
    const now = new Date();
    let pastDate = new Date();

    switch (range) {
        case '1M': pastDate.setMonth(now.getMonth() - 1); break;
        case '3M': pastDate.setMonth(now.getMonth() - 3); break;
        case '6M': pastDate.setMonth(now.getMonth() - 6); break;
        case '1Y': pastDate.setFullYear(now.getFullYear() - 1); break;
    }

    return data.filter(item => new Date(item.date) >= pastDate);
};

export default function StockChart({ ticker, averageCost }: StockChartProps) {
    const [data, setData] = useState<PricePoint[]>([]);
    const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

                // Fetch 1 Year by default
                const res = await fetch(`${API_URL}/api/stocks/${ticker}/history`);
                if (res.ok) {
                    const jsonData = await res.json();
                    // Sort by date ascending just in case
                    const sorted = jsonData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setData(sorted);
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };

        if (ticker) fetchData();
    }, [ticker]);

    const chartData = useMemo(() => filterData(data, range), [data, range]);

    if (loading) return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse">Loading Chart...</div>;
    if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-500">No chart data available</div>;

    const firstPrice = chartData.length > 0 ? chartData[0].close : 0;
    const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
    const isPositive = lastPrice >= firstPrice;
    const color = isPositive ? "#10b981" : "#ef4444"; // emerald-500 : red-500

    return (
        <div className="w-full">
            <div className="flex justify-end space-x-2 mb-4">
                {(['1M', '3M', '6M', '1Y'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`text-xs font-bold px-3 py-1 rounded transition-colors ${range === r
                            ? 'bg-gray-700 text-white border border-gray-600'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                    >
                        {r}
                    </button>
                ))}
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                            minTickGap={30}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `$${val.toFixed(0)}`}
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        {averageCost && (
                            <ReferenceLine y={averageCost} stroke="#fbbf24" strokeDasharray="5 5" strokeWidth={2}>
                                <Label value="Avg Cost" position="insideTopRight" fill="#fbbf24" fontSize={12} />
                            </ReferenceLine>
                        )}
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke={color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
