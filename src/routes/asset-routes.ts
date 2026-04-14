import { Router } from 'express';
import type { AssetHandler } from '../handlers/asset-handler.js';

export function createAssetRoutes(handler: AssetHandler): Router {
  const router = Router();

  router.post('/', handler.create);
  router.get('/', handler.list);
  router.get('/:id', handler.getById);
  router.patch('/:id', handler.update);
  router.delete('/:id', handler.delete);
  router.post('/:id/process', handler.process);
  router.get('/:id/history', handler.history);

  return router;
}
