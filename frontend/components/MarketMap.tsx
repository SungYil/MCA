'use client';
import { useState } from 'react';

interface MarketMapProps {
    data: {
        ticker: string;
        change_percent: number;
        price: number;
        weight: number;
        sector?: string;
    }[];
}

// Custom Treemap Types
interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface MarketItem {
    ticker: string;
    change_percent: number;
    price: number;
    weight: number;
    sector?: string;
}

interface TreemapNode extends MarketItem {
    rect: Rect;
}

interface SectorNode {
    name: string;
    weight: number;
    rect: Rect;
    items: TreemapNode[];
}

// FINVIZ-style Categorized Treemap (Custom Slice-and-Dice Layout)
export default function MarketMap({ data }: MarketMapProps) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full min-h-[500px] bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-red-400 font-bold animate-pulse">
                ⚠️ No Market Data Available (Server Empty)
            </div>
        );
    }

    // --- Layout Engine ---

    // Sort items desc
    const sortedData = [...data].sort((a, b) => b.weight - a.weight);

    // Group by Sector
    const sectorsMap: { [key: string]: MarketItem[] } = {};
    const sectorWeights: { [key: string]: number } = {};

    sortedData.forEach(item => {
        const s = item.sector || "Others";
        if (!sectorsMap[s]) {
            sectorsMap[s] = [];
            sectorWeights[s] = 0;
        }
        sectorsMap[s].push(item);
        sectorWeights[s] += item.weight;
    });

    const sectorNames = Object.keys(sectorsMap).sort((a, b) => sectorWeights[b] - sectorWeights[a]);

    // Recursive Slice-and-Dice function
    // items: list of objects with 'weight'
    // rect: available drawing area {x, y, w, h} (in percentages 0-100)
    // returns: list of items strictly mapped to rects
    function layoutItems<T extends { weight: number }>(items: T[], rect: Rect): (T & { rect: Rect })[] {
        if (items.length === 0) return [];
        if (items.length === 1) {
            return [{ ...items[0], rect: { ...rect } }];
        }

        // Split logic: Take the first (largest) item, give it a slice, recurse
        const totalW = items.reduce((sum, i) => sum + i.weight, 0);
        const item = items[0];
        const itemShare = item.weight / totalW;

        const result: (T & { rect: Rect })[] = [];

        let itemRect: Rect;
        let remainderRect: Rect;

        // Split along longest axis to maintain aspect ratio aspect
        if (rect.w > rect.h) {
            // Split Vertically (Left | Right)
            const itemW = rect.w * itemShare;
            itemRect = { x: rect.x, y: rect.y, w: itemW, h: rect.h };
            remainderRect = { x: rect.x + itemW, y: rect.y, w: rect.w - itemW, h: rect.h };
        } else {
            // Split Horizontally (Top | Bottom)
            const itemH = rect.h * itemShare;
            itemRect = { x: rect.x, y: rect.y, w: rect.w, h: itemH };
            remainderRect = { x: rect.x, y: rect.y + itemH, w: rect.w, h: rect.h - itemH };
        }

        result.push({ ...item, rect: itemRect });

        // Recurse for the rest
        const remainderItems = layoutItems(items.slice(1), remainderRect);
        return [...result, ...remainderItems];
    }

    // 1. Layout Sectors
    const sectorNodesInput = sectorNames.map(name => ({ name, weight: sectorWeights[name] }));
    const sectorLayout = layoutItems(sectorNodesInput, { x: 0, y: 0, w: 100, h: 100 });

    // 2. Layout Stocks within Sectors
    const finalTree: SectorNode[] = sectorLayout.map(sectorNode => {
        const items = sectorsMap[sectorNode.name];
        // Layout items relative to 0-100% of the SECTOR box
        const itemLayout = layoutItems(items, { x: 0, y: 0, w: 100, h: 100 });

        return {
            name: sectorNode.name,
            weight: sectorNode.weight,
            rect: sectorNode.rect,
            items: itemLayout
        };
    });


    // Color Palette
    const getBgColor = (percent: number) => {
        if (percent > 3) return 'bg-[#0a4d3c]';
        if (percent > 0) return 'bg-[#147a61]';
        if (percent === 0) return 'bg-[#2d3748]';
        if (percent > -3) return 'bg-[#82202b]';
        return 'bg-[#610b15]'; // Default for very negative
    };

    // Tooltip State
    const [hoveredItem, setHoveredItem] = useState<MarketItem | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className="w-full h-full min-h-[600px] relative bg-[#1a202c] rounded-lg overflow-hidden border border-gray-800 select-none">
            {finalTree.map((sector) => (
                <div
                    key={sector.name}
                    className="absolute border border-gray-900 bg-gray-900/20 overflow-hidden group"
                    style={{
                        left: `${sector.rect.x}%`,
                        top: `${sector.rect.y}%`,
                        width: `${sector.rect.w}%`,
                        height: `${sector.rect.h}%`,
                    }}
                >
                    {/* Sector Label */}
                    {sector.rect.h > 5 && sector.rect.w > 5 && (
                        <div className="absolute top-0 left-0 bg-[#00000080] text-[10px] md:text-xs font-bold text-gray-300 px-1 py-0.5 z-10 truncate max-w-full pointer-events-none border-b border-r border-gray-900/50 rounded-br">
                            {sector.name}
                        </div>
                    )}

                    {/* Stock Items */}
                    {sector.items.map((stock) => (
                        <div
                            key={stock.ticker}
                            className={`absolute ${getBgColor(stock.change_percent)} border border-gray-900/50 hover:brightness-125 transition-all cursor-pointer flex flex-col items-center justify-center text-white overflow-hidden`}
                            style={{
                                left: `${stock.rect.x}%`,
                                top: `${stock.rect.y}%`,
                                width: `${stock.rect.w}%`,
                                height: `${stock.rect.h}%`,
                            }}
                            onMouseEnter={() => setHoveredItem(stock)}
                            onMouseLeave={() => setHoveredItem(null)}
                            onMouseMove={handleMouseMove}
                            title="" // Disable default browser tooltip
                        >
                            {/* Adaptive Text Sizing */}
                            <span
                                className="font-bold drop-shadow-sm truncate text-center leading-tight w-full px-0.5"
                                style={{
                                    fontSize: Math.min(stock.rect.w * 4, stock.rect.h * 1.5, 16) + 'px'
                                }}
                            >
                                {stock.ticker}
                            </span>
                            {stock.rect.h > 15 && (
                                <span
                                    className="font-medium opacity-80 leading-none mt-0.5"
                                    style={{
                                        fontSize: Math.min(stock.rect.w * 3, 11) + 'px'
                                    }}
                                >
                                    {stock.change_percent > 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {/* Custom Tooltip Overlay */}
            {hoveredItem && (
                <div
                    className="fixed z-50 bg-gray-900 text-white rounded-lg px-3 py-2 shadow-2xl border border-gray-700 pointer-events-none flex flex-col gap-1 min-w-[120px]"
                    style={{
                        left: mousePos.x + 15,
                        top: mousePos.y + 15,
                    }}
                >
                    <div className="flex justify-between items-center border-b border-gray-700 pb-1 mb-1">
                        <span className="font-bold text-lg">{hoveredItem.ticker}</span>
                        <span className={`font-mono font-bold ${hoveredItem.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {hoveredItem.change_percent > 0 ? '+' : ''}{hoveredItem.change_percent.toFixed(2)}%
                        </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Price</span>
                        <span className="text-white">${hoveredItem.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Sector</span>
                        <span className="text-white">{hoveredItem.sector || 'N/A'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
