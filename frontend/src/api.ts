import axios from 'axios';
import type { Market, ArbitrageResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  getKalshiMarkets: async (): Promise<Market[]> => {
    const { data } = await axios.get<Market[]>(`${BASE_URL}/markets/kalshi`);
    return data;
  },

  getPolymarkets: async (): Promise<Market[]> => {
    const { data } = await axios.get<Market[]>(`${BASE_URL}/markets/polymarket`);
    return data;
  },

  getArbitrageOpportunities: async (): Promise<ArbitrageResponse> => {
    const { data } = await axios.get<ArbitrageResponse>(`${BASE_URL}/arbitrage`);
    return data;
  },
};
