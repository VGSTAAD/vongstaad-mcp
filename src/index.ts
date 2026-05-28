#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const VONGSTAAD_ENV = process.env.VONGSTAAD_ENV || 'prod';
const SIGNAL_API_URL = 'https://vongstaad-signal-api.restless-pond-8b7b.workers.dev';

const TOOLS = [
  {
    name: "fx_live_price",
    description: "Returns the latest qualified crypto price from Vongstaad. Use when an agent needs the current price of BTCUSD, ETHUSD, SOLUSD or any supported crypto instrument before making a timing decision. Data is sourced from Binance and health-weighted. Payment via x402 on Base, no API key required.",
    inputSchema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair: BTCUSD, ETHUSD, SOLUSD, ADAUSD, DOTUSD, LINKUSD, AVAXUSD, MATICUSD, UNIUSD, ATOMUSD" }
      },
      required: ["pair"]
    }
  },
  {
    name: "fx_historical_signal",
    description: "Returns a computed quantitative signal from Vongstaad. Use when an agent needs regime state (trending/ranging/volatile), correlation between instruments, momentum direction, volatility estimate, mean reversion z-score, or SMA crossover signal before making a portfolio or risk decision. Models: sma, price, correlation, regime, momentum, volatility, mean-reversion. Windows: 7d, 30d, 90d. Payment via x402 on Base, no API key required.",
    inputSchema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair, e.g. BTCUSD" },
        model: { type: "string", description: "Model: sma, price, correlation, regime, momentum, volatility, mean-reversion" },
        window: { type: "string", description: "Window: 7d, 30d, 90d" }
      },
      required: ["pair", "model", "window"]
    }
  }
];

const server = new Server(
  { name: "vongstaad-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "fx_live_price": {
        const pair = (args as any).pair || 'BTCUSD';
        const response = await fetch(`${SIGNAL_API_URL}/v1/live/price?pair=${pair}`);
        const data = await response.json() as any;
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "fx_historical_signal": {
        const pair = (args as any).pair || 'BTCUSD';
        const model = (args as any).model || 'sma';
        const window = (args as any).window || '30d';
        const response = await fetch(`${SIGNAL_API_URL}/v1/historical/${model}?pair=${pair}&window=${window}`);
        const data = await response.json() as any;
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
