export interface Market {
  id: string;
  title: string;
  platform: 'kalshi' | 'polymarket';
  yes_price: number;
  no_price: number;
  volume: number;
  updated_at: string;
}

export interface ArbitrageOpportunity {
  kalshi_market: Market;
  poly_market: Market;
  profit_pct: number;
  direction: string;
  recommended_bet: number;
  estimated_return: number;
  detected_at: string;
}

export interface ArbitrageResponse {
  opportunities: ArbitrageOpportunity[];
  count: number;
  scanned_at: string;
  kalshi_count: number;
  poly_count: number;
}
