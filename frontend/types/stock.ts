export interface StockProfile {
    ticker: string;
    name: string;
    sector: string;
    description: string;
    market_cap: number;
}

export interface StockPrice {
    price: number;
    change: number;
    change_percent: number;
}

export interface DividendHistoryItem {
    date: string;
    amount: number;
}

export interface DividendInfo {
    div_yield: number;
    frequency: string;
    growth_rate_5y: number;
    history: DividendHistoryItem[];
}

export interface FullStockData {
    profile: StockProfile;
    price: StockPrice;
    dividends: DividendInfo;
}
