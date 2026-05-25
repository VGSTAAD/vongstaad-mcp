# Vongstaad MCP Server

MCP (Model Context Protocol) server for Vongstaad quant models. Connect AI agents (Claude, GPT) to real-time and historical FX/crypto quant signals.

## Quick Start

```bash
npx @vongstaad/mcp-fx
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

### Testnet (free testing)
```json
{
  "mcpServers": {
    "vongstaad-fx": {
      "command": "npx",
      "args": ["tsx", "/path/to/vongstaad-mcp/src/index.ts"],
      "env": {
        "VONGSTAAD_ENV": "testnet"
      }
    }
  }
}
```

### Production (real payments)
```json
{
  "mcpServers": {
    "vongstaad-fx": {
      "command": "npx",
      "args": ["tsx", "/path/to/vongstaad-mcp/src/index.ts"]
    }
  }
}
```

## Available Tools

### fx_live_price
Get the latest live price for any trading pair.
- `pair`: Trading pair (e.g., BTCUSD, ETHUSD, SOLUSD)

### fx_historical_signal
Get a historical quant signal.
- `pair`: Trading pair (e.g., BTCUSD)
- `model`: Model name (sma, price, correlation, regime, momentum, volatility, mean-reversion)
- `window`: Time window (7d, 30d, 90d)

## Models

| Model | Description | Windows |
|-------|-------------|---------|
| sma | Simple Moving Average crossover | 7d, 30d, 90d |
| price | Latest qualified close price | 7d, 30d, 90d |
| correlation | BTC/ETH Pearson correlation | 7d, 30d, 90d |
| regime | Market regime detection | 30d, 90d |
| momentum | Directional momentum | 7d, 30d |
| volatility | Annualized realized volatility | 7d, 30d, 90d |
| mean-reversion | Z-score from rolling mean | 30d, 90d |

## Environment Variables

- `VONGSTAAD_ENV`: Set to `testnet` for free testing, or omit for production.
