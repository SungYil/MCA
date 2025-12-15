'use client';

import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

interface MarketMapProps {
    data: {
        ticker: string;
        change_percent: number;
        price: number;
        weight: number;
    }[];
}

const CustomizedContent = (props: any) => {
    const { x, y, width, height, depth, payload, name } = props;

    // Only render leaf nodes (depth 1 in our case, since we have Root -> Tickers)
    if (depth < 1 || !payload) return <g />;

    // Safety check for change_percent
    const percent = payload.change_percent !== undefined ? payload.change_percent : 0;

    // Determine color based on % change
    let bgColor = '#374151'; // default grey
    if (percent > 3) bgColor = '#059669'; // emerald-600
    else if (percent > 1) bgColor = '#10B981'; // emerald-500
    else if (percent > 0) bgColor = '#34D399'; // emerald-400
    else if (percent === 0) bgColor = '#4B5563'; // gray-600
    else if (percent > -1) bgColor = '#F87171'; // red-400
    else if (percent > -3) bgColor = '#EF4444'; // red-500
    else bgColor = '#DC2626'; // red-600

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: bgColor,
                    stroke: '#111827', // darker border
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 30 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 - 6}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 5, 14)}
                    fontWeight="bold"
                    pointerEvents="none"
                >
                    {name}
                </text>
            )}
            {width > 30 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 10}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 7, 11)}
                    pointerEvents="none"
                >
                    {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
                </text>
            )}
        </g>
    );
};

export default function MarketMap({ data }: MarketMapProps) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-[300px] bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-red-400 font-bold animate-pulse">
                ⚠️ No Market Data Available (Server Empty)
            </div>
        );
    }

    // Transform data for Recharts Treemap input format (needs 'children' for standard tree, but flat list works if configured right)
    // Actually Recharts expects: [{name: 'axis', children: [...]}]

    // We group them into a single root for simplicity
    const treeData = [
        {
            name: "Market",
            children: data.map(item => ({
                name: item.ticker,
                size: item.weight, // Used for area size
                ...item
            }))
        }
    ];

    return (
        <div className="w-full h-[300px] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={treeData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    isAnimationActive={false}
                    content={<CustomizedContent />}
                >
                    <Tooltip
                        content={({ payload }) => {
                            if (payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-gray-800 border border-gray-600 p-2 rounded text-xs text-white shadow-lg z-50">
                                        <p className="font-bold">{d.name}</p>
                                        <p>Price: ${d.price}</p>
                                        <p className={d.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                            Change: {d.change_percent.toFixed(2)}%
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
}
