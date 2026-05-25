#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Environment switching via VONGSTAAD_ENV
const VONGSTAAD_ENV = process.env.VONGSTAAD_ENV || 'prod';

const SIGNAL_API_URL = VONGSTAAD_ENV === 'dev' || VONGSTAAD_ENV === 'testnet'
  ? 'https://vongstaad-signal-api.restless-pond-8b7b.workers.dev'
  : 'https://vongstaad-signal-api.restless-pond-8b7b.workers.dev'; // Same for now, will switch to custom domain

const AGENTIC_API_URL = VONGSTAAD_ENV === 'dev' || VONGSTAAD_ENV === 'testnet'
  ? 'https://vongstaad-data.restless-pond-8b7b.workers.dev'
  : 'https://vongstaad-data.vongstaad.com';

const TOOLS = [
  {
    name: "fx_live_price",
    description: "Get the latest live FX/crypto price from Vongstaad's qualified data feed. Returns the most recent consensus price for the requested pair.",
    inputSchema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair, e.g. BTCUSD, ETHUSD, EURUSD" }
      },
      required: ["pair"]
    }
  },
  {
    name: "fx_historical_signal",
    description: "Get a historical quant signal for a trading pair. Available models: sma, price, correlation, regime, momentum, volatility, mean-reversion. Windows: 7d, 30d, 90d.",
    inputSchema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair, e.g. BTCUSD" },
        model: { type: "string", description: "Model name: sma, price, correlation, regime, momentum, volatility, mean-reversion" },
        window: { type: "string", description: "Time window: 7d, 30d, 90d" }
      },
      required: ["pair", "model", "window"]
    }
  }
];

const server = new Server(
  { name: "vongstaad-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "fx_live_price": {
        const pair = (args as any).pair || 'BTCUSD';
        const response = await fetch(`${SIGNAL_API_URL}/v1/live/price?pair=${pair}`);
        const data = await response.json() as any;
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }
      
      case "fx_historical_signal": {
        const pair = (args as any).pair || 'BTCUSD';
        const model = (args as any).model || 'sma';
        const window = (args as any).window || '30d';
        const response = await fetch(`${SIGNAL_API_URL}/v1/historical/${model}?pair=${pair}&window=${window}`);
        const data = await response.json() as any;
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
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
