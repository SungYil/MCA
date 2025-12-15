'use client';

interface MarketMapProps {
    data: {
        ticker: string;
        change_percent: number;
        price: number;
        weight: number;
    }[];
}

export default function MarketMap({ data }: MarketMapProps) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-[300px] bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-red-400 font-bold animate-pulse">
                ⚠️ No Market Data Available (Server Empty)
            </div>
        );
    }

    // Sort by weight desc for better visual layout
    const sortedData = [...data].sort((a, b) => b.weight - a.weight);
    const totalWeight = sortedData.reduce((sum, item) => sum + item.weight, 0);

    const getBgColor = (percent: number) => {
        if (percent > 3) return 'bg-emerald-600';
        if (percent > 1) return 'bg-emerald-500';
        if (percent > 0) return 'bg-emerald-400';
        if (percent === 0) return 'bg-gray-600';
        if (percent > -1) return 'bg-red-400';
        if (percent > -3) return 'bg-red-500';
        return 'bg-red-600';
    };

    return (
        <div className="w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-y-auto overflow-x-hidden border border-gray-700 flex flex-wrap content-start">
            {sortedData.map((item) => {
                const colorClass = getBgColor(item.change_percent);
                return (
                    <div
                        key={item.ticker}
                        className={`${colorClass} relative border border-gray-900/50 hover:brightness-110 transition-all cursor-default flex flex-col items-center justify-center text-white overflow-hidden p-1`}
                        style={{
                            flexGrow: item.weight,
                            minWidth: '60px',
                            height: '12.5%',  // ~8 rows visible
                            width: `${(item.weight / totalWeight) * 100 * 5}%` // Multiplier tuned for density
                        }}
                    >
                        <span className="font-bold text-xs md:text-sm drop-shadow-md truncate w-full text-center">{item.ticker}</span>
                        <span className="text-[10px] md:text-xs font-medium drop-shadow-md">
                            {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
