'use client';

import { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface PricePoint {
    date: string;
    close: number;
    volume: number;
}

interface StockChartProps {
    ticker: string;
}

export default function StockChart({ ticker }: StockChartProps) {
    const [data, setData] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;

            try {
                const res = await fetch(`${API_URL}/api/stocks/${ticker}/history`);
                if (res.ok) {
                    const json = await res.json();
                    // Sort by date ascending for chart
                    const sorted = json.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setData(sorted);
                }
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            } finally {
                setLoading(false);
            }
        };

        if (ticker) fetchData();
    }, [ticker]);

    if (loading) return <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse">Loading Chart...</div>;
    if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-500">No chart data available</div>;

    const minPrice = Math.min(...data.map(d => d.close)) * 0.95;
    const maxPrice = Math.max(...data.map(d => d.close)) * 1.05;
    const isPositive = data[data.length - 1].close >= data[0].close;
    const color = isPositive ? "#10b981" : "#ef4444"; // emerald-500 vs red-500

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(str) => str.substring(5)} // MM-DD
                        minTickGap={30}
                    />
                    <YAxis
                        domain={[minPrice, maxPrice]}
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
