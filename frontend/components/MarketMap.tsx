'use client';

interface MarketMapProps {
    data: {
        ticker: string;
        change_percent: number;
        price: number;
        weight: number;
        sector?: string;
    }[];
}

// FINVIZ-style Categorized Treemap
export default function MarketMap({ data }: MarketMapProps) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full min-h-[500px] bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-red-400 font-bold animate-pulse">
                ⚠️ No Market Data Available (Server Empty)
            </div>
        );
    }

    // 1. Group data by Sector
    const sectors: { [key: string]: typeof data } = {};
    const sectorWeights: { [key: string]: number } = {};

    data.forEach(item => {
        const s = item.sector || "Others";
        if (!sectors[s]) {
            sectors[s] = [];
            sectorWeights[s] = 0;
        }
        sectors[s].push(item);
        sectorWeights[s] += item.weight;
    });

    // 2. Sort Sectors by Total Weight (Largest TopLeft)
    const sortedSectors = Object.keys(sectors).sort((a, b) => sectorWeights[b] - sectorWeights[a]);
    const totalMarketWeight = Object.values(sectorWeights).reduce((a, b) => a + b, 0);

    // 3. Finviz-style Muted/Professional Color Palette
    const getBgColor = (percent: number) => {
        if (percent > 3) return 'bg-[#0a4d3c]'; // Dark Green (Strong Buy)
        if (percent > 0) return 'bg-[#147a61]'; // Standard Green
        if (percent === 0) return 'bg-[#2d3748]'; // Gray (Neutral)
        if (percent > -3) return 'bg-[#82202b]'; // Standard Red
        return 'bg-[#5c131a]'; // Dark Red (Strong Sell)
    };

    return (
        <div className="w-full h-full min-h-[600px] bg-[#1a202c] rounded-lg overflow-hidden border border-gray-800 flex flex-wrap content-start p-1">
            {sortedSectors.map((sectorName) => {
                const sectorItems = sectors[sectorName].sort((a, b) => b.weight - a.weight);
                const sectorTotalWeight = sectorWeights[sectorName];

                // Calculate sizing for the SECTOR container
                // We use a relative width percentage based on total weight
                const sectorWidthPercent = (sectorTotalWeight / totalMarketWeight) * 100;

                return (
                    <div
                        key={sectorName}
                        className="flex flex-col border border-gray-900 bg-gray-900/50 relative group overflow-hidden"
                        style={{
                            // Approximate layout: Flex grow based on weight
                            flexGrow: sectorTotalWeight,
                            width: `${sectorWidthPercent * 1.5}%`, // Tuned multiplier for fitting
                            minWidth: '140px',
                            minHeight: '150px' // Ensure sector box has presence
                        }}
                    >
                        {/* Sector Header */}
                        <div className="bg-[#111] text-xs font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-gray-800 sticky top-0 z-10 truncate">
                            {sectorName}
                        </div>

                        {/* Stocks Container (Inner Flex) */}
                        <div className="flex-1 flex flex-wrap content-start w-full h-full">
                            {sectorItems.map(item => (
                                <div
                                    key={item.ticker}
                                    className={`${getBgColor(item.change_percent)} border border-gray-900 hover:brightness-125 transition-all cursor-pointer flex flex-col items-center justify-center text-white overflow-hidden p-0.5 relative group/item`}
                                    style={{
                                        flexGrow: item.weight,
                                        width: `${(item.weight / sectorTotalWeight) * 100}%`,
                                        minWidth: '50px',
                                        minHeight: '40px'
                                    }}
                                    title={`${item.ticker}: ${item.change_percent}%`}
                                >
                                    <span className="font-bold text-xs md:text-sm drop-shadow-sm truncate w-full text-center leading-tight">
                                        {item.ticker}
                                    </span>
                                    <span className="text-[10px] font-medium opacity-80 leading-none mt-0.5">
                                        {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
