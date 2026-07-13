/**
 * src/shim/server.ts — serves the governed telecom-support step handler as an OpenAI-compatible
 * `/chat/completions` endpoint (stream:false only — tau2 never streams the agent LLM). Run with
 * `tsx src/shim/server.ts` (see package.json's `shim` script). Listens on 127.0.0.1:8090 by default.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleChatCompletion } from './step-handler.js';
import { currentActivityLogFile } from './activity-log.js';
import type { ChatCompletionRequest } from './openai-types.js';

const HOST = process.env.LOOPRUN_SHIM_HOST ?? '127.0.0.1';
const PORT = Number(process.env.LOOPRUN_SHIM_PORT ?? 8090);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

const server = createServer((req, res) => {
  const url = req.url ?? '';
  if (req.method === 'GET' && (url === '/health' || url === '/')) {
    sendJson(res, 200, { ok: true, service: 'looprun-telecom-shim', activityLog: currentActivityLogFile() });
    return;
  }
  if (req.method === 'GET' && (url === '/v1/models' || url === '/models')) {
    sendJson(res, 200, { object: 'list', data: [{ id: 'looprun', object: 'model' }] });
    return;
  }
  if (req.method === 'POST' && (url === '/v1/chat/completions' || url === '/chat/completions')) {
    readBody(req)
      .then(async (raw) => {
        let parsed: ChatCompletionRequest;
        try {
          parsed = JSON.parse(raw) as ChatCompletionRequest;
        } catch {
          sendJson(res, 400, { error: { message: 'invalid JSON body' } });
          return;
        }
        try {
          const response = await handleChatCompletion(parsed);
          sendJson(res, 200, response);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[looprun-shim] step handler error:', e);
          sendJson(res, 500, { error: { message: String((e as Error)?.message ?? e) } });
        }
      })
      .catch((e) => sendJson(res, 500, { error: { message: String(e) } }));
    return;
  }
  sendJson(res, 404, { error: { message: `no route for ${req.method} ${url}` } });
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[looprun-shim] listening on http://${HOST}:${PORT}  (activity log: ${currentActivityLogFile()})`);
});
