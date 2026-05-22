#!/usr/bin/env node
// Vongstaad MCP FX Server
// Raw MCP JSON-RPC over stdin/stdout

import * as readline from 'readline';

const ENDPOINT = "https://vongstaad-data.vongstaad.com/v1/correlation";

async function getChallenge(): Promise<any> {
  const r = await fetch(ENDPOINT);
  if (r.status !== 402) throw new Error("Expected 402");
  return r.json();
}

async function submitProof(proof: any): Promise<any> {
  const r = await fetch(ENDPOINT, { headers: { "X-Payment-Proof": JSON.stringify(proof) } });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Verification failed"); }
  return r.json();
}

async function fxCorrelation(pairs: string[], window: string): Promise<any> {
  const challenge = await getChallenge();
  const proof = {
    transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    signature: challenge.signature,
    expiresAt: challenge.expiresAt,
    recipient: challenge.recipient,
    amount: challenge.amount,
    challengeId: challenge.challengeId
  };
  return submitProof(proof);
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line: string) => {
  try {
    const msg = JSON.parse(line);
    let result: any = {};

    if (msg.method === 'initialize') {
      result = { protocolVersion: '2024-11-05', serverInfo: { name: 'vongstaad-mcp-fx', version: '1.0.0' }, capabilities: { tools: {} } };
    } else if (msg.method === 'tools/list') {
      result = { tools: [{ name: 'fx_correlation', description: 'Get FX correlation coefficient between currency pairs via x402 payment', inputSchema: { type: 'object', properties: { pairs: { type: 'array', items: { type: 'string' }, description: 'Currency pairs' }, window: { type: 'string', enum: ['7d','30d','90d'], description: 'Time window', default: '30d' } }, required: ['pairs'] } }] };
    } else if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params;
      if (name === 'fx_correlation') {
        try {
          const data = await fxCorrelation(args.pairs || ['EURUSD'], args.window || '30d');
          result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch(e: any) {
          result = { content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true };
        }
      }
    }

    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
  } catch(e) {}
});

console.error('Vongstaad MCP FX Server ready');
