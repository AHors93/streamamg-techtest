import path from 'path';
import express from 'express';
import { AssetStore } from './store/asset-store.js';
import { AuditStore } from './store/audit-store.js';
import { AssetService } from './services/asset-service.js';
import { AssetHandler } from './handlers/asset-handler.js';
import { createAssetRoutes } from './routes/asset-routes.js';
import { createSseRoutes } from './routes/sse-routes.js';
import { createDocsRoutes } from './routes/docs-routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { registerEventHandlers } from './events/event-handlers.js';

export function createApp() {
  const app = express();
  const store = new AssetStore();
  const auditStore = new AuditStore();
  const service = new AssetService(store);
  const handler = new AssetHandler(service, auditStore);

  registerEventHandlers(store, auditStore);

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/assets', createAssetRoutes(handler));
  app.use('/events', createSseRoutes());
  app.use('/docs', createDocsRoutes());
  app.use(errorHandler);

  return { app, store, auditStore };
}
