#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration
const VONGSTAAD_ENDPOINT = "https://vongstaad-data.vongstaad.com/v1/correlation";
const DISCOVERY_URL = "https://vongstaad-data.vongstaad.com/.well-known/x402.json";

// In-memory state
let walletPrivateKey = process.env.WALLET_PRIVATE_KEY || "";
let cachedDiscovery: any = null;

// x402: Get challenge from Vongstaad
async function getChallenge(): Promise<any> {
  const resp = await fetch(VONGSTAAD_ENDPOINT);
  if (resp.status !== 402) throw new Error("Expected 402 challenge");
  return resp.json();
}

// x402: Submit proof and get data
async function submitProof(proof: any): Promise<any> {
  const resp = await fetch(VONGSTAAD_ENDPOINT, {
    headers: { "X-Payment-Proof": JSON.stringify(proof) }
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Payment verification failed");
  }
  return resp.json();
}

// Sign challenge with wallet (simplified — in production uses proper x402 library)
async function signAndPay(challenge: any): Promise<any> {
  // For now: return a proof structure that Vongstaad can verify
  // In production: use @x402/client to sign and pay on-chain
  const proof = {
    transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    signature: challenge.signature,
    expiresAt: challenge.expiresAt,
    recipient: challenge.recipient,
    amount: challenge.amount,
    challengeId: challenge.challengeId
  };
  return proof;
}

// Tool: fx_correlation
async function fxCorrelation(args: any): Promise<string> {
  const pairs = (args.pairs || ["EURUSD"]).join(",");
  const window = args.window || "30d";

  // Round 1: Get challenge
  const challenge = await getChallenge();

  // Round 2: Sign and pay
  const proof = await signAndPay(challenge);

  // Round 3: Submit proof, get data
  const data = await submitProof(proof);

  return JSON.stringify({
    pairs: pairs.split(","),
    correlation: data.correlation,
    price: data.price,
    timestamp: data.timestamp,
    source: data.source,
    cost: `${challenge.amount} ${challenge.currency} on ${challenge.network}`,
    note: "This is a demonstration. Real x402 payment requires wallet integration."
  }, null, 2);
}

// MCP Server setup
const server = new Server(
  { name: "vongstaad-mcp-fx", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fx_correlation",
        description: "Get the correlation coefficient between FX currency pairs. Pay per call via x402 — no API key or subscription required. Returns correlation data from Vongstaad's real-time model.",
        inputSchema: {
          type: "object",
          properties: {
            pairs: {
              type: "array",
              items: { type: "string" },
              description: "Currency pairs to check correlation for (e.g., ['EURUSD', 'GBPUSD'])",
              default: ["EURUSD"]
            },
            window: {
              type: "string",
              enum: ["7d", "30d", "90d"],
              description: "Time window for correlation calculation",
              default: "30d"
            }
          },
          required: ["pairs"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "fx_correlation") {
    try {
      const result = await fxCorrelation(args);
      return { content: [{ type: "text", text: result }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vongstaad MCP FX Server running on stdio");
  console.error("Endpoint:", VONGSTAAD_ENDPOINT);
  console.error("Wallet configured:", walletPrivateKey ? "✅" : "⚠️  WALLET_PRIVATE_KEY not set");
}

main().catch(console.error);
