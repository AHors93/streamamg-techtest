import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { createApp } from '../src/app.js';
import type { Express } from 'express';

describe('SSE /events', () => {
  let app: Express;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    const result = createApp();
    app = result.app;
    server = app.listen(0);
    const address = server.address();
    port = typeof address === 'object' && address ? address.port : 0;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('establishes SSE connection with correct headers', async () => {
    const response = await new Promise<http.IncomingMessage>((resolve) => {
      http.get(`http://localhost:${port}/events`, (res) => {
        resolve(res);
        res.destroy();
      });
    });

    expect(response.headers['content-type']).toBe('text/event-stream');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('receives event when asset is created', async () => {
    const eventData = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);

      http.get(`http://localhost:${port}/events`, (res) => {
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const match = buffer.match(/data: (.+)\n/);
          if (match) {
            clearTimeout(timeout);
            res.destroy();
            resolve(match[1]);
          }
        });
      });

      setTimeout(() => {
        const postData = JSON.stringify({ title: 'SSE Test', contentType: 'video' });
        const req = http.request(
          { hostname: 'localhost', port, path: '/assets', method: 'POST', headers: { 'Content-Type': 'application/json' } },
          () => {},
        );
        req.write(postData);
        req.end();
      }, 100);
    });

    const parsed = JSON.parse(eventData);
    expect(parsed.type).toBe('asset.created');
    expect(parsed.data.title).toBe('SSE Test');
  });
});
