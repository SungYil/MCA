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
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, value, change_percent } = props;

    if (!payload) return null;

    const percent = payload.change_percent;
    // Determine color based on % change
    // Finviz style: 
    // > +3% : #0a5c36 (Strong Green)
    // +1~+3%: #1a9e60
    // 0~+1% : #3ebf83
    // 0     : #444444 (Grey)
    // -1~0% : #e85858 
    // -1~-3%: #d62d2d
    // < -3% : #a61b1b (Strong Red)

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
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {width > 30 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 5, height / 5, 16)}
                    fontWeight="bold"
                >
                    {name}
                </text>
            )}
            {width > 30 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 14}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 7, height / 7, 12)}
                >
                    {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
                </text>
            )}
        </g>
    );
};

export default function MarketMap({ data }: MarketMapProps) {
    if (!data || data.length === 0) return <div className="text-gray-500 text-sm">No map data available.</div>;

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
