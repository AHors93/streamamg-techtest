import type { Response, NextFunction } from 'express';
import type { Request } from 'express-serve-static-core';
import { CreateAssetSchema, UpdateAssetSchema, AssetFilterSchema } from '../types/asset.js';
import type { AssetService } from '../services/asset-service.js';
import type { AuditStore } from '../store/audit-store.js';

type IdParams = { id: string };

export class AssetHandler {
  constructor(private service: AssetService, private auditStore: AuditStore) {}

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const input = CreateAssetSchema.parse(req.body);
      const asset = this.service.createAsset(input);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  };

  getById = (req: Request<IdParams>, res: Response, next: NextFunction): void => {
    try {
      const asset = this.service.getAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (err) {
      next(err);
    }
  };

  list = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const filter = AssetFilterSchema.parse(req.query);
      const assets = this.service.listAssets(filter);
      res.json(assets);
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request<IdParams>, res: Response, next: NextFunction): void => {
    try {
      const input = UpdateAssetSchema.parse(req.body);
      const asset = this.service.updateAsset(req.params.id, input);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (err) {
      next(err);
    }
  };

  delete = (req: Request<IdParams>, res: Response, next: NextFunction): void => {
    try {
      const deleted = this.service.deleteAsset(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  process = (req: Request<IdParams>, res: Response, next: NextFunction): void => {
    try {
      const fail = req.query.fail === 'true';
      const asset = this.service.processAsset(req.params.id, fail);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (err) {
      next(err);
    }
  };

  history = (req: Request<IdParams>, res: Response, next: NextFunction): void => {
    try {
      const asset = this.service.getAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      const entries = this.auditStore.getByAssetId(req.params.id);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  };
}
