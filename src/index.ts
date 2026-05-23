#!/usr/bin/env node
import * as readline from 'readline';

const SIGNAL_API = "https://vongstaad-signal-api.vongstaad-orchestrator-coders.workers.dev";
const DISCOVERY = "https://vongstaad-data.vongstaad.com/.well-known/x402.json";

async function callSignalAPI(endpoint: string, pair: string, window: string): Promise<any> {
  const url = `${SIGNAL_API}${endpoint}?pair=${pair}&window=${window}`;
  
  // Round 1: Get challenge
  const challengeResp = await fetch(url);
  if (challengeResp.status !== 402) {
    return challengeResp.json();
  }
  const challenge = await challengeResp.json();
  
  // Round 2: Submit proof (using placeholder — real wallet integration needed)
  const proof = {
    transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    signature: challenge.signature,
    expiresAt: challenge.expiresAt,
    recipient: challenge.recipient,
    amount: challenge.amount,
    challengeId: challenge.challengeId
  };
  
  const resp = await fetch(url, { headers: { "X-Payment-Proof": JSON.stringify(proof) } });
  return resp.json();
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line: string) => {
  try {
    const msg = JSON.parse(line);
    let result: any = {};

    if (msg.method === 'initialize') {
      result = { protocolVersion: '2024-11-05', serverInfo: { name: 'vongstaad-mcp-fx', version: '1.0.0' }, capabilities: { tools: {} } };
    } else if (msg.method === 'tools/list') {
      result = {
        tools: [
          {
            name: 'fx_live_price',
            description: 'Get real-time FX price from current hour — for live trading decisions. Premium pricing.',
            inputSchema: {
              type: 'object',
              properties: {
                pair: { type: 'string', description: 'Currency pair (e.g., BTCUSD, ETHUSD)', default: 'BTCUSD' }
              },
              required: ['pair']
            }
          },
          {
            name: 'fx_historical_correlation',
            description: 'Get precomputed correlation over historical window — for research and strategy validation. Volume pricing.',
            inputSchema: {
              type: 'object',
              properties: {
                pair: { type: 'string', description: 'Base pair for correlation (e.g., BTCUSD_ETHUSD)', default: 'BTCUSD_ETHUSD' },
                window: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Time window', default: '30d' }
              },
              required: ['pair']
            }
          },
          {
            name: 'fx_historical_price',
            description: 'Get historical price signal over window — for backtesting and research. Volume pricing.',
            inputSchema: {
              type: 'object',
              properties: {
                pair: { type: 'string', description: 'Currency pair', default: 'BTCUSD' },
                window: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Time window', default: '30d' }
              },
              required: ['pair']
            }
          }
        ]
      };
    } else if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params;
      try {
        let data;
        if (name === 'fx_live_price') {
          data = await callSignalAPI('/v1/live/price', args.pair || 'BTCUSD', '');
        } else if (name === 'fx_historical_correlation') {
          data = await callSignalAPI('/v1/historical/correlation', args.pair || 'BTCUSD_ETHUSD', args.window || '30d');
        } else if (name === 'fx_historical_price') {
          data = await callSignalAPI('/v1/historical/price', args.pair || 'BTCUSD', args.window || '30d');
        }
        result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch(e: any) {
        result = { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
      }
    }

    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
  } catch(e) {}
});

console.error('Vongstaad MCP FX Server ready');
console.error('Signal API:', SIGNAL_API);
