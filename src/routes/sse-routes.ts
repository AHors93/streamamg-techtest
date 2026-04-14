import { Router, type Response } from 'express';
import { assetEmitter, type AssetEvent } from '../events/asset-events.js';

export function createSseRoutes(): Router {
  const router = Router();
  const clients = new Set<Response>();

  function broadcast(event: AssetEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      client.write(data);
    }
  }

  const eventTypes = [
    'asset.created',
    'asset.updated',
    'asset.processing.complete',
    'asset.processing.failed',
    'asset.published',
    'asset.unpublished',
    'asset.deleted',
  ] as const;

  for (const type of eventTypes) {
    assetEmitter.on(type, broadcast);
  }

  router.get('/', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write('\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
  });

  return router;
}
