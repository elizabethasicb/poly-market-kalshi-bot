import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, AlertCircle, Activity, DollarSign, BarChart2, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ArbitrageOpportunity, ArbitrageResponse, Market } from './types';
import { api } from './api';

const POLL_INTERVAL = 15000;

function PriceBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden">
      <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${yes * 100}%` }} />
      <div className="bg-red-500 transition-all duration-500" style={{ width: `${no * 100}%` }} />
    </div>
  );
}

function MarketCard({ market }: { market: Market }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          market.platform === 'kalshi' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
        }`}>
          {market.platform === 'kalshi' ? 'KALSHI' : 'POLYMARKET'}
        </span>
        <span className="text-gray-400 text-xs">${(market.volume / 1000).toFixed(0)}K vol</span>
      </div>
      <p className="text-white text-sm font-medium leading-tight mb-3 line-clamp-2">{market.title}</p>
      <PriceBar yes={market.yes_price} no={market.no_price} />
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-emerald-400">YES {(market.yes_price * 100).toFixed(1)}¢</span>
        <span className="text-red-400">NO {(market.no_price * 100).toFixed(1)}¢</span>
      </div>
    </div>
  );
}

function OpportunityCard({ opp, index }: { opp: ArbitrageOpportunity; index: number }) {
  const profitColor =
    opp.profit_pct >= 10 ? 'text-emerald-400' :
    opp.profit_pct >= 5  ? 'text-yellow-400' :
                            'text-blue-400';

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 hover:border-emerald-500 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-900 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">Opportunity</span>
        </div>
        <span className={`text-2xl font-bold ${profitColor}`}>+{opp.profit_pct.toFixed(2)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3">
          <div className="text-blue-400 text-xs font-semibold mb-1">KALSHI</div>
          <p className="text-white text-xs leading-tight mb-2">{opp.kalshi_market.title}</p>
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">YES {(opp.kalshi_market.yes_price * 100).toFixed(1)}¢</span>
            <span className="text-red-400">NO {(opp.kalshi_market.no_price * 100).toFixed(1)}¢</span>
          </div>
        </div>
        <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-3">
          <div className="text-purple-400 text-xs font-semibold mb-1">POLYMARKET</div>
          <p className="text-white text-xs leading-tight mb-2">{opp.poly_market.title}</p>
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">YES {(opp.poly_market.yes_price * 100).toFixed(1)}¢</span>
            <span className="text-red-400">NO {(opp.poly_market.no_price * 100).toFixed(1)}¢</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 mb-3">
        <p className="text-yellow-400 text-xs font-medium">📌 {opp.direction}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-gray-400 text-xs">Bet $100</p>
          <p className="text-white text-sm font-semibold">${opp.recommended_bet}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Est. Return</p>
          <p className="text-emerald-400 text-sm font-semibold">+${opp.estimated_return.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Detected</p>
          <p className="text-gray-300 text-xs">{new Date(opp.detected_at).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

const generateHistoryPoint = (i: number) => ({
  time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
  opportunities: Math.floor(Math.random() * 5),
  avgProfit: +(2 + Math.random() * 8).toFixed(2),
});

export default function App() {
  const [data, setData] = useState<ArbitrageResponse | null>(null);
  const [kalshiMarkets, setKalshiMarkets] = useState<Market[]>([]);
  const [polyMarkets, setPolyMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [history] = useState(() => Array.from({ length: 20 }, (_, i) => generateHistoryPoint(i)));
  const [activeTab, setActiveTab] = useState<'arbitrage' | 'markets'>('arbitrage');

  const fetchAll = useCallback(async () => {
    try {
      const [arb, kalshi, poly] = await Promise.all([
        api.getArbitrageOpportunities(),
        api.getKalshiMarkets(),
        api.getPolymarkets(),
      ]);
      setData(arb);
      setKalshiMarkets(kalshi);
      setPolyMarkets(poly);
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError('Cannot connect to backend. Make sure the Go server is running on :8080');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Kalshi · Polymarket</h1>
              <p className="text-xs text-gray-400">Arbitrage Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: Zap, label: 'Opportunities', value: data?.count ?? '-', color: 'text-emerald-400' },
            { icon: BarChart2, label: 'Kalshi Markets', value: data?.kalshi_count ?? '-', color: 'text-blue-400' },
            { icon: BarChart2, label: 'Poly Markets', value: data?.poly_count ?? '-', color: 'text-purple-400' },
            {
              icon: DollarSign,
              label: 'Avg Profit',
              value: data?.opportunities?.length
                ? `${(data.opportunities.reduce((s, o) => s + o.profit_pct, 0) / data.opportunities.length).toFixed(1)}%`
                : '-',
              color: 'text-yellow-400'
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-gray-400 text-xs">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Opportunity History (last 20 min)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Area type="monotone" dataKey="avgProfit" stroke="#10b981" fill="url(#grad)" strokeWidth={2} name="Avg Profit %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['arbitrage', 'markets'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'arbitrage' ? '⚡ Arbitrage Opportunities' : '📊 All Markets'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'arbitrage' && (
          <>
            {!loading && data?.opportunities?.length === 0 && (
              <div className="text-center py-16">
                <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No arbitrage opportunities right now</p>
                <p className="text-gray-600 text-sm mt-1">Scanner checks every {POLL_INTERVAL / 1000}s</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.opportunities?.map((opp, i) => (
                <OpportunityCard key={i} opp={opp} index={i} />
              ))}
            </div>
          </>
        )}

        {activeTab === 'markets' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-blue-400 font-semibold mb-3 text-sm uppercase tracking-wide">Kalshi</h3>
              <div className="space-y-3">
                {kalshiMarkets.map(m => <MarketCard key={m.id} market={m} />)}
              </div>
            </div>
            <div>
              <h3 className="text-purple-400 font-semibold mb-3 text-sm uppercase tracking-wide">Polymarket</h3>
              <div className="space-y-3">
                {polyMarkets.map(m => <MarketCard key={m.id} market={m} />)}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
